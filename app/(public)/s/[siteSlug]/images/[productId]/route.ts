import { z } from "zod";
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
  { params }: { params: Promise<{ siteSlug: string; productId: string }> },
) {
  const { siteSlug, productId } = await params;
  if (!z.uuid().safeParse(productId).success)
    return new Response(null, { status: 404, headers });
  try {
    const website = await getPublicWebsite(siteSlug);
    const client = createPublicClient();
    if (!website || !client)
      return new Response(null, { status: 404, headers });
    const { data, error } = await client
      .from("products")
      .select("image_path")
      .eq("website_id", website.id)
      .eq("id", productId)
      .maybeSingle();
    if (error) return new Response(null, { status: 503, headers });
    if (!data?.image_path) return new Response(null, { status: 404, headers });
    const image = await client.storage
      .from("product-images")
      .download(data.image_path);
    if (image.error || !image.data)
      return new Response(null, { status: 404, headers });
    return new Response(image.data, {
      headers: { ...headers, "Content-Type": "image/webp" },
    });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
