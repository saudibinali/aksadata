import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getPublicSite } from "@/server/site";

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const site = await getPublicSite(locale);
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader site={site} />
      <div className="flex-1">{children}</div>
      <SiteFooter site={site} />
    </div>
  );
}
