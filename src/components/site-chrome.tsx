import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { logoutAction } from "@/server/auth/actions";
import { getCurrentUser, hasPermission } from "@/server/auth/session";
import { isFeatureEnabled } from "@/server/config/settings";
import type { PublicSite } from "@/server/site";

export async function SiteHeader({ site }: { site: PublicSite }) {
  const t = await getTranslations("public");
  const auth = await getTranslations("auth");
  const user = await getCurrentUser();
  const registration = await isFeatureEnabled("registration");

  return (
    <header className="border-b border-line bg-card">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="flex items-center gap-3 text-lg font-semibold text-ink">
          {site.logoMediaId ? (
            // User-managed site media is served by our own checked route.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/v1/media/${site.logoMediaId}`}
              alt=""
              className="h-9 w-9 rounded-md object-cover"
            />
          ) : (
            <span className="h-9 w-1.5 rounded-full bg-gold" aria-hidden />
          )}
          {site.name}
        </Link>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          {user ? (
            <>
              {hasPermission(user, "admin.access") ? (
                <Link href="/admin" className="text-sm font-medium text-accent">
                  {t("admin")}
                </Link>
              ) : null}
              <Link href="/account" className="text-sm text-ink">
                {t("account")}
              </Link>
              <form action={logoutAction}>
                <button type="submit" className="text-sm text-muted">
                  {auth("logout")}
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-ink">
                {t("signIn")}
              </Link>
              {registration ? (
                <Link href="/register" className="text-sm font-medium text-accent">
                  {t("register")}
                </Link>
              ) : null}
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export async function SiteFooter({ site }: { site: PublicSite }) {
  const t = await getTranslations("public");
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-medium text-ink">{site.name}</p>
          {site.footer ? <p className="mt-2 max-w-xl">{site.footer}</p> : null}
        </div>
        <div className="space-y-1">
          <p className="font-medium text-ink">{t("contact")}</p>
          {site.email ? (
            <p>
              {t("email")}: <span dir="ltr">{site.email}</span>
            </p>
          ) : null}
          {site.phone ? (
            <p>
              {t("phone")}: <span dir="ltr">{site.phone}</span>
            </p>
          ) : null}
          {site.socialLinks.map((link) => (
            <p key={`${link.platform}-${link.url}`}>
              <a className="text-accent" href={link.url} rel="noreferrer">
                {link.platform}
              </a>
            </p>
          ))}
        </div>
      </div>
    </footer>
  );
}
