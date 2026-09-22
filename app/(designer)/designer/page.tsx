import Link from "next/link";
import { getOwnedDesign } from "@/lib/server/designs";
import { requireUser } from "@/lib/server/auth";
import { Designer } from "@/components/designer/editor";
import { saveDesign, uploadDesignImage } from "./actions";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Website Designer",
  robots: { index: false, follow: false },
};
export default async function Page() {
  const owned = await getOwnedDesign();
  if (!owned)
    return (
      <main style={{ padding: 40 }}>
        <h1>Create a website first</h1>
        <Link href="/dashboard/settings">Open Website Settings</Link>
      </main>
    );
  const { supabase } = await requireUser();
  const [products, categories, merchants] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id,name,description,affiliate_url,category_id,merchant_id,image_path",
      )
      .eq("website_id", owned.website.id)
      .order("created_at", { ascending: false })
      .order("id")
      .limit(1000),
    supabase
      .from("categories")
      .select("id,name")
      .eq("website_id", owned.website.id)
      .order("name"),
    supabase
      .from("merchants")
      .select("id,name")
      .eq("website_id", owned.website.id)
      .order("name"),
  ]);
  if (products.error || categories.error || merchants.error)
    throw new Error("Designer catalog could not be loaded.");
  return (
    <Designer
      {...owned}
      products={products.data}
      categories={categories.data}
      merchants={merchants.data}
      save={saveDesign}
      upload={uploadDesignImage}
    />
  );
}
