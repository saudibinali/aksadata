import { getTranslations } from "next-intl/server";
import { Feedback } from "@/components/feedback";
import { SubmitButton } from "@/components/submit-button";
import { fieldClass, secondaryButtonClass } from "@/components/styles";
import { createRoleAction, saveRolePermissionsAction } from "@/server/admin/actions";
import { permissionMessageKey } from "@/server/auth/permissions";
import { getCurrentUser, hasPermission } from "@/server/auth/session";
import { getDb } from "@/server/db";

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const query = await searchParams;
  const t = await getTranslations("admin");
  const rolesT = await getTranslations("roles");
  const fields = await getTranslations("fields");
  const permissionsT = await getTranslations("permissions");
  const actor = await getCurrentUser();
  const canManage = actor ? hasPermission(actor, "roles.manage") : false;
  const roles = await getDb().role.findMany({
    orderBy: { key: "asc" },
    include: { permissions: { include: { permission: true } } },
  });
  const permissions = await getDb().permission.findMany({ orderBy: { key: "asc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink">{t("roles")}</h1>
      <Feedback error={query.error} notice={query.notice} />
      {canManage ? (
        <form action={createRoleAction} className="grid gap-3 rounded-xl border border-line bg-card p-5 md:grid-cols-4">
          <input name="key" required placeholder={fields("key")} className={fieldClass} dir="ltr" />
          <input name="name" required placeholder={fields("name")} className={fieldClass} />
          <input name="description" placeholder={fields("description")} className={fieldClass} />
          <SubmitButton pendingLabel={t("saving")}>{rolesT("newRole")}</SubmitButton>
        </form>
      ) : null}
      {roles.map((role) => {
        const granted = new Set(role.permissions.map((item) => item.permission.key));
        const locked = role.key === "SUPER_ADMIN";
        return (
          <section key={role.id} className="rounded-xl border border-line bg-card p-5">
            <h2 className="font-semibold text-ink">{rolesT.has(role.key) ? rolesT(role.key) : role.name}</h2>
            {role.description ? <p className="mt-1 text-sm text-muted">{role.description}</p> : null}
            {locked ? <p className="mt-3 text-sm text-gold">{rolesT("systemLocked")}</p> : null}
            <form action={saveRolePermissionsAction} className="mt-4">
              <input type="hidden" name="roleId" value={role.id} />
              <div className="grid gap-2 sm:grid-cols-2">
                {permissions.map((permission) => (
                  <label key={permission.id} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="permission"
                      value={permission.key}
                      defaultChecked={granted.has(permission.key)}
                      disabled={!canManage || locked}
                    />
                    <span>
                      {permissionsT.has(permissionMessageKey(permission.key))
                        ? permissionsT(permissionMessageKey(permission.key))
                        : permission.description}
                    </span>
                  </label>
                ))}
              </div>
              {canManage && !locked ? (
                <div className="mt-4">
                  <SubmitButton pendingLabel={t("saving")} className={secondaryButtonClass}>
                    {t("save")}
                  </SubmitButton>
                </div>
              ) : null}
            </form>
          </section>
        );
      })}
    </div>
  );
}
