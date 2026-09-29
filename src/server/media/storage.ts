import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/x-icon": ".ico",
  "image/vnd.microsoft.icon": ".ico",
};

export function mediaRoot() {
  const configured = process.env.MEDIA_ROOT || path.join(process.cwd(), "var", "media");
  return path.resolve(/*turbopackIgnore: true*/ configured);
}

export function detectImageMime(bytes: Buffer) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  if (bytes.length >= 4 && bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && bytes[3] === 0x00) {
    return "image/x-icon";
  }
  return null;
}

export function extensionForMime(mime: string) {
  return EXTENSION_BY_MIME[mime] ?? null;
}

export async function saveMediaObject(bytes: Buffer, extension: string) {
  const key = `${randomUUID()}${extension}`;
  const root = mediaRoot();
  const full = path.resolve(root, key);
  if (path.relative(root, full).startsWith("..")) {
    throw new Error("Refusing to write outside media root");
  }
  await mkdir(/*turbopackIgnore: true*/ root, { recursive: true });
  await writeFile(/*turbopackIgnore: true*/ full, bytes);
  return key;
}

export async function readMediaObject(storageKey: string) {
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp|ico)$/i.test(storageKey)) {
    throw new Error("Invalid storage key");
  }
  const root = mediaRoot();
  const full = path.resolve(root, storageKey);
  if (path.relative(root, full).startsWith("..")) {
    throw new Error("Invalid storage key");
  }
  return readFile(/*turbopackIgnore: true*/ full);
}
