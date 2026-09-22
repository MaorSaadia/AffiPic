import "server-only";
import { requireUser } from "@/lib/server/auth";
import { getWebsite } from "@/lib/server/websites";
import { designSchema, type DesignRecord } from "@/lib/designer/schema";

export async function getOwnedDesign() {
  const { supabase } = await requireUser();
  const website = await getWebsite();
  if (!website) return null;
  const { data, error } = await supabase
    .from("website_designs")
    .select("draft,published,revision")
    .eq("website_id", website.id)
    .single();
  if (error)
    throw new Error(
      "Design could not be loaded. Check the designer migration and connection.",
    );
  return {
    website,
    record: {
      draft: designSchema.parse(data.draft),
      published: data.published ? designSchema.parse(data.published) : null,
      revision: data.revision,
    } as DesignRecord,
  };
}
