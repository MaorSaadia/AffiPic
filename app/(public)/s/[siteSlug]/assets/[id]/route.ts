import { getPublicWebsite } from "@/lib/server/public-websites";
import { createPublicClient } from "@/lib/server/supabase/public-client";
import { z } from "zod";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ siteSlug: string; id: string }> },
) {
  const headers = {
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  };
  try {
    const { siteSlug, id } = await params;
    if (!z.uuid().safeParse(id).success)
      return new Response(null, { status: 404, headers });
    const website = await getPublicWebsite(siteSlug);
    const client = createPublicClient();
    const path = website?.id + "/" + id + ".webp";
    if (
      !website?.design?.templates.home.some(
        (s) => s.settings.image_path === path,
      ) ||
      !client
    )
      return new Response(null, { status: 404, headers });
    const { data, error } = await client.storage
      .from("design-assets")
      .download(path);
    return error || !data
      ? new Response(null, { status: 404, headers })
      : new Response(data, {
          headers: { ...headers, "Content-Type": "image/webp" },
        });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
