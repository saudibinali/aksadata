import { headers } from "next/headers";
import { defaultLocale, isLocale, type AppLocale } from "@/i18n/locales";

export async function localeFromRequest(formData?: FormData): Promise<AppLocale> {
  const submitted = formData?.get("locale");
  if (typeof submitted === "string" && isLocale(submitted)) return submitted;

  const headerStore = await headers();
  const headerLocale = headerStore.get("x-next-intl-locale");
  if (headerLocale && isLocale(headerLocale)) return headerLocale;

  const referer = headerStore.get("referer");
  if (referer) {
    try {
      const segment = new URL(referer).pathname.split("/").filter(Boolean)[0];
      if (segment && isLocale(segment)) return segment;
    } catch {
      return defaultLocale;
    }
  }

  return defaultLocale;
}
