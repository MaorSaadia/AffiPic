import "server-only";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  prepareProductImage,
  PRODUCT_BUCKET,
} from "@/lib/server/product-images";
import { MAX_IMAGE_BYTES } from "@/lib/products/schema";
export async function writingImage(
  supabase: SupabaseClient,
  websiteId: string,
  ownedPath: string | null,
  upload?: FormData,
) {
  let file = upload?.get("image");
  if (!(file instanceof File) || file.size === 0) {
    // Path is read from an owned product on the server, never from the request.
    if (
      !ownedPath ||
      !ownedPath.startsWith(websiteId + "/") ||
      ownedPath.includes("..")
    )
      throw new Error(
        "No owned image is available. Select an image or turn image assistance off.",
      );
    const { data, error } = await supabase.storage
      .from(PRODUCT_BUCKET)
      .download(ownedPath);
    if (error || !data || data.size > MAX_IMAGE_BYTES)
      throw new Error(
        "The saved image could not be loaded. Select it again or continue with text only.",
      );
    file = new File([data], "owned.webp", { type: data.type || "image/webp" });
  }
  const validated = await prepareProductImage(file);
  const compressed = await sharp(validated)
    .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer();
  if (compressed.length > MAX_IMAGE_BYTES)
    throw new Error("The image is too large for AI. Choose a smaller image.");
  // In-memory only: no temporary storage or provider Files API upload to clean up.
  return { mimeType: "image/webp", data: compressed.toString("base64") };
}
