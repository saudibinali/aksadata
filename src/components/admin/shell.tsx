import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { logoutAction } from "@/server/auth/actions";
import type { CurrentUser } from "@/server/auth/session";
import type { PermissionKey } from "@/server/auth/permissions";

const NAV: { href: string; label: string; permission: PermissionKey }[] = [
  { href: "/admin", label: "dashboard", permission: "admin.access" },
  { href: "/admin/users", label: "users", permission: "users.read" },
  { href: "/admin/roles", label: "roles", permission: "roles.read" },
  { href: "/admin/content", label: "content", permission: "content.read" },
  { href: "/admin/media", label: "media", permission: "media.read" },
  { href: "/admin/usernames", label: "usernames", permission: "usernames.manage" },
  { href: "/admin/settings", label: "settings", permission: "settings.read" },
  { href: "/admin/features", label: "features", permission: "features.read" },
  { href: "/admin/audit", label: "audit", permission: "audit.read" },
];

export async function AdminShell({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  const t = await getTranslations("admin");
  const auth = await getTranslations("auth");
  const items = NAV.filter((item) => user.permissions.has(item.permission));

  const links = (
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-md px-3 py-2 text-sm text-sidebar-text hover:bg-white/10"
        >
          {t(item.label)}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden bg-sidebar text-sidebar-text lg:flex lg:flex-col lg:justify-between lg:px-4 lg:py-6">
        <div>
          <p className="px-3 text-xs tracking-[0.18em] text-gold">{t("brand")}</p>
          <div className="mt-6">{links}</div>
        </div>
        <div className="space-y-3 px-3 text-sm">
          <LanguageSwitcher />
          <Link href="/" className="block text-sidebar-text/80">
            {t("viewSite")}
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="text-sidebar-text/80">
              {auth("logout")}
            </button>
          </form>
        </div>
      </aside>
      <div>
        <div className="border-b border-line bg-sidebar text-sidebar-text lg:hidden">
          <details>
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium">{t("menu")}</summary>
            <div className="space-y-4 px-4 pb-4">
              {links}
              <LanguageSwitcher />
              <form action={logoutAction}>
                <button type="submit" className="text-sm">
                  {auth("logout")}
                </button>
              </form>
            </div>
          </details>
        </div>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
