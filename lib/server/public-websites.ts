import "server-only";
import { designSchema } from "@/lib/designer/schema";
import { cache } from "react";
import { createPublicClient } from "@/lib/server/supabase/public-client";
import { websiteSchema } from "@/lib/websites/schema";
import {
  PUBLIC_PAGE_SIZE,
  type PublicWebsite,
  type PublicProduct,
} from "@/lib/public/schema";
export const getPublicWebsite = cache(
  async (slug: string): Promise<PublicWebsite | null> => {
    if (
      !websiteSchema.shape.slug.safeParse(slug).success ||
      slug !== slug.toLowerCase()
    )
      return null;
    const client = createPublicClient();
    if (!client) return null;
    const { data, error } = await client
      .from("websites")
      .select("id,name,slug,description,status")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error("The public website could not be loaded.");
    if (!data) return null;
    const branding = await client
      .from("website_designs")
      .select("published")
      .eq("website_id", data.id)
      .maybeSingle();
    if (branding.error)
      throw new Error("The website branding could not be loaded.");
    if (!branding.data?.published)
      throw new Error("The published design is unavailable.");
    const design = designSchema.parse(branding.data.published);
    return { ...data, branding: design.settings, design } as PublicWebsite;
  },
);
export async function getPublicCatalog(
  websiteId: string,
  page: number,
  category: string,
) {
  const client = createPublicClient();
  if (!client) throw new Error("Public website connection is unavailable.");
  let query = client
    .from("products")
    .select(
      "id,name,description,affiliate_url,category_id,merchant_id,image_path",
      { count: "exact" },
    )
    .eq("website_id", websiteId);
  if (category) query = query.eq("category_id", category);
  const [products, categories, merchants] = await Promise.all([
    query
      .order("created_at", { ascending: false })
      .order("id")
      .range((page - 1) * PUBLIC_PAGE_SIZE, page * PUBLIC_PAGE_SIZE - 1),
    client
      .from("categories")
      .select("id,name")
      .eq("website_id", websiteId)
      .order("name"),
    client
      .from("merchants")
      .select("id,name")
      .eq("website_id", websiteId)
      .order("name"),
  ]);
  if (products.error || categories.error || merchants.error)
    throw new Error("The public catalog could not be loaded.");
  return {
    products: products.data as PublicProduct[],
    categories: categories.data,
    merchants: merchants.data,
    count: products.count ?? 0,
  };
}
