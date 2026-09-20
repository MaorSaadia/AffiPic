"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/server/auth";
import {
  catalogKind,
  catalogName,
  type CatalogState,
} from "@/lib/catalog/schema";
export async function saveCatalog(
  _previous: CatalogState,
  form: FormData,
): Promise<CatalogState> {
  const { supabase, user } = await requireUser();
  const kind = catalogKind.safeParse(form.get("kind"));
  const operation = z
    .enum(["create", "update", "delete"])
    .safeParse(form.get("operation"));
  if (!kind.success || !operation.success)
    return { error: "Invalid request. Reload and try again." };
  const id = z.uuid().safeParse(form.get("id"));
  if (operation.data !== "create" && !id.success)
    return { error: "Invalid item. Reload and try again." };
  const name = catalogName.safeParse(form.get("name"));
  if (operation.data !== "delete" && !name.success)
    return { error: name.error.issues[0].message };
  try {
    const owned = await supabase
      .from("websites")
      .select("id")
      .eq("account_id", user.id)
      .maybeSingle();
    if (owned.error)
      return { error: "Your website could not be loaded. Try again." };
    if (!owned.data)
      return { error: "Create your website in Website Settings first." };
    const table = supabase.from(kind.data);
    const query =
      operation.data === "create"
        ? table.insert({ website_id: owned.data.id, name: name.data! })
        : (operation.data === "update"
            ? table.update({ name: name.data! })
            : table.delete()
          )
            .eq("website_id", owned.data.id)
            .eq("id", id.data!);
    const { data, error } = await query.select("id").maybeSingle();
    if (error?.code === "23505")
      return { error: "That name already exists on your website." };
    if (error?.code === "23503")
      return {
        error:
          "This item is still in use. Remove its connections before deleting it.",
      };
    if (error)
      return { error: "Could not save your change. Please try again." };
    if (!data)
      return {
        error:
          "This item no longer exists or is unavailable. Reload and try again.",
      };
  } catch {
    return {
      error:
        "Could not connect. Your change could not be confirmed. Reload before trying again.",
    };
  }
  revalidatePath("/dashboard", "layout");
  return { success: operation.data === "delete" ? "Deleted." : "Saved." };
}
