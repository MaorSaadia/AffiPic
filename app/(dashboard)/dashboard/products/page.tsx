import type { Metadata } from "next";
import { Package, ImagePlus, Link2, Heart } from "lucide-react";
import { PageHeading } from "@/components/dashboard/page-heading";
import { ProductPreview } from "@/components/products/product-preview";
export const metadata: Metadata = { title: "Products" };
export default function Products() {
  return (
    <>
      <PageHeading
        eyebrow="YOUR CURATED FINDS"
        title="Products"
        description="A home for the products you love and the links you want to share."
        action={<ProductPreview />}
      />
      <section className="panel catalog-panel">
        <div className="catalog-toolbar">
          <h2>
            Your catalog <span className="count-badge">0</span>
          </h2>
          <span className="muted-label">Ready for your first find</span>
        </div>
        <div className="empty-state">
          <div className="empty-art" aria-hidden="true">
            <span className="empty-art-small">
              <ImagePlus size={22} />
            </span>
            <span className="empty-art-main">
              <Package size={42} strokeWidth={1.3} />
            </span>
            <span className="empty-art-small">
              <Heart size={20} />
            </span>
          </div>
          <span className="eyebrow">GREAT PICKS START WITH YOU</span>
          <h2>Your next favorite find belongs here.</h2>
          <p>
            Bring your recommendations together with images, descriptions, and
            your own affiliate links.
          </p>
          <ProductPreview label="Add your first product" />
          <span className="preview-caption">
            Form preview · Saving is coming in Day 5
          </span>
        </div>
        <div className="catalog-footnote">
          <Link2 size={17} />
          <p>
            Your links, your recommendations. Shoppers purchase directly on the
            merchant’s website.
          </p>
        </div>
      </section>
    </>
  );
}
