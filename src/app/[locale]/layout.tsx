import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { direction } from "@/i18n/locales";
import { getPublicSite } from "@/server/site";
import "../globals.css";

export const dynamic = "force-dynamic";

const plex = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
  display: "swap",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const site = await getPublicSite(locale);
  return {
    title: { default: site.name || t("title"), template: `%s · ${site.name || t("title")}` },
    description: t("description"),
    icons: site.faviconMediaId ? { icon: `/api/v1/media/${site.faviconMediaId}` } : undefined,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} dir={direction(locale)} className={`${plex.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
