import { compare, hash } from "bcryptjs";
import { bcryptCost } from "@/server/auth/crypto";

export async function hashPassword(password: string) {
  return hash(password, bcryptCost());
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

let dummyHash: string | null = null;

export async function dummyPasswordHash() {
  if (!dummyHash) {
    dummyHash = await hash("not-a-real-password", bcryptCost());
  }
  return dummyHash;
}
