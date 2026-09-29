import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Feedback } from "@/components/feedback";
import { fieldClass, buttonClass } from "@/components/styles";
import { SubmitButton } from "@/components/submit-button";
import { loginAction } from "@/server/auth/actions";
import { isFeatureEnabled } from "@/server/config/settings";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const t = await getTranslations("auth");
  const admin = await getTranslations("admin");
  const query = await searchParams;
  const registration = await isFeatureEnabled("registration");

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <h1 className="text-3xl font-semibold text-ink">{t("signInTitle")}</h1>
      <form action={loginAction} className="mt-8 space-y-4">
        <Feedback error={query.error} notice={query.notice} />
        <label className="block text-sm">
          <span className="mb-1 block text-muted">{t("identifier")}</span>
          <input name="identifier" autoComplete="username" required className={fieldClass} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">{t("password")}</span>
          <input name="password" type="password" autoComplete="current-password" required className={fieldClass} />
        </label>
        <SubmitButton pendingLabel={admin("saving")} className={`${buttonClass} w-full`}>
          {t("submit")}
        </SubmitButton>
      </form>
      {registration ? (
        <p className="mt-6 text-sm text-muted">
          {t("noAccount")}{" "}
          <Link href="/register" className="font-medium text-accent">
            {t("registerTitle")}
          </Link>
        </p>
      ) : (
        <p className="mt-6 text-sm text-muted">{t("closed")}</p>
      )}
    </div>
  );
}
