import "server-only";
import { requireUser } from "@/lib/server/auth";
import { getWebsite } from "@/lib/server/websites";
import type { CatalogKind, CatalogItem } from "@/lib/catalog/schema";
export async function getCatalog(kind: CatalogKind): Promise<CatalogItem[]> {
  const { supabase } = await requireUser();
  const website = await getWebsite();
  if (!website) return [];
  const { data, error } = await supabase
    .from(kind)
    .select("id, name")
    .eq("website_id", website.id)
    .order("name")
    .order("id");
  if (error)
    throw new Error(
      "Your categories or merchants could not be loaded. Check the migration and connection.",
    );
  return data;
}
