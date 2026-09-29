import { getTranslations } from "next-intl/server";
import { getDb } from "@/server/db";
import { getCurrentUser, hasPermission } from "@/server/auth/session";
import { listFeatureFlags } from "@/server/config/settings";

export default async function DashboardPage() {
  const t = await getTranslations("admin");
  const user = await getCurrentUser();
  const db = getDb();
  const flags = await listFeatureFlags();

  const [users, posts, media, audit] = await Promise.all([
    user && hasPermission(user, "users.read") ? db.user.count() : Promise.resolve(null),
    user && hasPermission(user, "content.read") ? db.post.count() : Promise.resolve(null),
    user && hasPermission(user, "media.read") ? db.mediaAsset.count() : Promise.resolve(null),
    user && hasPermission(user, "audit.read") ? db.auditLog.count() : Promise.resolve(null),
  ]);

  const cards = [
    users !== null ? { label: t("stats.users"), value: users } : null,
    posts !== null ? { label: t("stats.posts"), value: posts } : null,
    media !== null ? { label: t("stats.media"), value: media } : null,
    audit !== null ? { label: t("stats.audit"), value: audit } : null,
    user && hasPermission(user, "features.read")
      ? { label: t("stats.flags"), value: flags.filter((flag) => flag.enabled).length }
      : null,
  ].filter((card) => card !== null);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">{t("dashboard")}</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <article key={card.label} className="rounded-xl border border-line bg-card p-5">
            <p className="text-sm text-muted">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{card.value}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
