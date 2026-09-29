import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicSite } from "@/server/site";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("public");
  const site = await getPublicSite(locale);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:py-20">
      <p className="text-sm font-medium tracking-[0.16em] text-gold">{site.name}</p>
      <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-ink sm:text-5xl">
        {t("heroTitle")}
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">{t("heroBody")}</p>
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-line bg-card p-6">
          <h2 className="text-xl font-semibold text-ink">{t("stageTitle")}</h2>
          <p className="mt-3 leading-7 text-muted">{t("stageBody")}</p>
        </section>
        <section className="rounded-xl border border-line bg-ink p-6 text-sidebar-text">
          <h2 className="text-xl font-semibold">{t("governTitle")}</h2>
          <p className="mt-3 leading-7 text-sidebar-text/80">{t("governBody")}</p>
        </section>
      </div>
    </div>
  );
}
