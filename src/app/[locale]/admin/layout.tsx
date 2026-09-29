import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { AdminShell } from "@/components/admin/shell";
import { getCurrentUser, hasPermission } from "@/server/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: "/login", locale });
    throw new Error("Redirect did not interrupt rendering.");
  }
  if (!hasPermission(user, "admin.access")) {
    const t = await getTranslations("admin");
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4">
        <p className="text-lg text-ink">{t("forbidden")}</p>
      </div>
    );
  }

  return <AdminShell user={user}>{children}</AdminShell>;
}
