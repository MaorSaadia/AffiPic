import Link from "next/link";
import { PageHeading } from "@/components/dashboard/page-heading";
import { ProductList } from "@/components/products/product-list";
import { getProducts, PAGE_SIZE } from "@/lib/server/products";
import { getWebsite } from "@/lib/server/websites";
import { getCatalog } from "@/lib/server/catalog";
export const metadata = { title: "Products" };
export default async function Products({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const requested = Number(params.page);
  const page =
    Number.isSafeInteger(requested) && requested > 0 && requested <= 100000
      ? requested
      : 1;
  const website = await getWebsite();
  const [catalog, categories, merchants] = website
    ? await Promise.all([
        getProducts(page),
        getCatalog("categories"),
        getCatalog("merchants"),
      ])
    : [{ products: [], count: 0 }, [], []];
  return (
    <>
      <PageHeading
        eyebrow="YOUR CURATED FINDS"
        title="Products"
        description="A home for the products you love and the links you want to share."
        action={
          website ? (
            <Link className="text-link" href="/dashboard/products/new">
              Add product
            </Link>
          ) : undefined
        }
      />
      {website ? (
        <ProductList
          {...catalog}
          categories={categories}
          merchants={merchants}
          page={page}
          pageSize={PAGE_SIZE}
        />
      ) : (
        <section className="panel product-editor">
          <h2>Create your website first</h2>
          <p>Your products belong to your website.</p>
          <Link className="text-link" href="/dashboard/settings">
            Set up your website
          </Link>
        </section>
      )}
    </>
  );
}
