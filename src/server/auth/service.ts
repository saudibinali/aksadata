import "server-only";
import { UserStatus } from "@/generated/prisma/client";
import { writeAudit, type RequestContext } from "@/server/audit/log";
import { dummyPasswordHash, hashPassword, verifyPassword } from "@/server/auth/password";
import { createSession } from "@/server/auth/session";
import { isFeatureEnabled, getSetting } from "@/server/config/settings";
import { getDb } from "@/server/db";
import { fail, type ActionFailure, type ActionSuccess } from "@/server/http/feedback";
import { rateLimit } from "@/server/rate-limit/limiter";
import { validatePassword, validateUsername } from "@/server/users/rules";
import { z } from "zod";

const credentials = z.object({
  identifier: z.string().trim().min(1).max(320),
  password: z.string().min(1).max(200),
});

async function loginLimits() {
  const [maxAttempts, windowMinutes] = await Promise.all([
    getSetting("security.loginMaxAttempts"),
    getSetting("security.loginWindowMinutes"),
  ]);
  return { maxAttempts, windowMs: windowMinutes * 60 * 1000 };
}

function limited(identifier: string, ip: string | null, maxAttempts: number, windowMs: number) {
  const byIdentifier = rateLimit(`login:id:${identifier}`, maxAttempts, windowMs);
  const byIp = ip ? rateLimit(`login:ip:${ip}`, maxAttempts, windowMs) : { ok: true, retryAfterMs: 0 };
  return !byIdentifier.ok || !byIp.ok;
}

export async function loginWithPassword(
  input: { identifier: string; password: string },
  context: RequestContext,
): Promise<ActionSuccess | ActionFailure> {
  const parsed = credentials.safeParse(input);
  if (!parsed.success) return fail("validation");

  if (!(await isFeatureEnabled("credentialsLogin"))) return fail("login_disabled");

  const identifier = parsed.data.identifier.toLowerCase();
  const limits = await loginLimits();
  if (limited(identifier, context.ipAddress, limits.maxAttempts, limits.windowMs)) {
    return fail("rate_limited");
  }

  const user = identifier.includes("@")
    ? await getDb().user.findUnique({
        where: { email: identifier },
        include: { accounts: true },
      })
    : await getDb().user.findUnique({
        where: { username: identifier },
        include: { accounts: true },
      });

  const account = user?.accounts.find((item) => item.provider === "credentials");
  const passwordHash = account?.passwordHash ?? (await dummyPasswordHash());
  const matches = await verifyPassword(parsed.data.password, passwordHash);

  if (!user || !account?.passwordHash || !matches) {
    await writeAudit({
      action: "auth.login.failure",
      entityType: "User",
      entityId: user?.id,
      newValue: { identifier },
      context,
    });
    return fail("invalid_credentials");
  }

  if (user.status === UserStatus.SUSPENDED) return fail("account_suspended");
  if (user.status === UserStatus.DISABLED) return fail("account_disabled");

  await createSession(user.id, context);
  await writeAudit({
    actorId: user.id,
    actorUsername: user.username,
    action: "auth.login.success",
    entityType: "User",
    entityId: user.id,
    context,
  });
  return { ok: true };
}

const registration = z.object({
  username: z.string().trim().min(1).max(64),
  email: z.email().max(320),
  password: z.string().min(1).max(200),
  confirm: z.string().min(1).max(200),
});

export async function registerWithPassword(
  input: { username: string; email: string; password: string; confirm: string },
  context: RequestContext,
): Promise<ActionSuccess | ActionFailure> {
  if (!(await isFeatureEnabled("registration"))) return fail("registration_closed");

  const limits = await loginLimits();
  if (limited(input.email.toLowerCase(), context.ipAddress, limits.maxAttempts, limits.windowMs)) {
    return fail("rate_limited");
  }

  const parsed = registration.safeParse({
    ...input,
    email: input.email.trim().toLowerCase(),
  });
  if (!parsed.success) return fail("validation");
  if (parsed.data.password !== parsed.data.confirm) return fail("password_mismatch");

  const username = parsed.data.username.toLowerCase();
  const [minLength, maxLength, pattern, passwordMin, reserved] = await Promise.all([
    getSetting("username.minLength"),
    getSetting("username.maxLength"),
    getSetting("username.pattern"),
    getSetting("security.passwordMinLength"),
    getDb().reservedUsername.findUnique({ where: { value: username } }),
  ]);

  const usernameIssue = validateUsername(
    username,
    { minLength, maxLength, pattern },
    Boolean(reserved),
  );
  if (usernameIssue) return fail(usernameIssue);

  const passwordIssue = validatePassword(parsed.data.password, passwordMin);
  if (passwordIssue) return fail(passwordIssue);

  try {
    const passwordHash = await hashPassword(parsed.data.password);
    const user = await getDb().user.create({
      data: {
        username,
        email: parsed.data.email,
        locale: "ar",
        accounts: {
          create: {
            provider: "credentials",
            providerAccountId: parsed.data.email,
            passwordHash,
          },
        },
      },
    });

    await createSession(user.id, context);
    await writeAudit({
      actorId: user.id,
      actorUsername: user.username,
      action: "auth.register",
      entityType: "User",
      entityId: user.id,
      newValue: { username: user.username, email: user.email },
      context,
    });
    return { ok: true };
  } catch (error) {
    return uniqueFailure(error);
  }
}

export function uniqueFailure(error: unknown): ActionFailure {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002" &&
    "meta" in error
  ) {
    const target = JSON.stringify((error as { meta?: unknown }).meta ?? "");
    if (target.includes("username")) return fail("username_taken");
    if (target.includes("email")) return fail("email_taken");
  }
  return fail("validation");
}
