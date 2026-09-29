"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("language");

  return (
    <div className="flex items-center gap-2 text-sm" role="group" aria-label={t("switch")}>
      {(["ar", "en"] as const).map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={locale === item}
          className={locale === item ? "font-semibold underline decoration-gold" : "opacity-70 hover:opacity-100"}
          onClick={() => router.replace(pathname, { locale: item })}
        >
          {t(item)}
        </button>
      ))}
    </div>
  );
}
