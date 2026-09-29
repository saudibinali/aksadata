import { getDb } from "@/server/db";

export async function GET() {
  try {
    await getDb().$queryRaw`SELECT 1`;
    return Response.json({ status: "ready" });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
