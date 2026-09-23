import { notFound } from "next/navigation";
import { z } from "zod";
import {
  getPublicWebsite,
  getPublicCatalog,
} from "@/lib/server/public-websites";
import { DesignRenderer } from "@/components/designer/design-renderer";
import { publicPageNumber } from "@/lib/public/schema";
import { detailMetadata } from "@/lib/public/theme-metadata";
import { cache } from "react";
type Props = {
  params: Promise<{ siteSlug: string; id: string }>;
  searchParams: Promise<{ page?: string }>;
};
export const dynamic = "force-dynamic";
const load = cache(async (slug: string, id: string, page: number) => {
  if (!z.uuid().safeParse(id).success) return null;
  const website = await getPublicWebsite(slug);
  if (!website || website.design?.theme !== "curated") return null;
  const catalog = await getPublicCatalog(website.id, page, id);
  const category = catalog.categories.find((c) => c.id === id);
  return category ? { website, catalog, category } : null;
});
export async function generateMetadata({ params, searchParams }: Props) {
  const { siteSlug, id } = await params;
  const page = publicPageNumber((await searchParams).page);
  const result = await load(siteSlug, id, page);
  return result
    ? detailMetadata(
        result.website,
        result.category.name,
        `Discover ${result.category.name} from ${result.website.name}.`,
        `/s/${siteSlug}/categories/${id}${page > 1 ? `?page=${page}` : ""}`,
      )
    : { title: "Category not found", robots: { index: false, follow: false } };
}
export default async function Page({ params, searchParams }: Props) {
  const { siteSlug, id } = await params;
  const page = publicPageNumber((await searchParams).page);
  const result = await load(siteSlug, id, page);
  if (!result) notFound();
  return (
    <DesignRenderer
      {...result.catalog}
      design={result.website.design!}
      website={result.website}
      page={page}
      category={id}
      selectedProducts={[]}
    />
  );
}
