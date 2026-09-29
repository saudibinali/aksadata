import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/server/auth/session";

export default async function AccountPage() {
  const locale = await getLocale();
  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: "/login", locale });
    throw new Error("Redirect did not interrupt rendering.");
  }

  const t = await getTranslations("auth");
  const fields = await getTranslations("fields");
  const status = await getTranslations("status");
  const roles = await getTranslations("roles");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-semibold text-ink">{t("accountTitle")}</h1>
      <dl className="mt-8 space-y-4 rounded-xl border border-line bg-card p-6">
        <div>
          <dt className="text-sm text-muted">{fields("username")}</dt>
          <dd className="mt-1 font-medium" dir="ltr">
            {user.username}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{fields("email")}</dt>
          <dd className="mt-1" dir="ltr">
            {user.email}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{t("status")}</dt>
          <dd className="mt-1">{status(user.status)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{t("roles")}</dt>
          <dd className="mt-1">
            {user.roles.length
              ? user.roles.map((role) => (roles.has(role) ? roles(role) : role)).join("، ")
              : "—"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
