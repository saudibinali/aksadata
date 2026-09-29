"use server";

import { redirect } from "next/navigation";
import { localeFromRequest } from "@/server/http/locale";
import { getRequestContext, writeAudit } from "@/server/audit/log";
import { loginWithPassword, registerWithPassword } from "@/server/auth/service";
import { getCurrentUser, revokeCurrentSession } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { stop } from "@/server/http/feedback";

export async function loginAction(formData: FormData) {
  const result = await loginWithPassword(
    {
      identifier: String(formData.get("identifier") ?? ""),
      password: String(formData.get("password") ?? ""),
    },
    await getRequestContext(),
  );

  if (!result.ok) {
    return stop("/login", { error: result.error }, formData);
  }

  const identifier = String(formData.get("identifier") ?? "").trim().toLowerCase();
  const accountUser = identifier.includes("@")
    ? await getDb().user.findUnique({
        where: { email: identifier },
        include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
      })
    : await getDb().user.findUnique({
        where: { username: identifier },
        include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
      });
  const canAdmin = accountUser?.roles.some((assignment) =>
    assignment.role.permissions.some((grant) => grant.permission.key === "admin.access"),
  );
  const locale = await localeFromRequest(formData);
  redirect(canAdmin ? `/${locale}/admin` : `/${locale}/account`);
}

export async function registerAction(formData: FormData) {
  const result = await registerWithPassword(
    {
      username: String(formData.get("username") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      confirm: String(formData.get("confirm") ?? ""),
    },
    await getRequestContext(),
  );

  if (!result.ok) {
    return stop("/register", { error: result.error }, formData);
  }

  const locale = await localeFromRequest(formData);
  redirect(`/${locale}/account`);
}

export async function logoutAction() {
  const user = await getCurrentUser();
  const context = await getRequestContext();
  if (user) {
    await writeAudit({
      actorId: user.id,
      actorUsername: user.username,
      action: "auth.logout",
      entityType: "User",
      entityId: user.id,
      context,
    });
  }
  await revokeCurrentSession();
  const locale = await localeFromRequest();
  redirect(`/${locale}`);
}
