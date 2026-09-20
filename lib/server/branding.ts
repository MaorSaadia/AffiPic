import "server-only";
import { requireUser } from "@/lib/server/auth";
import { getWebsite } from "@/lib/server/websites";
import {
  ownerBrandingColumns,
  defaultBranding,
  type Branding,
  type BrandingView,
} from "@/lib/branding/schema";
import type { SupabaseClient } from "@supabase/supabase-js";
export const LOGO_BUCKET = "website-logos";
export async function logoPreview(client: SupabaseClient, path: string | null) {
  if (!path) return { logoUrl: null };
  try {
    const { data, error } = await client.storage
      .from(LOGO_BUCKET)
      .createSignedUrl(path, 3600);
    return {
      logoUrl: data?.signedUrl ?? null,
      logoError: !!error || !data?.signedUrl,
    };
  } catch {
    return { logoUrl: null, logoError: true };
  }
}
export async function removeLogo(client: SupabaseClient, path: string) {
  try {
    const { error } = await client.storage.from(LOGO_BUCKET).remove([path]);
    return !error;
  } catch {
    return false;
  }
}
export async function getBranding(): Promise<BrandingView> {
  const { supabase } = await requireUser();
  const website = await getWebsite();
  const defaults = {
    ...defaultBranding,
    logo_path: null,
    revision: 0,
    logoUrl: null,
  };
  if (!website) return defaults;
  const { data, error } = await supabase
    .from("website_branding")
    .select(ownerBrandingColumns)
    .eq("website_id", website.id)
    .maybeSingle();
  if (error)
    throw new Error(
      "Your branding could not be loaded. Check the branding migration and connection.",
    );
  if (!data) return defaults;
  return {
    ...(data as Branding),
    ...(await logoPreview(supabase, data.logo_path)),
  };
}
