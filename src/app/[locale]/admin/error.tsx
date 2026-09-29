"use client";

import { useTranslations } from "next-intl";

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("feedback");
  const admin = useTranslations("admin");
  return (
    <div className="rounded-xl border border-line bg-card p-6">
      <p className="text-danger">{t("database")}</p>
      <button type="button" className="mt-4 text-sm font-medium text-accent" onClick={reset}>
        {admin("save")}
      </button>
    </div>
  );
}
