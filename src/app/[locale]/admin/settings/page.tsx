import { getTranslations } from "next-intl/server";
import { Feedback } from "@/components/feedback";
import { SocialLinksField } from "@/components/social-links-field";
import { SubmitButton } from "@/components/submit-button";
import { fieldClass } from "@/components/styles";
import { saveSettingsAction } from "@/server/admin/actions";
import { settingMessageKey, type SocialLink } from "@/server/config/registry";
import { getSettingsForGroup, settingGroups } from "@/server/config/settings";
import { getCurrentUser, hasPermission } from "@/server/auth/session";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const query = await searchParams;
  const t = await getTranslations("admin");
  const settingsT = await getTranslations("settings");
  const actor = await getCurrentUser();
  const canUpdate = actor ? hasPermission(actor, "settings.update") : false;
  const groups = await Promise.all(settingGroups.map(async (group) => ({ group, items: await getSettingsForGroup(group) })));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink">{t("settings")}</h1>
      <Feedback error={query.error} notice={query.notice} />
      {groups.map(({ group, items }) => (
        <section key={group} className="rounded-xl border border-line bg-card p-5">
          <h2 className="font-semibold text-ink">{t(`groups.${group}`)}</h2>
          <form action={saveSettingsAction} className="mt-4 space-y-4">
            <input type="hidden" name="group" value={group} />
            {items
              .filter((item) => item.definition.editor !== "hidden")
              .map((item) => {
                const label = settingsT(settingMessageKey(item.key));
                return (
                  <label key={item.key} className="block text-sm">
                    <span className="mb-1 block text-muted">{label}</span>
                    {item.definition.module === "reserved" ? (
                      <span className="mb-2 block text-xs text-gold">{t("reservedModule")}</span>
                    ) : null}
                    {item.definition.editor === "social" ? (
                      <SocialLinksField
                        name={item.key}
                        initial={item.value as SocialLink[]}
                        labels={{
                          platform: settingsT("platform"),
                          url: settingsT("url"),
                          add: settingsT("addLink"),
                          remove: t("remove"),
                        }}
                      />
                    ) : item.definition.editor === "textarea" ? (
                      <textarea
                        name={item.key}
                        defaultValue={String(item.value)}
                        rows={3}
                        disabled={!canUpdate}
                        className={fieldClass}
                      />
                    ) : item.definition.editor === "number" ? (
                      <input
                        name={item.key}
                        type="number"
                        defaultValue={Number(item.value)}
                        min={item.definition.min}
                        max={item.definition.max}
                        disabled={!canUpdate}
                        className={fieldClass}
                        dir="ltr"
                      />
                    ) : item.definition.editor === "mimeList" ? (
                      <>
                        <input
                          name={item.key}
                          defaultValue={(item.value as string[]).join(", ")}
                          disabled={!canUpdate}
                          className={fieldClass}
                          dir="ltr"
                        />
                        <span className="mt-1 block text-xs text-muted">{settingsT("mimeHelp")}</span>
                      </>
                    ) : (
                      <input
                        name={item.key}
                        defaultValue={String(item.value)}
                        disabled={!canUpdate}
                        className={fieldClass}
                      />
                    )}
                  </label>
                );
              })}
            {canUpdate ? <SubmitButton pendingLabel={t("saving")}>{t("save")}</SubmitButton> : null}
          </form>
        </section>
      ))}
    </div>
  );
}
