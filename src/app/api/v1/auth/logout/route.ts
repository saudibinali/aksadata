import { getRequestContext, writeAudit } from "@/server/audit/log";
import { getCurrentUser, revokeCurrentSession } from "@/server/auth/session";
import { sameOriginWrite } from "@/server/http/origin";

export async function POST(request: Request) {
  if (!sameOriginWrite(request)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (user) {
    await writeAudit({
      actorId: user.id,
      actorUsername: user.username,
      action: "auth.logout",
      entityType: "User",
      entityId: user.id,
      context: await getRequestContext(),
    });
  }
  await revokeCurrentSession();
  return Response.json({ ok: true });
}
