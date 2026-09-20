"use server";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/server/auth";
import { prepareProductImage } from "@/lib/server/product-images";
import { LOGO_BUCKET, logoPreview, removeLogo } from "@/lib/server/branding";
import {
  brandingSchema,
  ownerBrandingColumns,
  MAX_LOGO_BYTES,
  type Branding,
  type BrandingState,
} from "@/lib/branding/schema";
export async function saveBranding(
  _previous: BrandingState,
  form: FormData,
): Promise<BrandingState> {
  const { supabase, user } = await requireUser();
  const parsed = brandingSchema.safeParse(
    Object.fromEntries(
      [
        "accent_color",
        "background",
        "heading_font",
        "hero_title",
        "hero_subtitle",
      ].map((key) => [key, form.get(key)]),
    ),
  );
  const revision = z.coerce
    .number()
    .int()
    .min(0)
    .safeParse(form.get("revision"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!revision.success)
    return { error: "Invalid branding version. Reload and try again." };
  try {
    const owned = await supabase
      .from("websites")
      .select("id,slug")
      .eq("account_id", user.id)
      .maybeSingle();
    if (owned.error) return { error: "Your website could not be loaded." };
    if (!owned.data) return { error: "Create your website first." };
    const website = owned.data;
    const previous = await supabase
      .from("website_branding")
      .select(ownerBrandingColumns)
      .eq("website_id", website.id)
      .maybeSingle();
    if (previous.error) return { error: "Your branding could not be loaded." };
    const existing = previous.data as Branding | null;
    if ((existing?.revision ?? 0) !== revision.data)
      return {
        error: "Branding changed in another tab. Reload before saving.",
      };
    let path =
      form.get("remove_logo") === "on" ? null : (existing?.logo_path ?? null);
    let uploaded: string | null = null;
    const file = form.get("logo");
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_LOGO_BYTES)
        return { error: "Choose a logo up to 1 MB." };
      let buffer: Buffer;
      try {
        buffer = await sharp(await prepareProductImage(file))
          .resize(512, 512, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer();
      } catch (error) {
        return {
          error:
            error instanceof Error
              ? error.message
              : "This logo could not be processed.",
        };
      }
      uploaded = website.id + "/" + randomUUID() + ".webp";
      const upload = await supabase.storage
        .from(LOGO_BUCKET)
        .upload(uploaded, buffer, {
          contentType: "image/webp",
          upsert: false,
          cacheControl: "3600",
        });
      if (upload.error)
        return {
          error: "The logo upload failed. Your saved branding was not changed.",
        };
      path = uploaded;
    }
    const values = { ...parsed.data, logo_path: path };
    const query = existing
      ? supabase
          .from("website_branding")
          .update(values)
          .eq("website_id", website.id)
          .eq("revision", revision.data)
      : supabase
          .from("website_branding")
          .insert({ ...values, website_id: website.id });
    const { data, error } = await query
      .select(ownerBrandingColumns)
      .maybeSingle();
    if (error || !data) {
      if (uploaded && (!error || /^23|^42/.test(error.code ?? "")))
        await removeLogo(supabase, uploaded);
      return {
        error:
          "Saving could not be confirmed. Reload to check your branding before trying again.",
      };
    }
    const cleaned =
      !existing?.logo_path ||
      existing.logo_path === path ||
      (await removeLogo(supabase, existing.logo_path));
    revalidatePath("/dashboard", "layout");
    revalidatePath("/s/" + website.slug);
    return {
      branding: {
        ...(data as Branding),
        ...(await logoPreview(supabase, path)),
      },
      success: "Branding saved.",
      ...(!cleaned
        ? {
            warning:
              "Branding is saved, but the previous logo needs storage cleanup.",
          }
        : {}),
    };
  } catch {
    return {
      error:
        "The connection was interrupted. Reload to check whether your changes saved before trying again.",
    };
  }
}
