import "server-only";
import { headers } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/server/db";

export type RequestContext = {
  ipAddress: string | null;
  userAgent: string | null;
  path: string | null;
};

export async function getRequestContext(): Promise<RequestContext> {
  const headerStore = await headers();
  const trustProxy = process.env.TRUST_PROXY === "true";
  const forwarded = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = headerStore.get("user-agent");
  const host = headerStore.get("host");
  const referer = headerStore.get("referer");
  let path: string | null = null;

  if (referer && host) {
    try {
      const url = new URL(referer);
      if (url.host === host) path = url.pathname;
    } catch {
      path = null;
    }
  }

  return {
    ipAddress: trustProxy ? forwarded : null,
    userAgent: userAgent ? userAgent.slice(0, 300) : null,
    path,
  };
}

type AuditInput = {
  actorId?: string | null;
  actorUsername?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  previousValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  context?: RequestContext;
};

export async function writeAudit(entry: AuditInput) {
  const context = entry.context;
  await getDb().auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      actorUsername: entry.actorUsername ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      previousValue: entry.previousValue,
      newValue: entry.newValue,
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
      metadata: context?.path ? { path: context.path } : undefined,
    },
  });
}
