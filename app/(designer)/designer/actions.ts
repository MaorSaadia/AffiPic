"use server";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/server/auth";
import { getWebsite } from "@/lib/server/websites";
import { prepareProductImage } from "@/lib/server/product-images";
import { designSchema, type DesignResult } from "@/lib/designer/schema";

export async function saveDesign(
  input: unknown,
  revision: number,
  publish: boolean,
): Promise<DesignResult> {
  const { supabase } = await requireUser();
  const parsed = designSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (
    !Number.isSafeInteger(revision) ||
    revision < 1 ||
    typeof publish !== "boolean"
  )
    return { error: "Invalid revision. Reload the designer." };
  try {
    const website = await getWebsite();
    if (!website) return { error: "Create your website first." };
    const { data, error } = await supabase.rpc("save_website_design", {
      config: parsed.data,
      expected_revision: revision,
      publish_now: publish,
    });
    if (error)
      return {
        error:
          error.code === "40001"
            ? "Design changed in another tab. Reload before saving; copy any unsaved text first."
            : error.code === "23514"
              ? "Check image and product selections, and add at least one product before publishing."
              : "Save could not be confirmed. Reload to check the saved design before retrying.",
      };
    revalidatePath("/dashboard", "layout");
    revalidatePath("/designer");
    if (publish) revalidatePath("/s/" + website.slug);
    return { record: data, published: publish };
  } catch {
    return {
      error:
        "Connection interrupted. Reload to check whether your design saved before retrying.",
    };
  }
}
export async function uploadDesignImage(
  form: FormData,
): Promise<{ path?: string; error?: string }> {
  const { supabase } = await requireUser();
  const website = await getWebsite();
  if (!website) return { error: "Create your website first." };
  const file = form.get("image");
  const logo = form.get("kind") === "logo";
  const favicon = form.get("kind") === "favicon";
  if (!(file instanceof File) || !file.size)
    return { error: "Choose an image." };
  try {
    if ((logo || favicon) && file.size > 1024 * 1024)
      return { error: "Choose a logo or favicon up to 1 MB." };
    const decoded = await prepareProductImage(file);
    const buffer =
      logo || favicon
        ? await sharp(decoded)
            .resize(favicon ? 64 : 512, favicon ? 64 : 512, {
              fit: "inside",
              withoutEnlargement: true,
            })
            .webp()
            .toBuffer()
        : decoded;
    const path = website.id + "/" + randomUUID() + ".webp";
    const { error } = await supabase.storage
      .from(logo ? "website-logos" : "design-assets")
      .upload(path, buffer, { contentType: "image/webp", upsert: false });
    if (error)
      return { error: "Image upload failed. Your design has not changed." };
    return { path };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Image upload failed.",
    };
  }
}
