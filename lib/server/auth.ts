import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSupabaseConfig } from "@/lib/auth/config";
import { createClient } from "@/lib/server/supabase/client";

// React cache deduplicates within a render, never between accounts/requests.
export const requireUser = cache(async () => {
  if (!getSupabaseConfig()) redirect("/login");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (
    error ||
    !data.user ||
    !data.user.email_confirmed_at ||
    data.user.is_anonymous
  )
    redirect("/login");
  return { supabase, user: data.user };
});

export const getAccount = cache(async () => {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("accounts")
    .select("id, display_name, created_at")
    .eq("id", user.id)
    .single();
  if (error || !data)
    throw new Error(
      "Your account could not be loaded. Check the account migration and try again.",
    );
  return {
    id: user.id,
    email: user.email ?? "",
    displayName: data.display_name as string,
    createdAt: data.created_at as string,
  };
});
