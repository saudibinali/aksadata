import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import * as rootParams from "next/root-params";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

export default getRequestConfig(async ({ locale }) => {
  let resolved = locale;
  if (!resolved) {
    const paramValue = await rootParams.locale();
    if (hasLocale(routing.locales, paramValue)) {
      resolved = paramValue;
    } else {
      notFound();
    }
  }

  return {
    locale: resolved,
    messages: (await import(`../../messages/${resolved}.json`)).default,
  };
});
