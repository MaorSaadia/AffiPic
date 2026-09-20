import "server-only";
import { requireUser } from "@/lib/server/auth";
import { getWebsite } from "@/lib/server/websites";
import { signProductImage } from "@/lib/server/product-images";
import type { Product, ProductView } from "@/lib/products/schema";
export const productColumns =
  "id,name,description,affiliate_url,category_id,merchant_id,image_path,revision,created_at,updated_at";
export const PAGE_SIZE = 20;
export async function getProducts(page = 1) {
  const { supabase } = await requireUser();
  const website = await getWebsite();
  if (!website) return { products: [] as ProductView[], count: 0 };
  const { data, error, count } = await supabase
    .from("products")
    .select(productColumns, { count: "exact" })
    .eq("website_id", website.id)
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error)
    throw new Error(
      "Your products could not be loaded. Check the products migration and connection.",
    );
  const products = await Promise.all(
    (data as Product[]).map(async (product) => ({
      ...product,
      ...(await signProductImage(supabase, product.image_path)),
    })),
  );
  return { products, count: count ?? 0 };
}
export async function getProduct(id: string): Promise<ProductView | null> {
  const { supabase } = await requireUser();
  const website = await getWebsite();
  if (!website) return null;
  const { data, error } = await supabase
    .from("products")
    .select(productColumns)
    .eq("website_id", website.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("This product could not be loaded.");
  return data
    ? ({
        ...data,
        ...(await signProductImage(supabase, data.image_path)),
      } as ProductView)
    : null;
}
export async function hasProducts() {
  const { supabase } = await requireUser();
  const website = await getWebsite();
  if (!website) return false;
  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("website_id", website.id)
    .limit(1);
  if (error) throw new Error("Product setup progress could not be loaded.");
  return data.length > 0;
}
