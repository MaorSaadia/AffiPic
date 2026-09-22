import type { ReactNode } from "react";
import { brandingStyles } from "@/lib/branding/schema";
import type { Design } from "@/lib/designer/schema";
import { StorefrontIdentity } from "@/components/public/storefront-identity";
import type { CatalogProps } from "@/components/public/storefront";
import { sectionRegistry } from "./registry";

export function mediaId(path: string) {
  return path.split("/")[1].replace(/\.webp$/, "");
}
export type DesignRendererProps = CatalogProps & {
  design: Design;
  selectedProducts: CatalogProps["products"];
  privatePreview?: boolean;
  wrapSection?: (id: string, name: string, children: ReactNode) => ReactNode;
};
export function DesignRenderer({
  design,
  privatePreview = false,
  wrapSection,
  ...catalog
}: DesignRendererProps) {
  const website = { ...catalog.website, branding: design.settings };
  const wrap =
    wrapSection ??
    ((_id: string, _name: string, children: ReactNode) => children);
  const logoUrl = design.settings.logo_path
    ? privatePreview
      ? "/designer/media/logo/" + mediaId(design.settings.logo_path)
      : "/s/" + website.slug + "/logo"
    : null;
  const assetUrl = (path: string) =>
    privatePreview
      ? "/designer/media/asset/" + mediaId(path)
      : "/s/" + website.slug + "/assets/" + mediaId(path);
  const visible = design.templates.home.filter((s) => !s.hidden);
  return (
    <div className="storefront-surface" style={brandingStyles(design.settings)}>
      <div className="storefront">
        <a href="#finds" className="storefront-skip">
          Skip to products
        </a>
        {wrap(
          "header",
          "Shared header",
          <StorefrontIdentity
            part="header"
            website={website}
            logoUrl={logoUrl}
          />,
        )}
        <main>
          {!visible.some((s) => s.type === "hero") && (
            <h1 className="sr-only">{website.name}</h1>
          )}
          {/* Keep the migrated introduction above the disclosure, exactly as before. */}
          {visible[0]?.type === "hero" && renderSection(visible[0])}
          <p className="storefront-disclosure">
            This website includes affiliate links. Its creator may earn a
            commission when you buy through these links. Purchases take place on
            the merchant’s website.
          </p>
          {visible
            .slice(visible[0]?.type === "hero" ? 1 : 0)
            .map(renderSection)}
        </main>
        {wrap(
          "footer",
          "Shared footer",
          <footer className="storefront-footer">
            <span>{website.name}</span>
            <span>Made with AffiPic</span>
          </footer>,
        )}
      </div>
    </div>
  );
  function renderSection(section: Design["templates"]["home"][number]) {
    const definition = sectionRegistry[section.type];
    const Component = definition.Component;
    return (
      <div key={section.id}>
        {wrap(
          section.id,
          definition.name,
          <Component
            {...catalog}
            website={website}
            section={section}
            assetUrl={assetUrl}
          />,
        )}
      </div>
    );
  }
}
