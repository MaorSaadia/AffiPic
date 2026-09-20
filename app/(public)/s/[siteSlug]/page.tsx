import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  getPublicWebsite,
  getPublicCatalog,
} from "@/lib/server/public-websites";
import { Storefront } from "@/components/public/storefront";
import { getSiteOrigin } from "@/lib/auth/config";
import { publicPageNumber, storefrontHref } from "@/lib/public/schema";
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
  return (
    <Storefront
      website={website}
      {...catalog}
      page={page}
      category={category}
    />
  );
}
