import Link from "next/link";
import { PageHeading } from "@/components/dashboard/page-heading";
import { CatalogManager } from "@/components/catalog/catalog-manager";
import { getWebsite } from "@/lib/server/websites";
import { getCatalog } from "@/lib/server/catalog";
import { saveCatalog } from "@/app/(dashboard)/dashboard/catalog-actions";
import type { CatalogKind } from "@/lib/catalog/schema";
export async function CatalogPage({ kind }: { kind: CatalogKind }) {
  const website = await getWebsite();
  const items = website ? await getCatalog(kind) : [];
  return (
    <>
      <PageHeading
        eyebrow="YOUR WEBSITE CATALOG"
        title={kind === "categories" ? "Categories" : "Merchants"}
        description={
          kind === "categories"
            ? "Give your recommendations a place to belong."
            : "Manage the stores behind your recommendations. Shoppers buy on their websites."
        }
      />
      {website ? (
        <CatalogManager kind={kind} items={items} action={saveCatalog} />
      ) : (
        <section className="panel catalog-create">
          <h2>Create your website first</h2>
          <p className="catalog-help">Your {kind} belong to your website.</p>
          <Link href="/dashboard/settings" className="text-link">
            Set up your website
          </Link>
        </section>
      )}
    </>
  );
}
