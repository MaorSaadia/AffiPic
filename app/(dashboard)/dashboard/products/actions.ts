"use server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/server/auth";
import {
  productSchema,
  type Product,
  type ProductState,
} from "@/lib/products/schema";
import { productColumns } from "@/lib/server/products";
import {
  prepareProductImage,
  PRODUCT_BUCKET,
  removeProductImage,
  signProductImage,
} from "@/lib/server/product-images";

export async function saveProduct(
  _previous: ProductState,
  form: FormData,
): Promise<ProductState> {
  const { supabase, user } = await requireUser();
  const operation = z
    .enum(["create", "update", "delete"])
    .safeParse(form.get("operation"));
  if (!operation.success)
    return { error: "Invalid operation. Reload and try again." };
  const id = z.uuid().safeParse(form.get("id"));
  const revision = z.coerce
    .number()
    .int()
    .positive()
    .safeParse(form.get("revision"));
  if (operation.data !== "create" && (!id.success || !revision.success))
    return { error: "Invalid product. Reload and try again." };
  const parsed = productSchema.safeParse(
    Object.fromEntries(
      [
        "name",
        "description",
        "affiliate_url",
        "category_id",
        "merchant_id",
      ].map((key) => [key, form.get(key)]),
    ),
  );
  if (operation.data !== "delete" && !parsed.success)
    return { error: parsed.error.issues[0].message };
  let uploaded: string | null = null;
  try {
    const owned = await supabase
      .from("websites")
      .select("id")
      .eq("account_id", user.id)
      .maybeSingle();
    if (owned.error)
      return { error: "Your website could not be loaded. Please try again." };
    if (!owned.data)
      return { error: "Create your website in Website Settings first." };
    const websiteId = owned.data.id as string;
    let existing: Product | null = null;
    if (operation.data !== "create") {
      const result = await supabase
        .from("products")
        .select(productColumns)
        .eq("website_id", websiteId)
        .eq("id", id.data!)
        .maybeSingle();
      if (result.error)
        return { error: "This product could not be loaded. Try again." };
      existing = result.data as Product | null;
      if (!existing)
        return { error: "This product no longer exists or is unavailable." };
      if (existing.revision !== revision.data)
        return {
          error: "This product changed in another tab. Reload before saving.",
        };
    }
    if (operation.data === "delete") {
      const { data, error } = await supabase
        .from("products")
        .delete()
        .eq("website_id", websiteId)
        .eq("id", id.data!)
        .eq("revision", revision.data!)
        .select("id")
        .maybeSingle();
      if (error || !data)
        return {
          error: "Deletion could not be confirmed. Reload before trying again.",
        };
      const cleaned =
        !existing!.image_path ||
        (await removeProductImage(supabase, existing!.image_path));
      revalidatePath("/dashboard", "layout");
      return {
        deleted: true,
        success: "Product deleted.",
        ...(!cleaned
          ? {
              warning:
                "The product was deleted, but its unused image could not be removed. Storage cleanup is still needed.",
            }
          : {}),
      };
    }
    // Verify each selected relationship independently of the form and database FK.
    for (const [table, key] of [
      ["categories", "category_id"],
      ["merchants", "merchant_id"],
    ] as const) {
      const relatedId = parsed.data![key];
      if (!relatedId) continue;
      const related = await supabase
        .from(table)
        .select("id")
        .eq("website_id", websiteId)
        .eq("id", relatedId)
        .maybeSingle();
      if (related.error || !related.data)
        return {
          error:
            "The selected category or merchant is unavailable. Reload and choose again.",
        };
    }
    let imagePath =
      form.get("remove_image") === "on" ? null : (existing?.image_path ?? null);
    const file = form.get("image");
    if (file instanceof File && file.size > 0) {
      let buffer: Buffer;
      try {
        buffer = await prepareProductImage(file);
      } catch (error) {
        return { error: (error as Error).message };
      }
      uploaded = websiteId + "/" + randomUUID() + ".webp";
      const result = await supabase.storage
        .from(PRODUCT_BUCKET)
        .upload(uploaded, buffer, {
          contentType: "image/webp",
          upsert: false,
          cacheControl: "3600",
        });
      if (result.error)
        return {
          error:
            "The image upload failed. Your product was not changed. Please try again.",
        };
      imagePath = uploaded;
    }
    const values = { ...parsed.data!, image_path: imagePath };
    const query = existing
      ? supabase
          .from("products")
          .update(values)
          .eq("website_id", websiteId)
          .eq("id", existing.id)
          .eq("revision", revision.data!)
      : supabase.from("products").insert({ ...values, website_id: websiteId });
    const { data, error } = await query.select(productColumns).maybeSingle();
    if (error || !data) {
      // Only confirmed database rejections/no-match are safe to compensate.
      // Network/unknown outcomes may have committed: preserve the image for reconciliation.
      if (uploaded && (!error || /^23|^42/.test(error.code ?? "")))
        await removeProductImage(supabase, uploaded);
      return {
        error:
          error?.code === "23503"
            ? "The category or merchant was removed. Reload and choose again."
            : "Saving could not be confirmed. Reload before trying again; your inputs are still here.",
      };
    }
    const cleaned =
      !existing?.image_path ||
      existing.image_path === imagePath ||
      (await removeProductImage(supabase, existing.image_path));
    revalidatePath("/dashboard", "layout");
    return {
      product: {
        ...data,
        ...(await signProductImage(supabase, imagePath)),
      } as ProductState["product"],
      success: "Product saved.",
      ...(!cleaned
        ? {
            warning:
              "Your product is saved, but the previous image needs storage cleanup.",
          }
        : {}),
    };
  } catch {
    return {
      error:
        "The connection was interrupted. Reload to check whether your change saved before trying again.",
    };
  }
}
