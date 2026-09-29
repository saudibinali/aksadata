import { MediaPurpose, MediaStatus } from "@/generated/prisma/client";
import { getDb } from "@/server/db";
import { readMediaObject } from "@/server/media/storage";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const asset = await getDb().mediaAsset.findUnique({ where: { id } });
  const isPublicSiteAsset =
    asset &&
    asset.status === MediaStatus.APPROVED &&
    (asset.purpose === MediaPurpose.SITE_LOGO || asset.purpose === MediaPurpose.SITE_FAVICON);

  if (!asset || !isPublicSiteAsset) {
    return new Response(null, { status: 404 });
  }

  try {
    const bytes = await readMediaObject(asset.storageKey);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": asset.mimeType,
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
