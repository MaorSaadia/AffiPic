import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/auth/config";

export function writingConfig() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabase = getSupabaseConfig();
  if (
    process.env.AI_WRITING_ENABLED !== "true" ||
    !apiKey ||
    !serviceKey ||
    !supabase ||
    /REPLACE|YOUR_/i.test(apiKey + serviceKey) ||
    !/^gemini-[a-z0-9.-]{1,90}$/.test(model)
  )
    return null;
  return { apiKey, model, serviceKey, url: supabase.url };
}
export function writingDatabase(
  config: NonNullable<ReturnType<typeof writingConfig>>,
) {
  // Dedicated server-only client: never persisted, never given session cookies.
  return createClient(config.url, config.serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
