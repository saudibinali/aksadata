import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getDb } from "@/server/db";
import { formatDateTime } from "@/server/format";

const PAGE_SIZE = 30;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const query = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("admin");
  const fields = await getTranslations("fields");
  const page = Math.max(1, Number(query.page) || 1);
  const [total, rows] = await Promise.all([
    getDb().auditLog.count(),
    getDb().auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-ink">{t("audit")}</h1>
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="min-w-full text-sm">
          <thead className="text-muted">
            <tr>
              {[fields("when"), fields("actor"), fields("action"), fields("entity"), fields("ip")].map((header) => (
                <th key={header} className="px-3 py-2 text-start font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-muted">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-line align-top">
                  <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(row.createdAt, locale)}</td>
                  <td className="px-3 py-2" dir="ltr">
                    {row.actorUsername ?? "—"}
                  </td>
                  <td className="px-3 py-2" dir="ltr">
                    {row.action}
                  </td>
                  <td className="px-3 py-2">
                    <p dir="ltr">
                      {row.entityType}
                      {row.entityId ? `:${row.entityId}` : ""}
                    </p>
                    {row.previousValue || row.newValue ? (
                      <pre className="mt-1 max-w-md overflow-x-auto text-xs text-muted" dir="ltr">
                        {JSON.stringify({ from: row.previousValue, to: row.newValue })}
                      </pre>
                    ) : null}
                  </td>
                  <td className="px-3 py-2" dir="ltr">
                    {row.ipAddress ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span>
          {t("page")} {page} / {pages}
        </span>
        <div className="flex gap-3">
          {page > 1 ? <Link href={{ pathname: "/admin/audit", query: { page: String(page - 1) } }}>{t("previous")}</Link> : null}
          {page < pages ? <Link href={{ pathname: "/admin/audit", query: { page: String(page + 1) } }}>{t("next")}</Link> : null}
        </div>
      </div>
    </div>
  );
}
