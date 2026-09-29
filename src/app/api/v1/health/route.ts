import { APP_VERSION } from "@/server/version";

export async function GET() {
  return Response.json({
    status: "ok",
    service: "aksadata",
    version: APP_VERSION,
    time: new Date().toISOString(),
  });
}
