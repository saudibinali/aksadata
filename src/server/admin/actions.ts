"use server";

import { revalidatePath } from "next/cache";
import { UserStatus } from "@/generated/prisma/client";
import { getRequestContext, writeAudit } from "@/server/audit/log";
import { PERMISSION_KEYS, type PermissionKey } from "@/server/auth/permissions";
import { getCurrentUser, hasPermission, type CurrentUser } from "@/server/auth/session";
import {
  SETTING_KEYS,
  type FeatureKey,
  type SettingGroup,
  type SettingKey,
  featureRegistry,
  settingsRegistry,
} from "@/server/config/registry";
import { parseSettingInput } from "@/server/config/parse-setting";
import { getSetting, settingValueType } from "@/server/config/settings";
import { getDb } from "@/server/db";
import { stop } from "@/server/http/feedback";
import { detectImageMime, extensionForMime, saveMediaObject } from "@/server/media/storage";
import { uniqueFailure } from "@/server/auth/service";
import { validateUsername } from "@/server/users/rules";
import { MediaPurpose, MediaStatus, ReservedNameCategory, ContentStatus } from "@/generated/prisma/client";

async function actor(permission: PermissionKey): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, permission)) {
    return stop("/login", { error: user ? "forbidden" : "unauthenticated" });
  }
  return user;
}

function isSuperAdmin(user: { roles: string[] }) {
  return user.roles.includes("SUPER_ADMIN");
}

async function targetIsSuperAdmin(userId: string) {
  const count = await getDb().userRole.count({
    where: { userId, role: { key: "SUPER_ADMIN" } },
  });
  return count > 0;
}

async function activeSuperAdminCount(excludeUserId?: string) {
  return getDb().user.count({
    where: {
      status: UserStatus.ACTIVE,
      id: excludeUserId ? { not: excludeUserId } : undefined,
      roles: { some: { role: { key: "SUPER_ADMIN" } } },
    },
  });
}

export async function updateUserStatusAction(formData: FormData) {
  const user = await actor("users.update");
  const userId = String(formData.get("userId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!Object.values(UserStatus).includes(status as UserStatus)) {
    return stop(`/admin/users/${userId}`, { error: "validation" });
  }
  const nextStatus = status as UserStatus;

  if (user.id === userId) {
    return stop(`/admin/users/${userId}`, { error: "cannot_change_own_status" });
  }

  const target = await getDb().user.findUnique({ where: { id: userId } });
  if (!target) return stop("/admin/users", { error: "not_found" });

  if ((await targetIsSuperAdmin(userId)) && !isSuperAdmin(user)) {
    return stop(`/admin/users/${userId}`, { error: "cannot_edit_super_admin" });
  }

  if (nextStatus !== UserStatus.ACTIVE && (await targetIsSuperAdmin(userId))) {
    const remaining = await activeSuperAdminCount(userId);
    if (remaining < 1) {
      return stop(`/admin/users/${userId}`, { error: "last_super_admin" });
    }
  }

  await getDb().user.update({ where: { id: userId }, data: { status: nextStatus } });
  await writeAudit({
    actorId: user.id,
    actorUsername: user.username,
    action: "user.status",
    entityType: "User",
    entityId: userId,
    previousValue: { status: target.status },
    newValue: { status: nextStatus },
    context: await getRequestContext(),
  });
  await refresh(`/admin/users/${userId}`);
  return stop(`/admin/users/${userId}`, { notice: "saved" });
}

export async function updateUsernameAction(formData: FormData) {
  const user = await actor("users.update");
  const userId = String(formData.get("userId") ?? "");
  const username = String(formData.get("username") ?? "").trim().toLowerCase();

  const target = await getDb().user.findUnique({ where: { id: userId } });
  if (!target) return stop("/admin/users", { error: "not_found" });
  if ((await targetIsSuperAdmin(userId)) && !isSuperAdmin(user)) {
    return stop(`/admin/users/${userId}`, { error: "cannot_edit_super_admin" });
  }

  const [minLength, maxLength, pattern, reserved] = await Promise.all([
    getSetting("username.minLength"),
    getSetting("username.maxLength"),
    getSetting("username.pattern"),
    getDb().reservedUsername.findUnique({ where: { value: username } }),
  ]);
  const issue = validateUsername(username, { minLength, maxLength, pattern }, Boolean(reserved));
  if (issue) return stop(`/admin/users/${userId}`, { error: issue });

  try {
    await getDb().user.update({ where: { id: userId }, data: { username } });
  } catch (error) {
    const failure = uniqueFailure(error);
    return stop(`/admin/users/${userId}`, { error: failure.error });
  }

  await writeAudit({
    actorId: user.id,
    actorUsername: user.username,
    action: "user.username",
    entityType: "User",
    entityId: userId,
    previousValue: { username: target.username },
    newValue: { username },
    context: await getRequestContext(),
  });
  await refresh(`/admin/users/${userId}`);
  return stop(`/admin/users/${userId}`, { notice: "saved" });
}

export async function updateUserRolesAction(formData: FormData) {
  const user = await actor("users.roles");
  const userId = String(formData.get("userId") ?? "");
  const roleIds = formData.getAll("roleId").map(String);

  const target = await getDb().user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });
  if (!target) return stop("/admin/users", { error: "not_found" });

  const hadSuper = target.roles.some((item) => item.role.key === "SUPER_ADMIN");
  if (hadSuper && !isSuperAdmin(user)) {
    return stop(`/admin/users/${userId}`, { error: "cannot_edit_super_admin" });
  }

  const roles = await getDb().role.findMany({ where: { id: { in: roleIds } } });
  if (roles.length !== roleIds.length) {
    return stop(`/admin/users/${userId}`, { error: "validation" });
  }

  const keepsSuper = roles.some((role) => role.key === "SUPER_ADMIN");
  if (hadSuper && !keepsSuper) {
    if (user.id === userId || (await activeSuperAdminCount(userId)) < 1) {
      return stop(`/admin/users/${userId}`, { error: "last_super_admin" });
    }
  }
  if (!hadSuper && keepsSuper && !isSuperAdmin(user)) {
    return stop(`/admin/users/${userId}`, { error: "cannot_edit_super_admin" });
  }

  const previous = target.roles.map((item) => item.role.key).sort();
  await getDb().$transaction([
    getDb().userRole.deleteMany({ where: { userId } }),
    getDb().userRole.createMany({
      data: roleIds.map((roleId) => ({ userId, roleId })),
    }),
  ]);

  await writeAudit({
    actorId: user.id,
    actorUsername: user.username,
    action: "user.roles",
    entityType: "User",
    entityId: userId,
    previousValue: { roles: previous },
    newValue: { roles: roles.map((role) => role.key).sort() },
    context: await getRequestContext(),
  });
  await refresh(`/admin/users/${userId}`);
  return stop(`/admin/users/${userId}`, { notice: "saved" });
}

export async function saveRolePermissionsAction(formData: FormData) {
  const user = await actor("roles.manage");
  const roleId = String(formData.get("roleId") ?? "");
  const role = await getDb().role.findUnique({ where: { id: roleId } });
  if (!role) return stop("/admin/roles", { error: "not_found" });
  if (role.key === "SUPER_ADMIN") {
    return stop("/admin/roles", { error: "system_role" });
  }

  const keys = formData
    .getAll("permission")
    .map(String)
    .filter((key): key is PermissionKey => PERMISSION_KEYS.includes(key as PermissionKey));
  const permissions = await getDb().permission.findMany({ where: { key: { in: keys } } });
  const previous = await getDb().rolePermission.findMany({
    where: { roleId },
    include: { permission: true },
  });

  await getDb().$transaction([
    getDb().rolePermission.deleteMany({ where: { roleId } }),
    getDb().rolePermission.createMany({
      data: permissions.map((permission) => ({ roleId, permissionId: permission.id })),
    }),
  ]);

  await writeAudit({
    actorId: user.id,
    actorUsername: user.username,
    action: "role.permissions",
    entityType: "Role",
    entityId: roleId,
    previousValue: { permissions: previous.map((item) => item.permission.key).sort() },
    newValue: { permissions: permissions.map((item) => item.key).sort() },
    context: await getRequestContext(),
  });
  await refresh("/admin/roles");
  return stop("/admin/roles", { notice: "saved" });
}

export async function createRoleAction(formData: FormData) {
  const user = await actor("roles.manage");
  const key = String(formData.get("key") ?? "")
    .trim()
    .toUpperCase()
    .replaceAll("-", "_");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!/^[A-Z][A-Z0-9_]{1,40}$/.test(key) || name.length < 2 || name.length > 80) {
    return stop("/admin/roles", { error: "invalid_role_key" });
  }

  try {
    const role = await getDb().role.create({
      data: {
        key,
        name,
        description: description || null,
        system: false,
      },
    });
    await writeAudit({
      actorId: user.id,
      actorUsername: user.username,
      action: "role.create",
      entityType: "Role",
      entityId: role.id,
      newValue: { key, name },
      context: await getRequestContext(),
    });
  } catch (error) {
    const failure = uniqueFailure(error);
    return stop("/admin/roles", {
      error: failure.error === "validation" ? "role_exists" : failure.error,
    });
  }

  await refresh("/admin/roles");
  return stop("/admin/roles", { notice: "created" });
}

export async function saveSettingsAction(formData: FormData) {
  const user = await actor("settings.update");
  const group = String(formData.get("group") ?? "") as SettingGroup;
  const keys = SETTING_KEYS.filter(
    (key) => settingsRegistry[key].group === group && settingsRegistry[key].editor !== "hidden",
  );
  if (keys.length === 0) return stop("/admin/settings", { error: "validation" });

  const updates: { key: SettingKey; value: Extract<ReturnType<typeof parseSettingInput>, { ok: true }> }[] =
    [];
  for (const key of keys) {
    const parsed = parseSettingInput(key, String(formData.get(key) ?? ""));
    if (!parsed.ok) return stop("/admin/settings", { error: "invalid_setting" });
    updates.push({ key, value: parsed });
  }

  if (group === "username") {
    const min = updates.find((item) => item.key === "username.minLength")?.value.value;
    const max = updates.find((item) => item.key === "username.maxLength")?.value.value;
    if (typeof min === "number" && typeof max === "number" && min > max) {
      return stop("/admin/settings", { error: "invalid_setting" });
    }
  }

  const context = await getRequestContext();
  for (const update of updates) {
    const previous = await getSetting(update.key);
    if (JSON.stringify(previous) === JSON.stringify(update.value.value)) continue;
    await getDb().setting.upsert({
      where: { key: update.key },
      create: {
        key: update.key,
        value: update.value.value,
        valueType: settingValueType(update.key),
        group,
        isPublic: settingsRegistry[update.key].isPublic,
        updatedById: user.id,
      },
      update: {
        value: update.value.value,
        valueType: settingValueType(update.key),
        updatedById: user.id,
      },
    });
    await writeAudit({
      actorId: user.id,
      actorUsername: user.username,
      action: "setting.update",
      entityType: "Setting",
      entityId: update.key,
      previousValue: { value: previous },
      newValue: { value: update.value.value },
      context,
    });
  }

  await refresh("/admin/settings");
  return stop("/admin/settings", { notice: "saved" });
}

export async function toggleFeatureAction(formData: FormData) {
  const user = await actor("features.update");
  const key = String(formData.get("key") ?? "") as FeatureKey;
  const definition = featureRegistry[key];
  if (!definition) return stop("/admin/features", { error: "validation" });
  if (!definition.implemented) {
    return stop("/admin/features", { error: "feature_not_implemented" });
  }
  const enabled = String(formData.get("enabled") ?? "") === "true";
  if (definition.locked && !enabled) {
    return stop("/admin/features", { error: "feature_locked" });
  }

  const previous = await getDb().featureFlag.findUnique({ where: { key } });
  await getDb().featureFlag.upsert({
    where: { key },
    create: { key, enabled, updatedById: user.id },
    update: { enabled, updatedById: user.id },
  });
  await writeAudit({
    actorId: user.id,
    actorUsername: user.username,
    action: "feature.update",
    entityType: "FeatureFlag",
    entityId: key,
    previousValue: { enabled: previous?.enabled ?? definition.defaultEnabled },
    newValue: { enabled },
    context: await getRequestContext(),
  });
  await refresh("/admin/features");
  return stop("/admin/features", { notice: "saved" });
}

export async function addReservedUsernameAction(formData: FormData) {
  const user = await actor("usernames.manage");
  const value = String(formData.get("value") ?? "")
    .trim()
    .toLowerCase();
  const category = String(formData.get("category") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!Object.values(ReservedNameCategory).includes(category as ReservedNameCategory)) {
    return stop("/admin/usernames", { error: "validation" });
  }
  const [minLength, maxLength, pattern] = await Promise.all([
    getSetting("username.minLength"),
    getSetting("username.maxLength"),
    getSetting("username.pattern"),
  ]);
  const issue = validateUsername(value, { minLength, maxLength, pattern }, false);
  if (issue) return stop("/admin/usernames", { error: "invalid_username" });

  try {
    const row = await getDb().reservedUsername.create({
      data: {
        value,
        category: category as ReservedNameCategory,
        reason: reason || null,
        createdById: user.id,
      },
    });
    await writeAudit({
      actorId: user.id,
      actorUsername: user.username,
      action: "username.reserve",
      entityType: "ReservedUsername",
      entityId: row.id,
      newValue: { value, category },
      context: await getRequestContext(),
    });
  } catch (error) {
    const failure = uniqueFailure(error);
    return stop("/admin/usernames", {
      error: failure.error === "username_taken" ? "reserved_username" : failure.error,
    });
  }

  await refresh("/admin/usernames");
  return stop("/admin/usernames", { notice: "created" });
}

export async function removeReservedUsernameAction(formData: FormData) {
  const user = await actor("usernames.manage");
  const id = String(formData.get("id") ?? "");
  const row = await getDb().reservedUsername.findUnique({ where: { id } });
  if (!row) return stop("/admin/usernames", { error: "not_found" });

  await getDb().reservedUsername.delete({ where: { id } });
  await writeAudit({
    actorId: user.id,
    actorUsername: user.username,
    action: "username.unreserve",
    entityType: "ReservedUsername",
    entityId: id,
    previousValue: { value: row.value, category: row.category },
    context: await getRequestContext(),
  });
  await refresh("/admin/usernames");
  return stop("/admin/usernames", { notice: "removed" });
}

export async function updateContentStatusAction(formData: FormData) {
  const user = await actor("content.moderate");
  const postId = String(formData.get("postId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!Object.values(ContentStatus).includes(status as ContentStatus)) {
    return stop("/admin/content", { error: "validation" });
  }
  const post = await getDb().post.findUnique({ where: { id: postId } });
  if (!post) return stop("/admin/content", { error: "not_found" });

  const nextStatus = status as ContentStatus;
  await getDb().post.update({ where: { id: postId }, data: { status: nextStatus } });
  await writeAudit({
    actorId: user.id,
    actorUsername: user.username,
    action: "content.status",
    entityType: "Post",
    entityId: postId,
    previousValue: { status: post.status },
    newValue: { status: nextStatus },
    context: await getRequestContext(),
  });
  await refresh("/admin/content");
  return stop("/admin/content", { notice: "saved" });
}

export async function uploadSiteMediaAction(formData: FormData) {
  const user = await actor("settings.update");
  const purposeName = String(formData.get("purpose") ?? "");
  const purpose =
    purposeName === "SITE_FAVICON" ? MediaPurpose.SITE_FAVICON : MediaPurpose.SITE_LOGO;
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return stop("/admin/media", { error: "upload_empty" });
  }

  const maxBytes = await getSetting("media.maxUploadBytes");
  if (file.size > maxBytes) return stop("/admin/media", { error: "upload_size" });

  const bytes = Buffer.from(await file.arrayBuffer());
  const detected = detectImageMime(bytes);
  const allowed = await getSetting("media.allowedMimeTypes");
  const faviconExtra = ["image/x-icon", "image/vnd.microsoft.icon"];
  const permitList =
    purpose === MediaPurpose.SITE_FAVICON ? [...allowed, ...faviconExtra] : [...allowed];
  if (!detected || !permitList.includes(detected)) {
    return stop("/admin/media", { error: "upload_type" });
  }

  const extension = extensionForMime(detected);
  if (!extension) return stop("/admin/media", { error: "upload_type" });

  const storageKey = await saveMediaObject(bytes, extension);
  const settingKey: SettingKey =
    purpose === MediaPurpose.SITE_FAVICON ? "site.faviconMediaId" : "site.logoMediaId";
  const previous = await getSetting(settingKey);

  const asset = await getDb().mediaAsset.create({
    data: {
      ownerId: user.id,
      storageKey,
      originalName: file.name.slice(0, 180),
      mimeType: detected,
      sizeBytes: bytes.length,
      purpose,
      status: MediaStatus.APPROVED,
    },
  });

  await getDb().setting.upsert({
    where: { key: settingKey },
    create: {
      key: settingKey,
      value: asset.id,
      valueType: settingValueType(settingKey),
      group: "site",
      isPublic: true,
      updatedById: user.id,
    },
    update: { value: asset.id, updatedById: user.id },
  });

  await writeAudit({
    actorId: user.id,
    actorUsername: user.username,
    action: "media.site_upload",
    entityType: "MediaAsset",
    entityId: asset.id,
    previousValue: { setting: settingKey, mediaId: previous },
    newValue: { setting: settingKey, mediaId: asset.id, mimeType: detected, sizeBytes: bytes.length },
    context: await getRequestContext(),
  });
  await refresh("/admin/media");
  return stop("/admin/media", { notice: "uploaded" });
}

async function refresh(pathname: string) {
  revalidatePath(`/ar${pathname}`);
  revalidatePath(`/en${pathname}`);
}
