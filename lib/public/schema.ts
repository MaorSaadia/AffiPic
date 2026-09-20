export type PublicWebsite = {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: "published";
};
export type PublicProduct = {
  id: string;
  name: string;
  description: string;
  affiliate_url: string;
  category_id: string | null;
  merchant_id: string | null;
  image_path: string | null;
};
export const PUBLIC_PAGE_SIZE = 12;
export function publicPageNumber(value: unknown) {
  const page = typeof value === "string" ? Number(value) : 1;
  return Number.isSafeInteger(page) && page > 0 && page <= 100000 ? page : 1;
}
export function storefrontHref(slug: string, page = 1, category = "") {
  const query = new URLSearchParams();
  if (category) query.set("category", category);
  if (page > 1) query.set("page", String(page));
  return (
    "/s/" +
    encodeURIComponent(slug) +
    (query.size ? "?" + query.toString() : "")
  );
}
