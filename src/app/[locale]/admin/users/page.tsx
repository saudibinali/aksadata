import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Feedback } from "@/components/feedback";
import { buttonClass, fieldClass } from "@/components/styles";
import { UserStatus } from "@/generated/prisma/client";
import { getDb } from "@/server/db";
import { formatDateTime } from "@/server/format";

const PAGE_SIZE = 20;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; error?: string; notice?: string }>;
}) {
  const query = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("admin");
  const fields = await getTranslations("fields");
  const statusT = await getTranslations("status");
  const page = Math.max(1, Number(query.page) || 1);
  const status = Object.values(UserStatus).find((item) => item === query.status);
  const q = query.q?.trim();

  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { username: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    getDb().user.count({ where }),
    getDb().user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        username: true,
        email: true,
        status: true,
        createdAt: true,
        roles: { select: { role: { select: { key: true } } } },
      },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-ink">{t("users")}</h1>
      <Feedback error={query.error} notice={query.notice} />
      <form className="grid gap-3 sm:grid-cols-[1fr_12rem_auto]">
        <input name="q" defaultValue={q} placeholder={t("search")} className={fieldClass} />
        <select name="status" defaultValue={status ?? ""} className={fieldClass}>
          <option value="">{fields("status")}</option>
          {Object.values(UserStatus).map((item) => (
            <option key={item} value={item}>
              {statusT(item)}
            </option>
          ))}
        </select>
        <button className={buttonClass} type="submit">
          {t("search")}
        </button>
      </form>
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="min-w-full text-sm">
          <thead className="text-muted">
            <tr>
              {[fields("username"), fields("email"), fields("status"), fields("roles"), fields("created")].map(
                (header) => (
                  <th key={header} className="px-3 py-2 text-start font-medium">
                    {header}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-muted" colSpan={5}>
                  {t("empty")}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-t border-line">
                  <td className="px-3 py-2">
                    <Link href={`/admin/users/${user.id}`} className="font-medium text-accent" dir="ltr">
                      {user.username}
                    </Link>
                  </td>
                  <td className="px-3 py-2" dir="ltr">
                    {user.email}
                  </td>
                  <td className="px-3 py-2">{statusT(user.status)}</td>
                  <td className="px-3 py-2">{user.roles.map((role) => role.role.key).join(", ") || "—"}</td>
                  <td className="px-3 py-2">{formatDateTime(user.createdAt, locale)}</td>
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
          {page > 1 ? (
            <Link href={{ pathname: "/admin/users", query: { ...query, page: String(page - 1) } }}>{t("previous")}</Link>
          ) : null}
          {page < pages ? (
            <Link href={{ pathname: "/admin/users", query: { ...query, page: String(page + 1) } }}>{t("next")}</Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
