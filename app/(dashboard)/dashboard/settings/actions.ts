"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/server/auth";
import { websiteColumns } from "@/lib/server/websites";
import {
  websiteSchema,
  type Website,
  type WebsiteState,
} from "@/lib/websites/schema";

async function saveWebsite(
  form: FormData,
  creating: boolean,
): Promise<WebsiteState> {
  const { supabase, user } = await requireUser();
  const input = {
    name: form.get("name"),
    slug: form.get("slug"),
    description: form.get("description"),
  };
  const parsed = websiteSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: NonNullable<WebsiteState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof typeof fieldErrors;
      if (!fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return {
      error: "Check the highlighted details and try again.",
      fieldErrors,
    };
  }
  try {
    // Ownership is always verified server-side, regardless of any hidden/tampered form fields.
    const existing = await supabase
      .from("websites")
      .select("id")
      .eq("account_id", user.id)
      .maybeSingle();
    if (existing.error)
      return { error: "We couldn’t load your website. Please try again." };
    if (creating && existing.data)
      return {
        error: "You already have a website. Reload this page to edit it.",
      };
    if (!creating && !existing.data)
      return { error: "Create your website before editing its details." };
    const query = creating
      ? supabase.from("websites").insert(parsed.data)
      : supabase
          .from("websites")
          .update(parsed.data)
          .eq("id", existing.data!.id)
          .eq("account_id", user.id);
    const { data, error } = await query.select(websiteColumns).single();
    if (error) {
      if (error.code === "23505")
        return {
          error:
            "That address is unavailable, or a website was already created for your account. Choose another address or reload to see your website.",
        };
      return {
        error:
          "Your website couldn’t be saved. Please try again. Your changes are still in the form.",
      };
    }
    if (!data)
      return {
        error:
          "Your website couldn’t be saved. Reload this page and try again.",
      };
    revalidatePath("/dashboard", "layout");
    return {
      website: data as Website,
      success: creating
        ? "Your website has been created as a private draft."
        : "Your website details have been saved.",
    };
  } catch {
    return {
      error:
        "We couldn’t connect right now. Your changes are still in the form; please try again.",
    };
  }
}
export async function createWebsite(_state: WebsiteState, form: FormData) {
  return saveWebsite(form, true);
}
export async function updateWebsite(_state: WebsiteState, form: FormData) {
  return saveWebsite(form, false);
}
