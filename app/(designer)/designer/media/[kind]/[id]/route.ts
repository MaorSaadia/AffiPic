import { requireUser } from "@/lib/server/auth";
import { getWebsite } from "@/lib/server/websites";
import { z } from "zod";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  const { supabase } = await requireUser();
  const { kind, id } = await params;
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (
    !z.uuid().safeParse(id).success ||
    !["product", "asset", "logo"].includes(kind)
  )
    return new Response(null, { status: 404, headers });
  const website = await getWebsite();
  if (!website) return new Response(null, { status: 404, headers });
  let path = website.id + "/" + id + ".webp";
  if (kind === "product") {
    const { data, error } = await supabase
      .from("products")
      .select("image_path")
      .eq("website_id", website.id)
      .eq("id", id)
      .maybeSingle();
    if (error || !data?.image_path)
      return new Response(null, { status: 404, headers });
    path = data.image_path;
  }
  const { data, error } = await supabase.storage
    .from(
      kind === "product"
        ? "product-images"
        : kind === "logo"
          ? "website-logos"
          : "design-assets",
    )
    .download(path);
  return error || !data
    ? new Response(null, { status: 404, headers })
    : new Response(data, {
        headers: { ...headers, "Content-Type": "image/webp" },
      });
}
