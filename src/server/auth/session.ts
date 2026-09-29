import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { UserStatus } from "@/generated/prisma/client";
import {
  SESSION_COOKIE,
  createSessionToken,
  hashSessionToken,
} from "@/server/auth/crypto";
import type { PermissionKey } from "@/server/auth/permissions";
import { getSetting } from "@/server/config/settings";
import { getDb } from "@/server/db";
import type { RequestContext } from "@/server/audit/log";

export type CurrentUser = {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  status: UserStatus;
  locale: string;
  roles: string[];
  permissions: Set<PermissionKey>;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await getDb().session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: {
      user: {
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: { include: { permission: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;
  if (session.user.status !== UserStatus.ACTIVE) return null;

  const roles = session.user.roles.map((item) => item.role.key);
  const permissions = new Set<PermissionKey>();
  for (const assignment of session.user.roles) {
    for (const grant of assignment.role.permissions) {
      permissions.add(grant.permission.key as PermissionKey);
    }
  }

  return {
    id: session.user.id,
    username: session.user.username,
    email: session.user.email,
    displayName: session.user.displayName,
    status: session.user.status,
    locale: session.user.locale,
    roles,
    permissions,
  };
});

export async function createSession(userId: string, context: RequestContext) {
  const token = createSessionToken();
  const days = await getSetting("security.sessionDays");
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await getDb().session.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    },
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function revokeCurrentSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await getDb().session.updateMany({
      where: { tokenHash: hashSessionToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  jar.delete(SESSION_COOKIE);
}

export function hasPermission(user: CurrentUser, permission: PermissionKey) {
  return user.permissions.has(permission);
}
