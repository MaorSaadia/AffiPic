import { notFound } from "next/navigation";
import {
  getPublicProduct,
  getPublicCatalog,
} from "@/lib/server/public-websites";
import { DesignRenderer } from "@/components/designer/design-renderer";
import { detailMetadata } from "@/lib/public/theme-metadata";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ siteSlug: string; id: string }> };
export async function generateMetadata({ params }: Props) {
  const { siteSlug, id } = await params;
  const result = await getPublicProduct(siteSlug, id);
  return result
    ? detailMetadata(
        result.website,
        result.product.name,
        result.product.description,
        `/s/${siteSlug}/products/${id}`,
      )
    : { title: "Product not found", robots: { index: false, follow: false } };
}
export default async function Page({ params }: Props) {
  const { siteSlug, id } = await params;
  const result = await getPublicProduct(siteSlug, id);
  if (!result) notFound();
  const catalog = await getPublicCatalog(
    result.website.id,
    1,
    result.product.category_id ?? "",
  );
  return (
    <DesignRenderer
      {...catalog}
      website={result.website}
      design={result.website.design!}
      selectedProducts={[]}
      detailProduct={result.product}
      page={1}
      category=""
    />
  );
}
