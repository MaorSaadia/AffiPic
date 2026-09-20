import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/server/supabase/client";
import { getSupabaseConfig } from "@/lib/auth/config";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  let destination = "/auth/error";
  if (
    getSupabaseConfig() &&
    token &&
    token.length <= 2048 &&
    (type === "signup" || type === "recovery")
  ) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type,
      });
      if (!error)
        destination = type === "recovery" ? "/reset-password" : "/dashboard";
    } catch {
      /* No token or provider details are exposed in the redirect. */
    }
  }
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
