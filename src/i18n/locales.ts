export const locales = ["ar", "en"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "ar";

export function isLocale(value: string): value is AppLocale {
  return locales.some((locale) => locale === value);
}

export function direction(locale: string) {
  return locale === "ar" ? "rtl" : "ltr";
}
