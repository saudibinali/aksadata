import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Feedback } from "@/components/feedback";
import { buttonClass, fieldClass } from "@/components/styles";
import { SubmitButton } from "@/components/submit-button";
import { registerAction } from "@/server/auth/actions";
import { isFeatureEnabled, getSetting } from "@/server/config/settings";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const t = await getTranslations("auth");
  const admin = await getTranslations("admin");
  const query = await searchParams;
  const open = await isFeatureEnabled("registration");
  const [minLength, maxLength] = open
    ? await Promise.all([getSetting("username.minLength"), getSetting("username.maxLength")])
    : [3, 20];

  if (!open) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-16">
        <h1 className="text-3xl font-semibold text-ink">{t("registerTitle")}</h1>
        <p className="mt-4 text-muted">{t("closed")}</p>
        <Link href="/login" className="mt-6 inline-block text-sm font-medium text-accent">
          {t("signInTitle")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <h1 className="text-3xl font-semibold text-ink">{t("registerTitle")}</h1>
      <form action={registerAction} className="mt-8 space-y-4">
        <Feedback error={query.error} notice={query.notice} />
        <label className="block text-sm">
          <span className="mb-1 block text-muted">{t("username")}</span>
          <input
            name="username"
            required
            minLength={minLength}
            maxLength={maxLength}
            className={fieldClass}
            dir="ltr"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">{t("email")}</span>
          <input name="email" type="email" autoComplete="email" required className={fieldClass} dir="ltr" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">{t("password")}</span>
          <input name="password" type="password" autoComplete="new-password" required className={fieldClass} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">{t("confirm")}</span>
          <input name="confirm" type="password" autoComplete="new-password" required className={fieldClass} />
        </label>
        <SubmitButton pendingLabel={admin("saving")} className={`${buttonClass} w-full`}>
          {t("submit")}
        </SubmitButton>
      </form>
      <p className="mt-6 text-sm text-muted">
        {t("hasAccount")}{" "}
        <Link href="/login" className="font-medium text-accent">
          {t("signInTitle")}
        </Link>
      </p>
    </div>
  );
}
