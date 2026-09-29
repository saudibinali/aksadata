import { getLocale, getTranslations } from "next-intl/server";
import { Feedback } from "@/components/feedback";
import { SubmitButton } from "@/components/submit-button";
import { fieldClass } from "@/components/styles";
import { ContentStatus } from "@/generated/prisma/client";
import { updateContentStatusAction } from "@/server/admin/actions";
import { getCurrentUser, hasPermission } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { formatDateTime } from "@/server/format";

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const query = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("admin");
  const fields = await getTranslations("fields");
  const statusT = await getTranslations("status");
  const actor = await getCurrentUser();
  const canModerate = actor ? hasPermission(actor, "content.moderate") : false;
  const posts = await getDb().post.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      author: { select: { username: true } },
      translations: true,
      _count: { select: { comments: true } },
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-ink">{t("content")}</h1>
      <Feedback error={query.error} notice={query.notice} />
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="min-w-full text-sm">
          <thead className="text-muted">
            <tr>
              {[fields("title"), fields("author"), fields("status"), fields("created"), fields("action")].map((header) => (
                <th key={header} className="px-3 py-2 text-start font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-muted">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              posts.map((post) => {
                const translation = post.translations.find((item) => item.locale === locale) ?? post.translations[0];
                return (
                  <tr key={post.id} className="border-t border-line">
                    <td className="px-3 py-2">
                      {translation?.title ?? "—"}
                      <span className="ms-2 text-xs text-muted">{post._count.comments}</span>
                    </td>
                    <td className="px-3 py-2" dir="ltr">
                      {post.author.username}
                    </td>
                    <td className="px-3 py-2">{statusT(post.status)}</td>
                    <td className="px-3 py-2">{formatDateTime(post.createdAt, locale)}</td>
                    <td className="px-3 py-2">
                      {canModerate ? (
                        <form action={updateContentStatusAction} className="flex gap-2">
                          <input type="hidden" name="postId" value={post.id} />
                          <select name="status" defaultValue={post.status} className={fieldClass}>
                            {Object.values(ContentStatus).map((status) => (
                              <option key={status} value={status}>
                                {statusT(status)}
                              </option>
                            ))}
                          </select>
                          <SubmitButton pendingLabel={t("saving")}>{t("save")}</SubmitButton>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
