import { getRequestContext } from "@/server/audit/log";
import { registerWithPassword } from "@/server/auth/service";
import { sameOriginWrite } from "@/server/http/origin";

export async function POST(request: Request) {
  if (!sameOriginWrite(request)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as
    | { username?: string; email?: string; password?: string; confirm?: string }
    | null;
  const result = await registerWithPassword(
    {
      username: body?.username ?? "",
      email: body?.email ?? "",
      password: body?.password ?? "",
      confirm: body?.confirm ?? "",
    },
    await getRequestContext(),
  );
  if (!result.ok) {
    const status = result.error === "registration_closed" ? 403 : result.error === "rate_limited" ? 429 : 400;
    return Response.json({ error: result.error }, { status });
  }
  return Response.json({ ok: true }, { status: 201 });
}
