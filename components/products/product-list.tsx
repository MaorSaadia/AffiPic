/* Images are optimized on upload and served via temporary private URLs. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Package } from "lucide-react";
import type { ProductView } from "@/lib/products/schema";
import type { CatalogItem } from "@/lib/catalog/schema";
export function ProductList({
  products,
  published = false,
  categories,
  merchants,
  count,
  page,
  pageSize,
}: {
  products: ProductView[];
  published?: boolean;
  categories: CatalogItem[];
  merchants: CatalogItem[];
  count: number;
  page: number;
  pageSize: number;
}) {
  return (
    <section className="panel products-panel">
      <div className="catalog-toolbar">
        <h2>
          Your catalog <span className="count-badge">{count}</span>
        </h2>
        <span className="muted-label">
          {published ? "Published website" : "Private draft"}
        </span>
      </div>
      {products.length ? (
        <ul className="product-grid">
          {products.map((product) => (
            <li key={product.id} className="product-card">
              <div className="product-card-image">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    loading="lazy"
                  />
                ) : (
                  <Package size={40} aria-hidden="true" />
                )}
              </div>
              {product.imageError && (
                <p className="field-hint">
                  Image unavailable. Reload to try again.
                </p>
              )}
              <div className="product-card-copy">
                <h3>{product.name}</h3>
                <p>
                  {categories.find((item) => item.id === product.category_id)
                    ?.name ?? "Uncategorized"}{" "}
                  ·{" "}
                  {merchants.find((item) => item.id === product.merchant_id)
                    ?.name ?? "No merchant"}
                </p>
                <p className="product-card-description">
                  {product.description}
                </p>
                <div className="product-form-buttons">
                  <Link
                    href={`/dashboard/products/${product.id}/edit`}
                    className="text-link"
                    aria-label={`Edit ${product.name}`}
                  >
                    Edit product
                  </Link>
                  <a
                    className="text-link"
                    href={product.affiliate_url}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                  >
                    Visit merchant
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">
          <Package size={40} />
          <h2>
            {count
              ? "No products on this page."
              : "Your next favorite find belongs here."}
          </h2>
          <p>Add a recommendation with your own affiliate link and image.</p>
          <Link
            href={count ? "/dashboard/products" : "/dashboard/products/new"}
            className="text-link"
          >
            {count ? "Back to the first page" : "Add your first product"}
          </Link>
        </div>
      )}
      {(page > 1 || count > pageSize) && (
        <nav className="product-pagination" aria-label="Product pages">
          {page > 1 && (
            <Link href={`/dashboard/products?page=${page - 1}`}>Previous</Link>
          )}
          <span>
            Page {page} of {Math.max(1, Math.ceil(count / pageSize))}
          </span>
          {page * pageSize < count && (
            <Link href={`/dashboard/products?page=${page + 1}`}>Next</Link>
          )}
        </nav>
      )}
    </section>
  );
}
