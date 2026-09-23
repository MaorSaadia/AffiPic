/* Images use the existing ownership-aware media routes. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { SectionRenderProps } from "@/components/designer/registry";
import type { CatalogProps } from "./storefront";
import { PublicProductImage } from "./product-image";
import type { PublicProduct } from "@/lib/public/schema";

export function productHref(slug: string, id: string) {
  return `/s/${slug}/products/${id}`;
}
export function categoryHref(slug: string, id: string) {
  return `/s/${slug}/categories/${id}`;
}
export function orderedCategories(
  props: Pick<CatalogProps, "categories" | "website">,
) {
  const ids = props.website.design?.settings.category_ids;
  return ids
    ? ids.flatMap((id) => props.categories.filter((c) => c.id === id))
    : props.categories;
}
export function ProductGrid({
  products,
  website,
  merchants,
  categories,
  imageUrls,
}: Pick<
  CatalogProps,
  "products" | "website" | "merchants" | "categories" | "imageUrls"
>) {
  return (
    <ul className="curated-products">
      {products.map((product) => {
        const sample = product.id.startsWith("sample-");
        const merchant = merchants.find((m) => m.id === product.merchant_id);
        const category = categories.find((c) => c.id === product.category_id);
        return (
          <li key={product.id} className="curated-card">
            {product.image_path && (
              <div className="curated-card-media">
                <PublicProductImage
                  src={
                    imageUrls?.[product.id] ??
                    `/s/${website.slug}/images/${product.id}`
                  }
                  alt={product.name}
                />
              </div>
            )}
            <div className="curated-card-copy">
              {category && <p className="curated-kicker">{category.name}</p>}
              <h3>
                {sample ? (
                  product.name
                ) : (
                  <Link href={productHref(website.slug, product.id)}>
                    {product.name}
                  </Link>
                )}
              </h3>
              {merchant && (
                <p className="curated-merchant">
                  Available from {merchant.name}
                </p>
              )}
              {!sample && (
                <Link
                  className="curated-text-link"
                  href={productHref(website.slug, product.id)}
                >
                  View product <span aria-hidden>↗</span>
                </Link>
              )}
              {sample && (
                <p className="curated-merchant">
                  Sample content · preview only
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
export function CuratedSection(props: SectionRenderProps) {
  const { section, website, assetUrl } = props;
  const s = section.settings;
  const target = website.design?.templates.home.find(
    (x) =>
      !x.hidden &&
      x.type === (s.cta_target ?? "catalog") &&
      (x.type !== "about" || x.settings.body),
  );
  const ctaAnchor = target
    ? target.type === "catalog"
      ? "finds"
      : target.id
    : "theme-content";
  if (section.type === "hero")
    return (
      <section
        className={
          "curated-hero " +
          (s.image_path ? "has-image" : "text-only") +
          (s.image_position === "left" ? " image-left" : "")
        }
        style={{ textAlign: s.alignment }}
      >
        <div className="curated-container curated-hero-inner">
          <div className="curated-hero-copy">
            {website.design?.settings.topic && (
              <p className="curated-kicker">{website.design.settings.topic}</p>
            )}
            <h1>{s.title || website.name}</h1>
            {(s.body || website.description) && (
              <p className="curated-introduction">
                {s.body || website.description}
              </p>
            )}
            <a className="curated-button" href={"#" + ctaAnchor}>
              {s.cta_label || "Explore the finds"} <span aria-hidden>↗</span>
            </a>
          </div>
          {s.image_path && (
            <ThemeImage
              src={assetUrl(s.image_path)}
              alt={s.alt}
              fit={s.image_fit}
            />
          )}
        </div>
      </section>
    );
  if (section.type === "catalog" || section.type === "products") {
    const products =
      section.type === "catalog"
        ? props.products
        : s.product_ids.flatMap((id) =>
            props.selectedProducts.filter((p) => p.id === id),
          );
    if (!products.length && section.type === "products") return null;
    return (
      <section
        className="curated-section curated-product-section"
        id={section.type === "catalog" ? "finds" : section.id}
      >
        <div className="curated-container">
          <div className="curated-section-heading">
            <div>
              <p className="curated-kicker">
                {section.type === "catalog" ? "The edit" : "Selected for you"}
              </p>
              <h2>
                {s.title ||
                  (section.type === "catalog"
                    ? "Good things, thoughtfully chosen"
                    : "Featured finds")}
              </h2>
            </div>
          </div>
          {products.length ? (
            <ProductGrid {...props} products={products} />
          ) : (
            <p>New finds will appear here soon.</p>
          )}
          {section.type === "catalog" && <Pagination {...props} />}
        </div>
      </section>
    );
  }
  if (section.type === "categories") {
    const categories = orderedCategories(props);
    if (!categories.length) return null;
    return (
      <section className="curated-section" id={section.id}>
        <div className="curated-container">
          <p className="curated-kicker">Explore by category</p>
          <h2>{s.title || "Find your next favorite"}</h2>
          {s.body && <p>{s.body}</p>}
          <div className="curated-categories">
            {categories.map((c, i) => (
              <Link key={c.id} href={categoryHref(website.slug, c.id)}>
                <span className="curated-category-index" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3>{c.name}</h3>
                <span className="curated-text-link">
                  Explore <span aria-hidden>↗</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    );
  }
  if (!s.body && !s.image_path && (section.type === "about" || !s.title))
    return null;
  return (
    <section
      id={section.id}
      className={
        "curated-section curated-story " + (s.image_path ? "has-image" : "")
      }
      style={{ textAlign: s.alignment }}
    >
      <div className="curated-container curated-story-inner">
        {s.image_path && (
          <ThemeImage
            src={assetUrl(s.image_path)}
            alt={s.alt}
            fit={s.image_fit}
          />
        )}
        <div>
          {section.type === "about" && (
            <p className="curated-kicker">Behind the edit</p>
          )}
          {s.title && <h2>{s.title}</h2>}
          {s.body && <p className="curated-prose">{s.body}</p>}
        </div>
      </div>
    </section>
  );
}
export function ThemeImage({
  src,
  alt,
  fit = "cover",
}: {
  src: string;
  alt: string;
  fit?: "cover" | "contain";
}) {
  // Images use ownership-aware, no-store media routes; no third-party assets.
  return (
    <img
      className="curated-theme-image"
      src={src}
      alt={alt}
      style={{ objectFit: fit }}
    />
  );
}
export function Pagination({
  website,
  page,
  count,
  category,
}: Pick<CatalogProps, "website" | "page" | "count" | "category">) {
  const base = category
    ? categoryHref(website.slug, category)
    : `/s/${website.slug}`;
  if (page === 1 && count <= 12) return null;
  return (
    <nav aria-label="Product pages" className="curated-pagination">
      {page > 1 && (
        <Link href={`${base}?page=${page - 1}#finds`}>← Previous</Link>
      )}
      <span>Page {page}</span>
      {page * 12 < count && (
        <Link href={`${base}?page=${page + 1}#finds`}>Next →</Link>
      )}
    </nav>
  );
}
export function ProductDetails(
  props: CatalogProps & { product: PublicProduct },
) {
  const { product, website, imageUrls } = props;
  const category = props.categories.find((c) => c.id === product.category_id);
  const merchant = props.merchants.find((m) => m.id === product.merchant_id);
  return (
    <div className="curated-container curated-detail">
      <nav aria-label="Breadcrumb">
        <Link href={`/s/${website.slug}`}>Home</Link>
        {category && (
          <>
            <span aria-hidden>/</span>
            <Link href={categoryHref(website.slug, category.id)}>
              {category.name}
            </Link>
          </>
        )}
        <span aria-hidden>/</span>
        <span>{product.name}</span>
      </nav>
      <div
        className={
          "curated-detail-grid " + (!product.image_path ? "text-only" : "")
        }
      >
        {product.image_path && (
          <div className="curated-detail-image">
            <PublicProductImage
              src={
                imageUrls?.[product.id] ??
                `/s/${website.slug}/images/${product.id}`
              }
              alt={product.name}
            />
          </div>
        )}
        <div>
          {category && <p className="curated-kicker">{category.name}</p>}
          <h1>{product.name}</h1>
          {product.description && (
            <p className="curated-prose curated-introduction">
              {product.description}
            </p>
          )}
          {/^https?:\/\//i.test(product.affiliate_url) && (
            <a
              className="curated-button"
              href={product.affiliate_url}
              target="_blank"
              rel="sponsored noopener noreferrer"
            >
              Shop {merchant ? `at ${merchant.name}` : "with merchant"}{" "}
              <span aria-hidden>↗</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
          <p className="curated-fine-print">
            Purchases take place on the merchant’s website. Check current price
            and availability there. We may earn a commission through this link.
          </p>
        </div>
      </div>
    </div>
  );
}
