import { createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE = "aksa_session";

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function bcryptCost() {
  const parsed = Number(process.env.BCRYPT_COST ?? 12);
  if (!Number.isInteger(parsed)) return 12;
  return Math.min(14, Math.max(10, parsed));
}
