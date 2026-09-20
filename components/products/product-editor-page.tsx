import Link from "next/link";
import { PageHeading } from "@/components/dashboard/page-heading";
import { ProductForm } from "@/components/products/product-form";
import { getWebsite } from "@/lib/server/websites";
import { getCatalog } from "@/lib/server/catalog";
import { saveProduct } from "@/app/(dashboard)/dashboard/products/actions";
import type { ProductView } from "@/lib/products/schema";
export async function ProductEditorPage({
  product = null,
}: {
  product?: ProductView | null;
}) {
  const website = await getWebsite();
  const [categories, merchants] = website
    ? await Promise.all([getCatalog("categories"), getCatalog("merchants")])
    : [[], []];
  return (
    <>
      <PageHeading
        eyebrow="YOUR CURATED FINDS"
        title="Products"
        description="Bring your recommendations together, one great find at a time."
      />
      {website ? (
        <ProductForm
          product={product}
          categories={categories}
          merchants={merchants}
          action={saveProduct}
        />
      ) : (
        <section className="panel product-editor">
          <h2>Create your website first</h2>
          <p>Your products belong to your website.</p>
          <Link href="/dashboard/settings" className="text-link">
            Set up your website
          </Link>
        </section>
      )}
    </>
  );
}
