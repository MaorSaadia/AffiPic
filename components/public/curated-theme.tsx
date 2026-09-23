import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "./brand-logo";
import type { DesignRendererProps } from "@/components/designer/design-renderer";
import { sectionRegistry } from "@/components/designer/registry";
import { themeStyles } from "@/lib/designer/theme-settings";
import {
  categoryHref,
  orderedCategories,
  ProductDetails,
  ProductGrid,
  Pagination,
} from "./curated-sections";

export function CuratedTheme({
  design,
  privatePreview,
  wrapSection,
  detailProduct,
  ...catalog
}: DesignRendererProps) {
  const website = {
    ...catalog.website,
    name: design.settings.site_name || catalog.website.name,
    branding: design.settings,
    design,
  };
  const props = { ...catalog, website };
  const wrap =
    wrapSection ??
    ((_id: string, _name: string, children: ReactNode) => children);
  const id = (path: string) => path.split("/")[1].replace(/\.webp$/, "");
  const assetUrl = (path: string) =>
    privatePreview
      ? `/designer/media/asset/${id(path)}`
      : `/s/${website.slug}/assets/${id(path)}`;
  const logoUrl = design.settings.logo_path
    ? privatePreview
      ? `/designer/media/logo/${id(design.settings.logo_path)}`
      : `/s/${website.slug}/logo`
    : null;
  const categories = orderedCategories(props);
  const about = design.templates.home.find(
    (s) => s.type === "about" && !s.hidden && s.settings.body,
  );
  const home = `/s/${website.slug}`;
  const category = catalog.categories.find((c) => c.id === catalog.category);
  return (
    <div
      className="curated-theme"
      data-card-style={design.settings.card_style ?? "soft"}
      style={themeStyles(design.settings)}
    >
      <a className="curated-skip" href="#theme-content">
        Skip to content
      </a>
      {wrap(
        "header",
        "Shared header",
        <header className="curated-header">
          <div className="curated-container curated-header-inner">
            <Link className="curated-brand" href={home}>
              {logoUrl && <BrandLogo key={logoUrl} src={logoUrl} />}
              <span>{website.name}</span>
            </Link>
            <nav aria-label="Website navigation">
              <Link href={`${home}#finds`}>Discover</Link>
              {categories.length > 0 && (
                <details>
                  <summary>Categories</summary>
                  <div>
                    {categories.map((c) => (
                      <Link key={c.id} href={categoryHref(website.slug, c.id)}>
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </details>
              )}
              {about && <Link href={`${home}#${about?.id}`}>About</Link>}
            </nav>
          </div>
        </header>,
      )}
      <main id="theme-content">
        {detailProduct ? (
          <>
            <ProductDetails {...props} product={detailProduct} />
            <section className="curated-section">
              <div className="curated-container">
                {catalog.products.filter((p) => p.id !== detailProduct.id)
                  .length > 0 && (
                  <>
                    <h2>More to discover</h2>
                    <ProductGrid
                      {...props}
                      products={catalog.products
                        .filter((p) => p.id !== detailProduct.id)
                        .slice(0, 4)}
                    />
                  </>
                )}
              </div>
            </section>
          </>
        ) : category ? (
          <>
            <section className="curated-category-hero">
              <div className="curated-container">
                <Link href={home}>← Back to all finds</Link>
                <p className="curated-kicker">Explore the edit</p>
                <h1>{category.name}</h1>
                <p>
                  {catalog.count} {catalog.count === 1 ? "find" : "finds"} to
                  explore
                </p>
              </div>
            </section>
            <section id="finds" className="curated-section">
              <div className="curated-container">
                {catalog.products.length ? (
                  <ProductGrid {...props} />
                ) : (
                  <p>No finds in this category yet.</p>
                )}
                <Pagination {...props} />
              </div>
            </section>
          </>
        ) : (
          <>
            {!design.templates.home.some(
              (s) => s.type === "hero" && !s.hidden,
            ) && (
              <h1 className="curated-container curated-page-title">
                {website.name}
              </h1>
            )}
            {design.templates.home
              .filter((s) => !s.hidden)
              .map((section) => {
                const definition = sectionRegistry[section.type];
                const Component = definition.Component;
                return (
                  <div key={section.id}>
                    {wrap(
                      section.id,
                      definition.name,
                      <Component
                        {...props}
                        section={section}
                        assetUrl={assetUrl}
                      />,
                    )}
                  </div>
                );
              })}
          </>
        )}
      </main>
      {wrap(
        "footer",
        "Shared footer",
        <footer className="curated-footer">
          <div className="curated-container curated-footer-grid">
            <div>
              <Link href={home} className="curated-brand">
                {logoUrl && <BrandLogo key={logoUrl} src={logoUrl} />}
                <span>{website.name}</span>
              </Link>
              {(design.settings.footer_text || website.description) && (
                <p>{design.settings.footer_text ?? website.description}</p>
              )}
              {!!design.settings.social_links?.length && (
                <nav aria-label="Social links" className="curated-socials">
                  {design.settings.social_links
                    .filter((s) => /^https:\/\//i.test(s.url) && s.label)
                    .map((social, i) => (
                      <a
                        key={i}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {social.label}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ))}
                </nav>
              )}
            </div>
            <div>
              <h2>Explore</h2>
              <Link href={`${home}#finds`}>All finds</Link>
              {categories.map((c) => (
                <Link key={c.id} href={categoryHref(website.slug, c.id)}>
                  {c.name}
                </Link>
              ))}
              {about && <Link href={`${home}#${about?.id}`}>About</Link>}
            </div>
            <div>
              <h2>A note on links</h2>
              <p>
                This website includes affiliate links. Its creator may earn a
                commission when you buy through these links. Purchases take
                place on the merchant’s website.
              </p>
            </div>
          </div>
          <div className="curated-container curated-footer-bottom">
            <span>© {website.name}</span>
            <span>Made with AffiPic</span>
          </div>
        </footer>,
      )}
    </div>
  );
}
