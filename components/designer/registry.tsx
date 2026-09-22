import type { ComponentType } from "react";
import { StorefrontIdentity } from "@/components/public/storefront-identity";
import {
  StorefrontCatalog,
  type CatalogProps,
} from "@/components/public/storefront";
import {
  defaultSectionSettings,
  sectionSchema,
  type DesignSection,
  type SectionType,
} from "@/lib/designer/schema";

export type SectionRenderProps = CatalogProps & {
  section: DesignSection;
  selectedProducts: CatalogProps["products"];
  assetUrl: (path: string) => string;
};
function Hero({ website, section }: SectionRenderProps) {
  return (
    <StorefrontIdentity
      part="hero"
      website={{
        ...website,
        branding: {
          ...website.branding!,
          hero_title: section.settings.title,
          hero_subtitle: section.settings.body,
        },
      }}
    />
  );
}
function Catalog(props: SectionRenderProps) {
  return <StorefrontCatalog {...props} title={props.section.settings.title} />;
}
function Text({ section }: SectionRenderProps) {
  return (
    <section
      className="design-content"
      style={{ textAlign: section.settings.alignment }}
    >
      {section.settings.title && <h2>{section.settings.title}</h2>}
      {section.settings.body && <p>{section.settings.body}</p>}
    </section>
  );
}
function ImageSection(props: SectionRenderProps) {
  const { section, assetUrl } = props;
  return (
    <section
      className="design-image"
      style={{ textAlign: section.settings.alignment }}
    >
      {section.settings.image_path && (
        // Validated, same-origin image proxy. Browser responses must recheck access.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={assetUrl(section.settings.image_path)}
          alt={section.settings.alt}
        />
      )}
      {(section.settings.title || section.settings.body) && <Text {...props} />}
    </section>
  );
}
function Products(props: SectionRenderProps) {
  const products = props.section.settings.product_ids.flatMap((id) => {
    const product = props.selectedProducts.find((p) => p.id === id);
    return product ? [product] : [];
  });
  return (
    <div className="design-featured">
      <StorefrontCatalog
        {...props}
        products={products}
        count={products.length}
        category=""
        page={1}
        title={props.section.settings.title || "Featured finds"}
        anchor={props.section.id}
      />
    </div>
  );
}
type Field = "title" | "body" | "image" | "alignment" | "products";
type Definition = {
  name: string;
  fields: Field[];
  supportedBlocks: readonly [];
  defaults: DesignSection["settings"];
  validation: typeof sectionSchema;
  Component: ComponentType<SectionRenderProps>;
};
function define(
  name: string,
  fields: Field[],
  Component: Definition["Component"],
  title = "",
): Definition {
  return {
    name,
    fields,
    Component,
    supportedBlocks: [],
    defaults: { ...defaultSectionSettings, title },
    validation: sectionSchema,
  };
}
export const sectionRegistry: Record<SectionType, Definition> = {
  hero: define("Introduction", ["title", "body"], Hero),
  catalog: define("Product catalog", ["title"], Catalog),
  text: define(
    "Text",
    ["title", "body", "alignment"],
    Text,
    "A little about these finds",
  ),
  image: define(
    "Image and caption",
    ["image", "title", "body", "alignment"],
    ImageSection,
  ),
  products: define(
    "Featured products",
    ["title", "products"],
    Products,
    "Featured finds",
  ),
};
