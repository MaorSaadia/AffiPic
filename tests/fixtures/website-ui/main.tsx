import { BrandingForm } from "@/components/websites/branding-form";
import {
  brandingSchema,
  defaultBranding,
  type BrandingView,
  type BrandingAction,
} from "@/lib/branding/schema";
import "@/app/branding.css";
import { DesignRenderer } from "@/components/designer/design-renderer";
import { Designer } from "@/components/designer/editor";
import {
  initialDesign,
  personalizeDesign,
  designSchema,
  type DesignRecord,
} from "@/lib/designer/schema";
import "@/app/designer.css";
import "@/app/curated.css";
import { PublishingPanel } from "@/components/websites/publishing-panel";
import type { PublicationAction } from "@/lib/publishing/schema";
import { PUBLIC_PAGE_SIZE, publicPageNumber } from "@/lib/public/schema";
import "@/app/public.css";
import { ProductForm } from "@/components/products/product-form";
import { ProductList } from "@/components/products/product-list";
import {
  productSchema,
  type ProductAction,
  type ProductView,
} from "@/lib/products/schema";
import "@/app/products.css";
// Isolated component fixture. Not part of Next.js routes or authentication.
// Actions here simulate UI responses only; database and server actions have separate tests.
import { CatalogManager } from "@/components/catalog/catalog-manager";
import type { CatalogItem, CatalogAction } from "@/lib/catalog/schema";
import "@/app/catalog.css";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { WebsiteSettings } from "@/components/websites/website-settings";
import {
  websiteSchema,
  type Website,
  type WebsiteAction,
} from "@/lib/websites/schema";
import "@/app/globals.css";
import "@/app/dashboard.css";
import "@/app/websites.css";
const scenario = new URLSearchParams(location.search).get("scenario");
const draft: Website = {
  id: "fixture-site",
  name: "The Everyday Edit",
  slug: "the-everyday-edit",
  description: "Thoughtful finds for your everyday.",
  status: "draft",
  created_at: "2026-09-20",
  updated_at: "2026-09-20",
};
function Fixture() {
  const [website, setWebsite] = useState<Website | null>(
    scenario === "existing" ? draft : null,
  );
  const action: WebsiteAction = async (_previous, form) => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    if (scenario === "duplicate")
      return { error: "That address is unavailable. Choose another address." };
    const parsed = websiteSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success)
      return {
        error: "Check the highlighted details and try again.",
        fieldErrors: { slug: parsed.error.issues[0].message },
      };
    const saved = { ...draft, ...parsed.data };
    setWebsite(saved);
    return {
      website: saved,
      success: website
        ? "Your website details have been saved."
        : "Your website has been created as a private draft.",
    };
  };
  return (
    <div className="dashboard-shell">
      <main className="main-content">
        <WebsiteSettings website={website} action={action} />
      </main>
    </div>
  );
}
function CatalogFixture() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const kind =
    new URLSearchParams(location.search).get("kind") === "merchants"
      ? "merchants"
      : "categories";
  const action: CatalogAction = async (_previous, form) => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const name = String(form.get("name")).trim();
    const id = String(form.get("id"));
    const operation = form.get("operation");
    if (
      operation !== "delete" &&
      items.some(
        (item) =>
          item.name.toLowerCase() === name.toLowerCase() && item.id !== id,
      )
    )
      return { error: "That name already exists on your website." };
    if (operation === "create")
      setItems([...items, { id: crypto.randomUUID(), name }]);
    else if (operation === "update")
      setItems(
        items.map((item) => (item.id === id ? { ...item, name } : item)),
      );
    else setItems(items.filter((item) => item.id !== id));
    return { success: "Saved." };
  };
  return (
    <main style={{ padding: 24 }}>
      <h1>Catalog</h1>
      <CatalogManager kind={kind} items={items} action={action} />
    </main>
  );
}
function ProductFixture() {
  const [saved, setSaved] = useState<ProductView | null>(null);
  const [failNext, setFailNext] = useState(false);
  const choices = [
    { id: "00000000-0000-4000-8000-000000000001", name: "Home" },
  ];
  const action: ProductAction = async (_previous, form) => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    if (failNext) {
      setFailNext(false);
      return {
        error:
          "The image upload failed. Your product was not changed. Please try again.",
      };
    }
    if (form.get("operation") === "delete") {
      setSaved(null);
      return { deleted: true, success: "Product deleted." };
    }
    const parsed = productSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const file = form.get("image");
    let imageUrl =
      form.get("remove_image") === "on" ? null : (saved?.imageUrl ?? null);
    if (file instanceof File && file.size)
      imageUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
      });
    const product: ProductView = {
      ...parsed.data,
      id: "00000000-0000-4000-8000-000000000002",
      revision: (saved?.revision ?? 0) + 1,
      created_at: "2026-09-20",
      updated_at: "2026-09-20",
      image_path: imageUrl ? "fixture/image.webp" : null,
      imageUrl,
    };
    setSaved(product);
    return { product, success: "Product saved." };
  };
  return (
    <main style={{ padding: 24 }}>
      <h1>Products</h1>
      <button onClick={() => setFailNext(true)}>
        Simulate next save failure
      </button>
      <ProductForm
        product={null}
        categories={choices}
        merchants={choices}
        action={action}
        writing={scenario === "products-ai" ? {
          websiteId: choices[0].id,
          allowance: async () => (await fetch("/__fixture/ai-allowance")).json(),
          generate: async (input) => (await fetch("/__fixture/ai-generate", { method: "POST", body: JSON.stringify(input) })).json(),
        } : undefined}
      />
      <ProductList
        products={saved ? [saved] : []}
        categories={choices}
        merchants={choices}
        count={saved ? 1 : 0}
        page={1}
        pageSize={20}
      />
    </main>
  );
}
function PublicFixture() {
  const query = new URLSearchParams(location.search);
  const category = query.get("category") ?? "";
  const page = publicPageNumber(query.get("page") ?? undefined);
  const choices = [
    { id: "00000000-0000-4000-8000-000000000001", name: "Home & living" },
    { id: "00000000-0000-4000-8000-000000000002", name: "Outdoors" },
    { id: "00000000-0000-4000-8000-000000000003", name: "Coming finds" },
  ];
  const all = Array.from({ length: 15 }, (_, i) => ({
    id: "00000000-0000-4000-8000-" + String(i + 10).padStart(12, "0"),
    name:
      i === 0
        ? "A little light for slow evenings"
        : "Everyday favorite " + (i + 1),
    description:
      "Thoughtfully chosen for the little moments. A useful find to make your day feel more like you.",
    affiliate_url: "https://shop.example/item?tag=creator",
    category_id: choices[i < 13 ? 0 : 1].id,
    merchant_id: choices[0].id,
    image_path: i < 3 ? "test/fixture.webp" : null,
  }));
  const filtered = category
    ? all.filter((item) => item.category_id === category)
    : all;
  return (
    <div className="public-site">
      <DesignRenderer
        design={initialDesign()}
        selectedProducts={[]}
        website={{
          id: "fixture",
          slug: "the-everyday-edit",
          name: "The Everyday Edit",
          description:
            "Good things for everyday living. A considered collection of useful, beautiful finds for your home and beyond.",
          status: "published",
        }}
        products={filtered.slice(
          (page - 1) * PUBLIC_PAGE_SIZE,
          page * PUBLIC_PAGE_SIZE,
        )}
        categories={choices}
        merchants={[{ id: choices[0].id, name: "Favorite Store" }]}
        count={filtered.length}
        page={page}
        category={category}
      />
    </div>
  );
}
function PublishingFixture() {
  const [fail, setFail] = useState(false);
  const action: PublicationAction = async (_previous, form) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (fail) {
      setFail(false);
      return { error: "Add at least one product before publishing." };
    }
    return {
      status: form.get("status") === "published" ? "published" : "draft",
      success: "Publication updated.",
    };
  };
  return (
    <main style={{ padding: 24 }}>
      <h1>Website publishing</h1>
      <button onClick={() => setFail(true)}>Simulate empty catalog</button>
      <PublishingPanel
        status="draft"
        slug="the-everyday-edit"
        action={action}
      />
    </main>
  );
}
function BrandingFixture() {
  const initial: BrandingView = {
    ...defaultBranding,
    revision: 0,
    logo_path: null,
    logoUrl: null,
  };
  const [saved, setSaved] = useState(initial);
  const [fail, setFail] = useState(false);
  const website = {
    name: "The Everyday Edit",
    slug: "the-everyday-edit",
    description: "Thoughtfully chosen finds for everyday living.",
    status: "draft" as const,
  };
  const action: BrandingAction = async (_previous, form) => {
    await new Promise((resolve) => setTimeout(resolve, 180));
    if (fail) {
      setFail(false);
      return {
        error: "The logo upload failed. Your saved branding was not changed.",
      };
    }
    const parsed = brandingSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    let logoUrl = form.get("remove_logo") === "on" ? null : saved.logoUrl;
    const file = form.get("logo");
    if (file instanceof File && file.size)
      logoUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
      });
    const branding: BrandingView = {
      ...parsed.data,
      logo_path: logoUrl ? "fixture/logo.webp" : null,
      logoUrl,
      revision: saved.revision + 1,
    };
    setSaved(branding);
    return { branding, success: "Branding saved." };
  };
  return (
    <main style={{ padding: 24 }}>
      <h1>Website branding</h1>
      <button onClick={() => setFail(true)}>Simulate next save failure</button>
      <BrandingForm website={website} branding={initial} action={action} />
      <p hidden data-testid="saved-branding">
        {JSON.stringify(saved)}
      </p>
    </main>
  );
}
function DesignerFixture() {
  const stored = localStorage.getItem("designer-fixture");
  const [record, setRecord] = useState<DesignRecord>(() =>
    stored
      ? JSON.parse(stored)
      : { draft: initialDesign(), published: initialDesign(), revision: 1 },
  );
  const website = {
    id: "00000000-0000-4000-8000-000000000001",
    name: "The Everyday Edit",
    slug: "the-everyday-edit",
    description: "Thoughtfully chosen finds.",
    status: "published" as const,
  };
  const products = [
    {
      id: "00000000-0000-4000-8000-000000000003",
      name: "Favorite mug",
      description: "A good start to the day.",
      affiliate_url: "https://shop.example/mug",
      image_path: null,
      merchant_id: null,
      category_id: null,
    },
  ];
  if (scenario === "designer-live")
    return (
      <DesignRenderer
        design={record.published!}
        website={website}
        products={products}
        selectedProducts={products}
        categories={[]}
        merchants={[]}
        count={1}
        page={1}
        category=""
      />
    );
  return (
    <Designer
      record={record}
      website={website}
      products={products}
      categories={[]}
      merchants={[]}
      save={async (input, revision, publish) => {
        const draft = designSchema.parse(input);
        const saved: DesignRecord = JSON.parse(
          localStorage.getItem("designer-fixture") || JSON.stringify(record),
        );
        if (saved.revision !== revision)
          return {
            error: "Design changed in another tab. Reload before saving.",
          };
        const next = {
          draft,
          published: publish ? draft : saved.published,
          revision: revision + 1,
        };
        localStorage.setItem("designer-fixture", JSON.stringify(next));
        setRecord(next);
        return { record: next, published: publish };
      }}
      upload={async () => ({ error: "Fixture uploads are not connected." })}
    />
  );
}
function CuratedFixture() {
  const fresh = personalizeDesign(initialDesign(), true);
  fresh.settings.topic = "Simple things, well chosen";
  fresh.templates.home[0].settings.title = "Make room for the everyday good.";
  fresh.templates.home[0].settings.body =
    "Useful, beautiful finds for a slower morning, a welcoming home, and time outside.";
  fresh.templates.home.find((s) => s.type === "about")!.settings.body =
    "We collect the little things that make everyday life feel more considered. Explore at your own pace and choose what works for you.";
  const [record, setRecord] = useState<DesignRecord>(() =>
    JSON.parse(
      localStorage.getItem("curated-fixture") ||
        JSON.stringify({ draft: fresh, published: fresh, revision: 1 }),
    ),
  );
  const website = {
    id: "00000000-0000-4000-8000-000000000001",
    name: "The Everyday Edit",
    slug: "curated-example",
    description: "Considered finds for everyday living.",
    status: "published" as const,
  };
  const categories = [
    { id: "00000000-0000-4000-8000-000000000010", name: "At home" },
    { id: "00000000-0000-4000-8000-000000000011", name: "Outside" },
  ];
  const products = [
    "Ceramic morning mug",
    "Linen table cloth",
    "Weekend carryall",
    "Reading notebook",
  ].map((name, i) => ({
    id: `00000000-0000-4000-8000-00000000002${i}`,
    name,
    description: "A useful companion for your everyday routine.",
    affiliate_url: "https://shop.example/find?ref=fixture",
    image_path: null,
    merchant_id: "shop",
    category_id: categories[i % 2].id,
  }));
  const merchants = [{ id: "shop", name: "Independent shop" }];
  if (scenario === "curated" || scenario === "curated-empty")
    return (
      <Designer
        record={record}
        website={website}
        products={scenario === "curated-empty" ? [] : products}
        categories={categories}
        merchants={merchants}
        save={async (input, revision, publish) => {
          const draft = designSchema.parse(input);
          const saved: DesignRecord = JSON.parse(
            localStorage.getItem("curated-fixture") || JSON.stringify(record),
          );
          if (saved.revision !== revision)
            return { error: "Design changed in another tab." };
          const next = {
            draft,
            published: publish ? draft : saved.published,
            revision: revision + 1,
          };
          localStorage.setItem("curated-fixture", JSON.stringify(next));
          setRecord(next);
          return { record: next, published: publish };
        }}
        upload={async () => ({ error: "Fixture upload is not connected." })}
      />
    );
  const category = location.pathname.match(/\/categories\/([^/]+)/)?.[1] || "";
  const product = products.find(
    (p) => p.id === location.pathname.match(/\/products\/([^/]+)/)?.[1],
  );
  const filtered = category
    ? products.filter((p) => p.category_id === category)
    : products;
  return (
    <DesignRenderer
      design={record.published!}
      website={website}
      products={filtered}
      selectedProducts={products}
      categories={categories}
      merchants={merchants}
      count={filtered.length}
      page={1}
      category={category}
      detailProduct={product}
    />
  );
}
createRoot(document.getElementById("root")!).render(
  scenario?.startsWith("curated") ||
    location.pathname.startsWith("/s/curated-example") ? (
    <CuratedFixture />
  ) : scenario === "designer" || scenario === "designer-live" ? (
    <DesignerFixture />
  ) : scenario === "branding" ? (
    <BrandingFixture />
  ) : scenario === "public" ||
    location.pathname.startsWith("/s/the-everyday-edit") ? (
    <PublicFixture />
  ) : scenario === "publishing" ? (
    <PublishingFixture />
  ) : scenario === "products" || scenario === "products-ai" ? (
    <ProductFixture />
  ) : scenario === "catalog" ? (
    <CatalogFixture />
  ) : (
    <Fixture />
  ),
);
