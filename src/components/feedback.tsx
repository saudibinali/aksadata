import { getTranslations } from "next-intl/server";

export async function Feedback({
  error,
  notice,
}: {
  error?: string;
  notice?: string;
}) {
  const t = await getTranslations("feedback");
  if (error) {
    return (
      <p className="rounded-md border border-danger/30 bg-white px-3 py-2 text-sm text-danger" role="alert">
        {t.has(error) ? t(error) : t("validation")}
      </p>
    );
  }
  if (notice) {
    return (
      <p className="rounded-md border border-accent/30 bg-white px-3 py-2 text-sm text-accent-strong" role="status">
        {t.has(notice) ? t(notice) : t("saved")}
      </p>
    );
  }
  return null;
}
