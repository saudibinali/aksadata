import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Feedback } from "@/components/feedback";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass, fieldClass, secondaryButtonClass } from "@/components/styles";
import { UserStatus } from "@/generated/prisma/client";
import {
  updateUserRolesAction,
  updateUserStatusAction,
  updateUsernameAction,
} from "@/server/admin/actions";
import { getCurrentUser, hasPermission } from "@/server/auth/session";
import { getSetting } from "@/server/config/settings";
import { getDb } from "@/server/db";

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const t = await getTranslations("admin");
  const fields = await getTranslations("fields");
  const statusT = await getTranslations("status");
  const rolesT = await getTranslations("roles");
  const actor = await getCurrentUser();
  const [user, roles, maxLength] = await Promise.all([
    getDb().user.findUnique({
      where: { id },
      include: { roles: true },
    }),
    getDb().role.findMany({ orderBy: { key: "asc" } }),
    getSetting("username.maxLength"),
  ]);
  if (!user || !actor) notFound();
  const assigned = new Set(user.roles.map((role) => role.roleId));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink" dir="ltr">
          {user.username}
        </h1>
        <p className="text-sm text-muted" dir="ltr">
          {user.email}
        </p>
      </div>
      <Feedback error={query.error} notice={query.notice} />

      {hasPermission(actor, "users.update") ? (
        <section className="space-y-4 rounded-xl border border-line bg-card p-5">
          <form action={updateUsernameAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <input type="hidden" name="userId" value={user.id} />
            <label className="block flex-1 text-sm">
              <span className="mb-1 block text-muted">{fields("username")}</span>
              <input name="username" defaultValue={user.username} maxLength={maxLength} required className={fieldClass} dir="ltr" />
            </label>
            <SubmitButton pendingLabel={t("saving")}>{t("save")}</SubmitButton>
          </form>
          <form action={updateUserStatusAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <input type="hidden" name="userId" value={user.id} />
            <label className="block flex-1 text-sm">
              <span className="mb-1 block text-muted">{fields("status")}</span>
              <select name="status" defaultValue={user.status} className={fieldClass}>
                {Object.values(UserStatus).map((status) => (
                  <option key={status} value={status}>
                    {statusT(status)}
                  </option>
                ))}
              </select>
            </label>
            <SubmitButton pendingLabel={t("saving")} className={secondaryButtonClass}>
              {t("save")}
            </SubmitButton>
          </form>
          <p className="text-sm text-muted">
            {fields("verification")}: {statusT(user.verificationStatus)}
          </p>
        </section>
      ) : null}

      {hasPermission(actor, "users.roles") ? (
        <section className="rounded-xl border border-line bg-card p-5">
          <h2 className="font-semibold text-ink">{fields("roles")}</h2>
          <form action={updateUserRolesAction} className="mt-4 space-y-3">
            <input type="hidden" name="userId" value={user.id} />
            {roles.map((role) => (
              <label key={role.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="roleId" value={role.id} defaultChecked={assigned.has(role.id)} />
                <span>{rolesT.has(role.key) ? rolesT(role.key) : role.name}</span>
              </label>
            ))}
            <SubmitButton pendingLabel={t("saving")} className={buttonClass}>
              {t("save")}
            </SubmitButton>
          </form>
        </section>
      ) : null}
    </div>
  );
}
