import { getRequestContext } from "@/server/audit/log";
import { loginWithPassword } from "@/server/auth/service";
import { getCurrentUser } from "@/server/auth/session";
import { sameOriginWrite } from "@/server/http/origin";

export async function POST(request: Request) {
  if (!sameOriginWrite(request)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { identifier?: string; password?: string } | null;
  const result = await loginWithPassword(
    {
      identifier: body?.identifier ?? "",
      password: body?.password ?? "",
    },
    await getRequestContext(),
  );
  if (!result.ok) {
    const status = result.error === "rate_limited" ? 429 : 401;
    return Response.json({ error: result.error }, { status });
  }

  const user = await getCurrentUser();
  return Response.json({
    user: user
      ? {
          id: user.id,
          username: user.username,
          email: user.email,
          roles: user.roles,
        }
      : null,
  });
}
