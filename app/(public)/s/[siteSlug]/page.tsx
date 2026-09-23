import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  getPublicWebsite,
  getPublicCatalog,
} from "@/lib/server/public-websites";
import { DesignRenderer } from "@/components/designer/design-renderer";
import { createPublicClient } from "@/lib/server/supabase/public-client";
import { getSiteOrigin } from "@/lib/auth/config";
import { publicPageNumber, storefrontHref } from "@/lib/public/schema";
import { themeIcons } from "@/lib/public/theme-metadata";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ siteSlug: string }>;
  searchParams: Promise<{ page?: string; category?: string }>;
};
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const website = await getPublicWebsite((await params).siteSlug);
  if (!website)
    return {
      title: { absolute: "Website not found" },
      robots: { index: false, follow: false },
    };
  const query = await searchParams;
  const origin = getSiteOrigin();
  const path = storefrontHref(
    website.slug,
    publicPageNumber(query.page),
    z.uuid().safeParse(query.category).success ? query.category : "",
  );
  return {
    title: { absolute: website.name },
    icons: themeIcons(website),
    description:
      website.description ||
      "Discover thoughtfully chosen products from " + website.name + ".",
    robots: { index: true, follow: true },
    ...(origin
      ? {
          alternates: { canonical: origin + path },
          openGraph: {
            type: "website",
            title: website.name,
            description: website.description,
            url: origin + path,
          },
        }
      : {}),
  };
}
export default async function Page({ params, searchParams }: Props) {
  const { siteSlug } = await params;
  const website = await getPublicWebsite(siteSlug);
  if (!website) notFound();
  const query = await searchParams;
  const page = publicPageNumber(query.page);
  const category = z.uuid().safeParse(query.category).success
    ? query.category!
    : "";
  const catalog = await getPublicCatalog(website.id, page, category);
  const ids = [
    ...new Set(
      website
        .design!.templates.home.filter(
          (s) => !s.hidden && s.type === "products",
        )
        .flatMap((s) => s.settings.product_ids),
    ),
  ];
  const featured = ids.length
    ? await createPublicClient()!
        .from("products")
        .select(
          "id,name,description,affiliate_url,category_id,merchant_id,image_path",
        )
        .eq("website_id", website.id)
        .in("id", ids)
    : { data: [], error: null };
  if (featured.error) throw new Error("Featured products could not be loaded.");
  return (
    <DesignRenderer
      design={website.design!}
      selectedProducts={featured.data ?? []}
      website={website}
      {...catalog}
      page={page}
      category={category}
    />
  );
}
