import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col justify-center px-4">
      <h1 className="text-3xl font-semibold text-ink">{t("title")}</h1>
      <Link href="/" className="mt-4 text-accent">
        {t("home")}
      </Link>
    </div>
  );
}
