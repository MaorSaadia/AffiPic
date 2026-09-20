"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/server/auth";
import type { PublicationState } from "@/lib/publishing/schema";
export async function setPublication(
  _previous: PublicationState,
  form: FormData,
): Promise<PublicationState> {
  const { supabase, user } = await requireUser();
  const target = z.enum(["draft", "published"]).safeParse(form.get("status"));
  const expected = z
    .enum(["draft", "published"])
    .safeParse(form.get("expected_status"));
  if (
    !target.success ||
    !expected.success ||
    target.data === expected.data ||
    form.get("confirm") !== "on"
  )
    return { error: "Confirm the publication change and try again." };
  try {
    const owned = await supabase
      .from("websites")
      .select("id,slug,status")
      .eq("account_id", user.id)
      .maybeSingle();
    if (owned.error)
      return { error: "Your website could not be loaded. Try again." };
    if (!owned.data) return { error: "Create your website first." };
    if (owned.data.status !== expected.data)
      return {
        error: "Publication changed in another tab. Reload before continuing.",
      };
    const { data, error } = await supabase
      .from("websites")
      .update({ status: target.data })
      .eq("id", owned.data.id)
      .eq("account_id", user.id)
      .eq("status", expected.data)
      .select("status")
      .maybeSingle();
    if (error?.code === "23514")
      return { error: "Add at least one product before publishing." };
    if (error || !data)
      return {
        error:
          "The change could not be confirmed. Reload to check the current status.",
      };
    revalidatePath("/dashboard", "layout");
    revalidatePath("/s/" + owned.data.slug);
    return {
      status: target.data,
      success:
        target.data === "published"
          ? "Your website is published."
          : "Your website is unpublished. New visitors can no longer open it.",
    };
  } catch {
    return {
      error:
        "The connection was interrupted. Reload to check the current status before trying again.",
    };
  }
}
