import { getTranslations } from "next-intl/server";
import { Feedback } from "@/components/feedback";
import { SubmitButton } from "@/components/submit-button";
import { secondaryButtonClass } from "@/components/styles";
import { toggleFeatureAction } from "@/server/admin/actions";
import { getCurrentUser, hasPermission } from "@/server/auth/session";
import { listFeatureFlags } from "@/server/config/settings";

export default async function FeaturesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const query = await searchParams;
  const t = await getTranslations("admin");
  const featuresT = await getTranslations("features");
  const actor = await getCurrentUser();
  const canUpdate = actor ? hasPermission(actor, "features.update") : false;
  const flags = await listFeatureFlags();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-ink">{t("features")}</h1>
      <Feedback error={query.error} notice={query.notice} />
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="min-w-full text-sm">
          <tbody>
            {flags.map((flag) => (
              <tr key={flag.key} className="border-t border-line">
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{featuresT(flag.key)}</p>
                  <p className="text-xs text-muted" dir="ltr">
                    {flag.key}
                  </p>
                </td>
                <td className="px-4 py-3 text-muted">
                  {flag.implemented ? (flag.locked ? t("locked") : t("available")) : t("planned")}
                </td>
                <td className="px-4 py-3 text-end">
                  {flag.implemented && !flag.locked && canUpdate ? (
                    <form action={toggleFeatureAction}>
                      <input type="hidden" name="key" value={flag.key} />
                      <input type="hidden" name="enabled" value={flag.enabled ? "false" : "true"} />
                      <SubmitButton pendingLabel={t("saving")} className={secondaryButtonClass}>
                        {flag.enabled ? t("disable") : t("enable")}
                      </SubmitButton>
                    </form>
                  ) : (
                    <span>{flag.enabled ? t("enable") : t("disable")}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
