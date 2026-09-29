import { getTranslations } from "next-intl/server";
import { Feedback } from "@/components/feedback";
import { SubmitButton } from "@/components/submit-button";
import { dangerButtonClass, fieldClass } from "@/components/styles";
import { ReservedNameCategory } from "@/generated/prisma/client";
import { addReservedUsernameAction, removeReservedUsernameAction } from "@/server/admin/actions";
import { getDb } from "@/server/db";

export default async function UsernamesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const query = await searchParams;
  const t = await getTranslations("admin");
  const fields = await getTranslations("fields");
  const categories = await getTranslations("categories");
  const rows = await getDb().reservedUsername.findMany({ orderBy: [{ category: "asc" }, { value: "asc" }] });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-ink">{t("usernames")}</h1>
      <Feedback error={query.error} notice={query.notice} />
      <form action={addReservedUsernameAction} className="grid gap-3 rounded-xl border border-line bg-card p-5 md:grid-cols-4">
        <input name="value" required className={fieldClass} dir="ltr" placeholder={fields("username")} />
        <select name="category" className={fieldClass} defaultValue={ReservedNameCategory.CUSTOM}>
          {Object.values(ReservedNameCategory).map((category) => (
            <option key={category} value={category}>
              {categories(category)}
            </option>
          ))}
        </select>
        <input name="reason" className={fieldClass} placeholder={fields("reason")} />
        <SubmitButton pendingLabel={t("saving")}>{t("create")}</SubmitButton>
      </form>
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="min-w-full text-sm">
          <thead className="text-muted">
            <tr>
              {[fields("value"), fields("category"), fields("reason"), fields("action")].map((header) => (
                <th key={header} className="px-3 py-2 text-start font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-muted">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-3 py-2" dir="ltr">
                    {row.value}
                  </td>
                  <td className="px-3 py-2">{categories(row.category)}</td>
                  <td className="px-3 py-2">{row.reason ?? "—"}</td>
                  <td className="px-3 py-2">
                    <form action={removeReservedUsernameAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <SubmitButton pendingLabel={t("saving")} className={dangerButtonClass}>
                        {t("remove")}
                      </SubmitButton>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
