import { getPublicWebsite } from "@/lib/server/public-websites";
import { createPublicClient } from "@/lib/server/supabase/public-client";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ siteSlug: string }> },
) {
  try {
    const website = await getPublicWebsite((await params).siteSlug);
    const client = createPublicClient();
    if (!website?.branding?.logo_path || !client)
      return new Response(null, { status: 404, headers });
    const image = await client.storage
      .from("website-logos")
      .download(website.branding.logo_path);
    if (image.error || !image.data)
      return new Response(null, { status: 404, headers });
    return new Response(image.data, {
      headers: { ...headers, "Content-Type": "image/webp" },
    });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
