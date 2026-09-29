import { getLocale, getTranslations } from "next-intl/server";
import { Feedback } from "@/components/feedback";
import { SubmitButton } from "@/components/submit-button";
import { fieldClass } from "@/components/styles";
import { uploadSiteMediaAction } from "@/server/admin/actions";
import { getCurrentUser, hasPermission } from "@/server/auth/session";
import { getSetting } from "@/server/config/settings";
import { getDb } from "@/server/db";
import { formatDateTime } from "@/server/format";

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const query = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("admin");
  const pageT = await getTranslations("mediaPage");
  const fields = await getTranslations("fields");
  const purposes = await getTranslations("purposes");
  const actor = await getCurrentUser();
  const canUpload = actor ? hasPermission(actor, "settings.update") : false;
  const [maxBytes, types, logoId, faviconId, assets] = await Promise.all([
    getSetting("media.maxUploadBytes"),
    getSetting("media.allowedMimeTypes"),
    getSetting("site.logoMediaId"),
    getSetting("site.faviconMediaId"),
    getDb().mediaAsset.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink">{t("media")}</h1>
      <Feedback error={query.error} notice={query.notice} />
      <section className="rounded-xl border border-line bg-card p-5 text-sm">
        <h2 className="font-semibold text-ink">{pageT("policy")}</h2>
        <p className="mt-2 text-muted" dir="ltr">
          {maxBytes} bytes · {types.join(", ")}
        </p>
      </section>
      {canUpload ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ["SITE_LOGO", pageT("logo"), logoId],
            ["SITE_FAVICON", pageT("favicon"), faviconId],
          ].map(([purpose, label, mediaId]) => (
            <form key={purpose} action={uploadSiteMediaAction} className="space-y-3 rounded-xl border border-line bg-card p-5">
              <h2 className="font-semibold text-ink">{label}</h2>
              {mediaId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/v1/media/${mediaId}`} alt="" className="h-16 w-16 rounded-md object-cover" />
              ) : (
                <p className="text-sm text-muted">{pageT("none")}</p>
              )}
              <input type="hidden" name="purpose" value={purpose} />
              <input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/x-icon" required className={fieldClass} />
              <SubmitButton pendingLabel={t("saving")}>{t("upload")}</SubmitButton>
            </form>
          ))}
        </div>
      ) : null}
      <section>
        <h2 className="mb-3 font-semibold text-ink">{pageT("library")}</h2>
        <div className="overflow-x-auto rounded-xl border border-line bg-card">
          <table className="min-w-full text-sm">
            <thead className="text-muted">
              <tr>
                {[fields("file"), fields("purpose"), fields("type"), fields("size"), fields("created")].map((header) => (
                  <th key={header} className="px-3 py-2 text-start font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-muted">
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                assets.map((asset) => (
                  <tr key={asset.id} className="border-t border-line">
                    <td className="px-3 py-2">{asset.originalName}</td>
                    <td className="px-3 py-2">{purposes(asset.purpose)}</td>
                    <td className="px-3 py-2" dir="ltr">
                      {asset.mimeType}
                    </td>
                    <td className="px-3 py-2" dir="ltr">
                      {asset.sizeBytes}
                    </td>
                    <td className="px-3 py-2">{formatDateTime(asset.createdAt, locale)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
