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
createRoot(document.getElementById("root")!).render(
  scenario === "products" ? (
    <ProductFixture />
  ) : scenario === "catalog" ? (
    <CatalogFixture />
  ) : (
    <Fixture />
  ),
);
