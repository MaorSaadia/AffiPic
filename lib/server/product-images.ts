import "server-only";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/products/schema";
export const PRODUCT_BUCKET = "product-images";
export async function prepareProductImage(file: File): Promise<Buffer> {
  if (file.size > MAX_IMAGE_BYTES || file.size === 0)
    throw new Error("Choose an image up to 2 MB.");
  if (!IMAGE_TYPES.includes(file.type))
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const options = {
      limitInputPixels: 25_000_000,
      failOn: "warning" as const,
    };
    const metadata = await sharp(buffer, options).metadata();
    if (
      !["jpeg", "png", "webp"].includes(metadata.format ?? "") ||
      (metadata.pages ?? 1) > 1
    )
      throw new Error("Unsupported image");
    const output = await sharp(buffer, options)
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    if (output.length > MAX_IMAGE_BYTES) throw new Error("Output too large");
    return output;
  } catch {
    throw new Error(
      "This image could not be processed. Choose a valid, still JPEG, PNG, or WebP under 25 megapixels.",
    );
  }
}
export async function removeProductImage(
  supabase: SupabaseClient,
  path: string,
): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(PRODUCT_BUCKET)
      .remove([path]);
    return !error;
  } catch {
    return false;
  }
}
export async function signProductImage(
  supabase: SupabaseClient,
  path: string | null,
) {
  if (!path) return { imageUrl: null };
  try {
    const { data, error } = await supabase.storage
      .from(PRODUCT_BUCKET)
      .createSignedUrl(path, 3600);
    return {
      imageUrl: data?.signedUrl ?? null,
      imageError: !!error || !data?.signedUrl,
    };
  } catch {
    return { imageUrl: null, imageError: true };
  }
}
