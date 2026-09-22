import { StorefrontIdentity } from "@/components/public/storefront-identity";
import { brandingStyles } from "@/lib/branding/schema";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PublicProductImage } from "@/components/public/product-image";
import {
  storefrontHref,
  PUBLIC_PAGE_SIZE,
  type PublicProduct,
  type PublicWebsite,
} from "@/lib/public/schema";
import type { CatalogItem } from "@/lib/catalog/schema";
export function Storefront({
  website,
  products,
  categories,
  merchants,
  count,
  page,
  category,
}: {
  website: PublicWebsite;
  products: PublicProduct[];
  categories: CatalogItem[];
  merchants: CatalogItem[];
  count: number;
  page: number;
  category: string;
}) {
  return (
    <div
      className="storefront-surface"
      style={brandingStyles(website.branding)}
    >
      <div className="storefront">
        <a href="#finds" className="storefront-skip">
          Skip to products
        </a>
        <StorefrontIdentity
          website={website}
          logoUrl={
            website.branding?.logo_path ? "/s/" + website.slug + "/logo" : null
          }
        />
        <main>
          <p className="storefront-disclosure">
            This website includes affiliate links. Its creator may earn a
            commission when you buy through these links. Purchases take place on
            the merchant’s website.
          </p>
          <StorefrontCatalog
            website={website}
            products={products}
            categories={categories}
            merchants={merchants}
            count={count}
            page={page}
            category={category}
          />
        </main>
        <footer className="storefront-footer">
          <span>{website.name}</span>
          <span>Made with AffiPic</span>
        </footer>
      </div>
    </div>
  );
}

export type CatalogProps = {
  website: PublicWebsite;
  products: PublicProduct[];
  categories: CatalogItem[];
  merchants: CatalogItem[];
  count: number;
  page: number;
  category: string;
  imageUrls?: Record<string, string>;
  title?: string;
  anchor?: string;
};
export function StorefrontCatalog({
  website,
  products,
  categories,
  merchants,
  count,
  page,
  category,
  imageUrls,
  title,
  anchor = "finds",
}: CatalogProps) {
  return (
    <section
      id={anchor}
      className="storefront-catalog"
      aria-labelledby={anchor + "-title"}
    >
      <div className="storefront-section-heading">
        <h2 id={anchor + "-title"}>{title || "Discover the collection"}</h2>
        <p>
          {count} {count === 1 ? "find" : "finds"}
        </p>
      </div>
      <nav className="storefront-categories" aria-label="Product categories">
        <Link
          href={storefrontHref(website.slug)}
          aria-current={!category ? "page" : undefined}
        >
          All finds
        </Link>
        {categories.map((item) => (
          <Link
            key={item.id}
            href={storefrontHref(website.slug, 1, item.id)}
            aria-current={category === item.id ? "page" : undefined}
          >
            {item.name}
          </Link>
        ))}
      </nav>
      {products.length ? (
        <ul className="storefront-products">
          {products.map((product) => {
            const merchant = merchants.find(
              (item) => item.id === product.merchant_id,
            )?.name;
            const categoryName = categories.find(
              (item) => item.id === product.category_id,
            )?.name;
            // Defense in depth for legacy data written outside the validated editor.
            const safeLink = /^https?:\/\//i.test(product.affiliate_url);
            return (
              <li key={product.id} className="storefront-card">
                <PublicProductImage
                  key={product.image_path}
                  src={
                    imageUrls?.[product.id] ??
                    (product.image_path
                      ? "/s/" + website.slug + "/images/" + product.id
                      : null)
                  }
                  alt={product.name}
                />
                <div className="storefront-card-copy">
                  {categoryName && (
                    <p className="storefront-tag">{categoryName}</p>
                  )}
                  <h3>{product.name}</h3>
                  {merchant && (
                    <p className="storefront-merchant">From {merchant}</p>
                  )}
                  {product.description && (
                    <details>
                      <summary>About this find</summary>
                      <p>{product.description}</p>
                    </details>
                  )}
                  {safeLink && (
                    <a
                      href={product.affiliate_url}
                      target="_blank"
                      rel="sponsored noopener noreferrer"
                      className="storefront-shop"
                    >
                      Shop
                      {merchant ? " at " + merchant : " with merchant"}
                      <ArrowUpRight size={16} aria-hidden="true" />
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="storefront-empty">
          <h3>
            {category
              ? "No finds in this category yet."
              : "More good finds are on the way."}
          </h3>
          <p>Check back soon for new recommendations.</p>
          {(category || page > 1) && (
            <Link href={storefrontHref(website.slug)}>See all finds</Link>
          )}
        </div>
      )}
      {(page > 1 || count > PUBLIC_PAGE_SIZE) && (
        <nav className="storefront-pagination" aria-label="Product pages">
          {page > 1 && (
            <Link href={storefrontHref(website.slug, page - 1, category)}>
              Previous
            </Link>
          )}
          <span>Page {page}</span>
          {page * PUBLIC_PAGE_SIZE < count && (
            <Link href={storefrontHref(website.slug, page + 1, category)}>
              Next
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}
