import "server-only";
import { cache } from "react";
import { requireUser } from "@/lib/server/auth";
import type { Website } from "@/lib/websites/schema";
export const websiteColumns =
  "id, name, slug, description, status, created_at, updated_at";
export const getWebsite = cache(async (): Promise<Website | null> => {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("websites")
    .select(websiteColumns)
    .eq("account_id", user.id)
    .maybeSingle();
  // A missing migration or network failure is not an empty account.
  if (error)
    throw new Error(
      "Your website could not be loaded. Verify the website migration and connection.",
    );
  return data as Website | null;
});
