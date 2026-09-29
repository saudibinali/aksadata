import { z } from "zod";
import {
  type SettingKey,
  type SocialLink,
  settingsRegistry,
} from "@/server/config/registry";

export type SettingValue<K extends SettingKey> = (typeof settingsRegistry)[K]["defaultValue"];

export type StoredSettingValue = string | number | string[] | SocialLink[];

function invalid() {
  return { ok: false as const };
}

export function parseSettingInput(
  key: SettingKey,
  raw: string,
): { ok: true; value: StoredSettingValue } | { ok: false } {
  const definition = settingsRegistry[key];

  if (definition.type === "string") {
    const value = raw.trim();
    if (value.length > definition.maxLength) return invalid();
    if (key === "site.contact.email" && value !== "" && !z.email().safeParse(value).success) {
      return invalid();
    }
    if (key === "site.contact.phone" && !/^[0-9+\-()\s]*$/.test(value)) return invalid();
    if (key === "username.pattern") {
      if (!value.startsWith("^") || !value.endsWith("$")) return invalid();
      try {
        const expression = new RegExp(value);
        expression.test("aksa");
      } catch {
        return invalid();
      }
    }
    return { ok: true, value };
  }

  if (definition.type === "number") {
    if (!/^-?\d+$/.test(raw.trim())) return invalid();
    const value = Number(raw.trim());
    if (!Number.isSafeInteger(value) || value < definition.min || value > definition.max) {
      return invalid();
    }
    return { ok: true, value };
  }

  if (definition.type === "stringArray") {
    const value = raw
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    if (value.length === 0 || value.length > 12) return invalid();
    if (!value.every((item) => /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(item))) return invalid();
    return { ok: true, value };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return invalid();
  }
  if (!Array.isArray(parsed) || parsed.length > 12) return invalid();

  const linkSchema = z.object({
    platform: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_-]{2,32}$/),
    url: z.url().refine((url) => url.startsWith("https://") && url.length <= 300),
  });

  const links: SocialLink[] = [];
  for (const item of parsed) {
    const result = linkSchema.safeParse(item);
    if (!result.success) return invalid();
    links.push(result.data);
  }
  return { ok: true, value: links };
}

export function coerceStoredSetting<K extends SettingKey>(
  key: K,
  stored: unknown,
): SettingValue<K> {
  const definition = settingsRegistry[key];
  const fallback = definition.defaultValue as SettingValue<K>;

  if (definition.type === "string") {
    return (typeof stored === "string" ? stored : fallback) as SettingValue<K>;
  }
  if (definition.type === "number") {
    return (typeof stored === "number" && Number.isFinite(stored) ? stored : fallback) as SettingValue<K>;
  }
  if (definition.type === "stringArray") {
    return (
      Array.isArray(stored) && stored.every((item) => typeof item === "string") ? stored : fallback
    ) as SettingValue<K>;
  }
  if (!Array.isArray(stored)) return fallback;
  const links = stored.filter(
    (item): item is SocialLink =>
      typeof item === "object" &&
      item !== null &&
      "platform" in item &&
      "url" in item &&
      typeof item.platform === "string" &&
      typeof item.url === "string",
  );
  return links as SettingValue<K>;
}
