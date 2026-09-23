"use client";
import { useEffect, useState, type ReactNode, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { DesignRenderer } from "./design-renderer";
import { sectionRegistry } from "./registry";
import {
  designSchema,
  personalizeDesign,
  type Design,
  type DesignRecord,
  type DesignResult,
  type DesignSection,
  type SectionType,
} from "@/lib/designer/schema";
import type { CatalogProps } from "@/components/public/storefront";
import { PUBLIC_PAGE_SIZE } from "@/lib/public/schema";
import { ThemeSettings } from "./theme-settings";
import { previewSamples } from "@/lib/designer/preview-samples";
import { defaultBranding } from "@/lib/branding/schema";

type Props = Pick<CatalogProps, "products" | "categories" | "merchants"> & {
  website: Omit<CatalogProps["website"], "status"> & {
    status: "draft" | "published";
  };
  record: DesignRecord;
  save: (
    design: unknown,
    revision: number,
    publish: boolean,
  ) => Promise<DesignResult>;
  upload: (form: FormData) => Promise<{ path?: string; error?: string }>;
};
export function Designer({ record: initial, save, upload, ...catalog }: Props) {
  const [record, setRecord] = useState(initial);
  const [design, setDesign] = useState(initial.draft);
  const [selected, setSelected] = useState(initial.draft.templates.home[0].id);
  const [mobile, setMobile] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [addType, setAddType] = useState<SectionType>("text");
  const [query, setQuery] = useState("");
  const [previewPage, setPreviewPage] = useState(1);
  const [category, setCategory] = useState("");
  const [detailId, setDetailId] = useState("");
  const [showSamples, setShowSamples] = useState(true);
  const [frame, setFrame] = useState<Document | null>(null);
  const dirty = JSON.stringify(design) !== JSON.stringify(record.draft);
  const section = design.templates.home.find((s) => s.id === selected);
  const definition = section ? sectionRegistry[section.type] : null;
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  function change(next: Design) {
    setDesign(next);
    setMessage("");
    setError("");
  }
  function sections(next: DesignSection[]) {
    change({ ...design, templates: { home: next } });
  }
  function settings(next: Partial<DesignSection["settings"]>) {
    sections(
      design.templates.home.map((s) =>
        s.id === selected ? { ...s, settings: { ...s.settings, ...next } } : s,
      ),
    );
  }
  function move(index: number, offset: number) {
    const next = [...design.templates.home];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    sections(next);
  }
  async function persist(publish: boolean) {
    if (
      publish &&
      !window.confirm(
        "Publish this design? Your current layout and content settings will become live. Unsaved design changes are included. The previous published design will be retained.",
      )
    )
      return;
    const parsed = designSchema.safeParse(design);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await save(parsed.data, record.revision, publish);
      if (result.error) setError(result.error);
      if (result.record) {
        setRecord(result.record);
        setDesign(result.record.draft);
        setMessage(
          publish
            ? "Design published. Your website is live."
            : "Draft saved. Your live website is unchanged.",
        );
      }
    } catch {
      setError(
        "Connection interrupted. Reload to check the saved version before retrying.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function chooseImage(
    file?: File,
    kind: "image" | "logo" | "favicon" = "image",
  ) {
    if (!file || (!section && kind === "image")) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Choose an image up to 2 MB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("image", file);
      form.set("kind", kind);
      const result = await upload(form);
      if (result.error) setError(result.error);
      if (result.path) {
        if (kind !== "image")
          change({
            ...design,
            settings: {
              ...design.settings,
              [kind === "favicon" ? "favicon_path" : "logo_path"]: result.path,
            },
          });
        else settings({ image_path: result.path });
      }
    } catch {
      setError("Image upload failed. Try again.");
    } finally {
      setBusy(false);
    }
  }
  function previewNavigation(event: MouseEvent) {
    if (!interactive) return;
    const target = event.target as HTMLElement;
    const link = target.closest("a");
    if (!link) return;
    const href = link.getAttribute("href") ?? "";
    if (href.startsWith("/s/")) {
      event.preventDefault();
      const url = new URL(href, window.location.origin);
      setCategory(
        url.pathname.match(/\/categories\/([^/]+)/)?.[1] ??
          url.searchParams.get("category") ??
          "",
      );
      setDetailId(url.pathname.match(/\/products\/([^/]+)/)?.[1] ?? "");
      if (url.hash)
        requestAnimationFrame(() =>
          frame?.getElementById(url.hash.slice(1))?.scrollIntoView(),
        );
      setPreviewPage(Math.max(1, Number(url.searchParams.get("page")) || 1));
    }
  }
  const samples =
    catalog.products.length === 0 && showSamples && design.theme === "curated";
  const previewProducts = samples ? previewSamples : catalog.products;
  const filtered = previewProducts.filter(
    (p) => !category || p.category_id === category,
  );
  function wrapSection(id: string, name: string, children: ReactNode) {
    if (interactive) return children;
    return (
      <div
        className={
          "designer-selection" + (id === selected ? " is-selected" : "")
        }
        role="button"
        tabIndex={busy ? -1 : 0}
        aria-label={"Edit " + name}
        onClick={() => {
          if (!busy) setSelected(id);
        }}
        onKeyDown={(event) => {
          if (!busy && ["Enter", " "].includes(event.key)) {
            event.preventDefault();
            setSelected(id);
          }
        }}
      >
        <span className="designer-selection-label">{name}</span>
        <div inert>{children}</div>
      </div>
    );
  }
  return (
    <div className="designer-app">
      <header className="designer-toolbar">
        <Link
          href="/dashboard/settings"
          onClick={(e) => {
            if (
              busy ||
              (dirty &&
                !window.confirm(
                  "Leave the designer and discard unsaved changes?",
                ))
            )
              e.preventDefault();
          }}
        >
          ← Exit
        </Link>
        <div>
          <h1>Website Designer</h1>
          <span>{catalog.website.name}</span>
        </div>
        <label>
          Page{" "}
          <select
            aria-label="Page template"
            value={
              detailId
                ? "product:" + detailId
                : category
                  ? "category:" + category
                  : "home"
            }
            onChange={(e) => {
              const [kind, id] = e.target.value.split(":");
              setDetailId(kind === "product" ? id : "");
              setCategory(kind === "category" ? id : "");
              setPreviewPage(1);
            }}
          >
            <option value="home">Homepage</option>
            {design.theme === "curated" && (
              <>
                <optgroup label="Category preview">
                  {catalog.categories.map((c) => (
                    <option value={"category:" + c.id} key={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Product preview">
                  {catalog.products.map((p) => (
                    <option value={"product:" + p.id} key={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              </>
            )}
          </select>
        </label>
        <div className="designer-device" aria-label="Preview width">
          <button aria-pressed={!mobile} onClick={() => setMobile(false)}>
            Desktop
          </button>
          <button aria-pressed={mobile} onClick={() => setMobile(true)}>
            Mobile
          </button>
        </div>
        <span className="designer-save-state">
          {busy ? "Working…" : dirty ? "Unsaved changes" : "Draft saved"}
        </span>
        <button disabled={busy || !dirty} onClick={() => persist(false)}>
          Save draft
        </button>
        <button
          className="designer-primary"
          disabled={busy}
          onClick={() => persist(true)}
        >
          Publish
        </button>
      </header>
      {(error || message) && (
        <p
          className={"designer-notice " + (error ? "is-error" : "")}
          role={error ? "alert" : "status"}
        >
          {error || message}
        </p>
      )}
      <div className="designer-workspace">
        <aside className="designer-sidebar" aria-label="Page sections">
          {design.theme === "storefront" && (
            <div className="designer-theme-upgrade">
              <h2>Meet Curated</h2>
              <p>
                A complete new look inspired by MishBaby. Your content and live
                website stay intact.
              </p>
              <button
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "Try Curated in this draft? Your text, images, selections and branding are kept. The live website stays unchanged until publishing.",
                    )
                  ) {
                    change(personalizeDesign(design));
                    setSelected("branding");
                  }
                }}
              >
                Try Curated theme
              </button>
            </div>
          )}
          <h2>Homepage sections</h2>
          <p>Use the arrows to reorder sections.</p>
          <button
            className="designer-shared"
            aria-pressed={selected === "branding"}
            onClick={() => setSelected("branding")}
          >
            Site branding
          </button>
          <button
            className="designer-shared"
            aria-pressed={selected === "header"}
            onClick={() => setSelected("header")}
          >
            Shared header
          </button>
          <ol>
            {design.templates.home.map((item, index) => (
              <li
                key={item.id}
                className={selected === item.id ? "is-selected" : ""}
              >
                <button
                  className="designer-section-name"
                  onClick={() => setSelected(item.id)}
                  aria-pressed={selected === item.id}
                >
                  {item.settings.title || sectionRegistry[item.type].name}
                  {item.hidden ? " (hidden)" : ""}
                </button>
                <div className="designer-section-tools">
                  <button
                    disabled={busy || index === 0}
                    aria-label={
                      "Move " + sectionRegistry[item.type].name + " up"
                    }
                    onClick={() => move(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    disabled={
                      busy || index === design.templates.home.length - 1
                    }
                    aria-label={
                      "Move " + sectionRegistry[item.type].name + " down"
                    }
                    onClick={() => move(index, 1)}
                  >
                    ↓
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      sections(
                        design.templates.home.map((s) =>
                          s.id === item.id ? { ...s, hidden: !s.hidden } : s,
                        ),
                      )
                    }
                  >
                    {item.hidden ? "Show" : "Hide"}
                  </button>
                </div>
              </li>
            ))}
          </ol>
          <button
            className="designer-shared"
            aria-pressed={selected === "footer"}
            onClick={() => setSelected("footer")}
          >
            Shared footer
          </button>
          <div className="designer-add">
            <label>
              Add section
              <select
                value={addType}
                onChange={(e) => setAddType(e.target.value as SectionType)}
              >
                {Object.entries(sectionRegistry)
                  .filter(
                    ([type]) =>
                      type !== "catalog" &&
                      (design.theme === "curated" ||
                        !["categories", "about"].includes(type)),
                  )
                  .map(([type, def]) => (
                    <option key={type} value={type}>
                      {def.name}
                    </option>
                  ))}
              </select>
            </label>
            <button
              disabled={busy || design.templates.home.length >= 25}
              onClick={() => {
                const item: DesignSection = {
                  id: crypto.randomUUID(),
                  type: addType,
                  hidden: false,
                  settings: { ...sectionRegistry[addType].defaults },
                  blocks: [],
                };
                sections([...design.templates.home, item]);
                setSelected(item.id);
              }}
            >
              Add section
            </button>
          </div>
          <p className="designer-help">
            Curated includes shared branding, navigation and footer controls.
            Product and category previews use real catalog records. Nested
            blocks and other themes remain planned.
          </p>
        </aside>
        <main className="designer-stage">
          <div className="designer-preview-bar">
            <span>
              {interactive ? "Interactive preview" : "Click a section to edit"}
            </span>
            <button
              aria-pressed={interactive}
              onClick={() => setInteractive(!interactive)}
            >
              {interactive ? "Return to editing" : "Interact with preview"}
            </button>
          </div>
          {catalog.products.length === 0 && design.theme === "curated" && (
            <label className="designer-sample-toggle">
              <input
                type="checkbox"
                checked={showSamples}
                onChange={(e) => setShowSamples(e.target.checked)}
              />
              Show clearly labeled sample products (preview only)
            </label>
          )}
          <iframe
            title="Website design preview"
            className={mobile ? "designer-frame mobile" : "designer-frame"}
            srcDoc={
              '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"></body></html>'
            }
            onLoad={(event) => {
              const doc = event.currentTarget.contentDocument;
              if (!doc) return;
              document
                .querySelectorAll('link[rel="stylesheet"],style')
                .forEach((node) => doc.head.appendChild(node.cloneNode(true)));
              setFrame(doc);
            }}
          />
          {frame &&
            createPortal(
              <div className="public-site" onClickCapture={previewNavigation}>
                {samples && (
                  <p className="designer-sample-banner">
                    Sample products: preview only. Not saved or published.
                  </p>
                )}
                <DesignRenderer
                  {...catalog}
                  website={{ ...catalog.website, status: "published" }}
                  design={design}
                  privatePreview
                  detailProduct={catalog.products.find(
                    (p) => p.id === detailId,
                  )}
                  products={filtered.slice(
                    (previewPage - 1) * PUBLIC_PAGE_SIZE,
                    previewPage * PUBLIC_PAGE_SIZE,
                  )}
                  selectedProducts={catalog.products}
                  count={filtered.length}
                  category={category}
                  page={previewPage}
                  imageUrls={Object.fromEntries(
                    catalog.products
                      .filter((p) => p.image_path)
                      .map((p) => [p.id, "/designer/media/product/" + p.id]),
                  )}
                  wrapSection={wrapSection}
                />
              </div>,
              frame.body,
            )}
        </main>
        <aside className="designer-settings" aria-label="Section settings">
          <h2>
            {definition?.name ??
              (selected === "branding"
                ? "Site branding"
                : selected === "header"
                  ? "Shared header"
                  : "Shared footer")}
          </h2>
          {design.theme === "curated" &&
          ["branding", "header", "footer"].includes(selected) ? (
            <ThemeSettings
              design={design}
              change={change}
              categories={catalog.categories}
              upload={chooseImage}
              busy={busy}
              panel={selected}
            />
          ) : selected === "branding" ? (
            <fieldset disabled={busy}>
              <label>
                Accent color
                <input
                  value={design.settings.accent_color}
                  maxLength={7}
                  onChange={(e) =>
                    change({
                      ...design,
                      settings: {
                        ...design.settings,
                        accent_color: e.target.value,
                      },
                    })
                  }
                />
              </label>
              <p>Use a dark six-digit hex color, such as #2449c4.</p>
              <label>
                Page background
                <select
                  value={design.settings.background}
                  onChange={(e) =>
                    change({
                      ...design,
                      settings: {
                        ...design.settings,
                        background: e.target
                          .value as Design["settings"]["background"],
                      },
                    })
                  }
                >
                  <option value="ivory">Warm ivory</option>
                  <option value="white">Bright white</option>
                  <option value="mist">Cool mist</option>
                </select>
              </label>
              <label>
                Heading style
                <select
                  value={design.settings.heading_font}
                  onChange={(e) =>
                    change({
                      ...design,
                      settings: {
                        ...design.settings,
                        heading_font: e.target
                          .value as Design["settings"]["heading_font"],
                      },
                    })
                  }
                >
                  <option value="sans">Modern sans serif</option>
                  <option value="serif">Classic serif</option>
                </select>
              </label>
              <label>
                Website logo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    void chooseImage(e.target.files?.[0], "logo");
                    e.target.value = "";
                  }}
                />
              </label>
              <p>Still JPEG, PNG, or WebP, up to 1 MB.</p>
              {design.settings.logo_path && (
                <button
                  onClick={() =>
                    change({
                      ...design,
                      settings: { ...design.settings, logo_path: null },
                    })
                  }
                >
                  Remove logo
                </button>
              )}
              <button
                onClick={() =>
                  change({
                    ...design,
                    settings: { ...defaultBranding, logo_path: null },
                  })
                }
              >
                Use default branding
              </button>
              <button
                disabled={!dirty}
                onClick={() => {
                  if (window.confirm("Discard all unsaved design changes?")) {
                    setDesign(record.draft);
                    setError("");
                    setMessage("");
                  }
                }}
              >
                Discard unsaved design
              </button>
            </fieldset>
          ) : !section || !definition ? (
            <p>
              This shared section appears across your site. Its existing
              branding is preserved. Shared-section controls arrive in 7B.
            </p>
          ) : (
            <fieldset disabled={busy}>
              {section.hidden && (
                <p>
                  This section is hidden on the website. Its content is
                  retained.
                </p>
              )}
              {definition.fields.includes("title") && (
                <label>
                  Heading
                  <input
                    value={section.settings.title}
                    maxLength={120}
                    onChange={(e) => settings({ title: e.target.value })}
                    placeholder={
                      section.type === "hero"
                        ? catalog.website.name
                        : "Section heading"
                    }
                  />
                </label>
              )}
              {definition.fields.includes("body") && (
                <label>
                  Text
                  <textarea
                    value={section.settings.body}
                    rows={6}
                    maxLength={2000}
                    onChange={(e) => settings({ body: e.target.value })}
                  />
                </label>
              )}
              {definition.fields.includes("alignment") &&
                (design.theme === "curated" || section.type !== "hero") && (
                  <label>
                    Text alignment
                    <select
                      value={section.settings.alignment}
                      onChange={(e) =>
                        settings({
                          alignment: e.target.value as "left" | "center",
                        })
                      }
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                    </select>
                  </label>
                )}
              {definition.fields.includes("image") &&
                (design.theme === "curated" || section.type !== "hero") && (
                  <>
                    <label>
                      Section image
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          void chooseImage(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <p>
                      Still JPEG, PNG, or WebP, up to 2 MB. Uploading changes
                      this draft only.
                    </p>
                    {section.settings.image_path && (
                      <button onClick={() => settings({ image_path: null })}>
                        Remove image
                      </button>
                    )}
                    <label>
                      Image description
                      <input
                        value={section.settings.alt}
                        maxLength={200}
                        onChange={(e) => settings({ alt: e.target.value })}
                      />
                    </label>
                    <p>
                      Describe meaningful images; leave blank for decoration.
                    </p>
                  </>
                )}
              {design.theme === "curated" &&
                definition.fields.includes("image") && (
                  <>
                    <label>
                      Image fit
                      <select
                        value={section.settings.image_fit ?? "cover"}
                        onChange={(e) =>
                          settings({
                            image_fit: e.target.value as "cover" | "contain",
                          })
                        }
                      >
                        <option value="cover">Fill frame</option>
                        <option value="contain">Show whole image</option>
                      </select>
                    </label>
                    {section.type === "hero" && (
                      <label>
                        Image position
                        <select
                          value={section.settings.image_position ?? "right"}
                          onChange={(e) =>
                            settings({
                              image_position: e.target.value as
                                "left" | "right",
                            })
                          }
                        >
                          <option value="right">Right on desktop</option>
                          <option value="left">Left on desktop</option>
                        </select>
                      </label>
                    )}
                  </>
                )}
              {design.theme === "curated" &&
                definition.fields.includes("cta") && (
                  <>
                    <label>
                      Button label
                      <input
                        maxLength={50}
                        value={
                          section.settings.cta_label ?? "Explore the finds"
                        }
                        onChange={(e) =>
                          settings({ cta_label: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Button destination
                      <select
                        value={section.settings.cta_target ?? "catalog"}
                        onChange={(e) =>
                          settings({
                            cta_target: e.target.value as
                              "catalog" | "categories" | "about",
                          })
                        }
                      >
                        <option value="catalog">Product catalog</option>
                        <option value="categories">Categories</option>
                        <option value="about">About</option>
                      </select>
                    </label>
                  </>
                )}
              {section.type === "categories" && (
                <p>
                  Choose and reorder categories in Site branding: Identity &
                  navigation.
                </p>
              )}
              {definition.fields.includes("products") && (
                <>
                  <label>
                    Find products
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <p>
                    Select up to 12. Product details stay connected to your
                    catalog.
                  </p>
                  <div className="designer-product-picker">
                    {catalog.products
                      .filter((p) =>
                        p.name.toLowerCase().includes(query.toLowerCase()),
                      )
                      .map((p) => (
                        <label key={p.id}>
                          <input
                            type="checkbox"
                            checked={section.settings.product_ids.includes(
                              p.id,
                            )}
                            disabled={
                              !section.settings.product_ids.includes(p.id) &&
                              section.settings.product_ids.length >= 12
                            }
                            onChange={(e) =>
                              settings({
                                product_ids: e.target.checked
                                  ? [...section.settings.product_ids, p.id]
                                  : section.settings.product_ids.filter(
                                      (id) => id !== p.id,
                                    ),
                              })
                            }
                          />
                          {p.name}
                        </label>
                      ))}
                  </div>
                  {!catalog.products.length && (
                    <p>Add products in the dashboard first.</p>
                  )}
                  {section.settings.product_ids.some(
                    (id) => !catalog.products.some((p) => p.id === id),
                  ) && (
                    <button
                      onClick={() =>
                        settings({
                          product_ids: section.settings.product_ids.filter(
                            (id) => catalog.products.some((p) => p.id === id),
                          ),
                        })
                      }
                    >
                      Clear unavailable product selections
                    </button>
                  )}
                  {catalog.products.length >= 1000 && (
                    <p>The picker shows the newest 1,000 products.</p>
                  )}
                </>
              )}
              <hr />
              {section.type !== "catalog" ? (
                <>
                  <button
                    disabled={design.templates.home.length >= 25}
                    onClick={() => {
                      const duplicate = {
                        ...structuredClone(section),
                        id: crypto.randomUUID(),
                      };
                      const next = [...design.templates.home];
                      next.splice(
                        next.findIndex((s) => s.id === selected) + 1,
                        0,
                        duplicate,
                      );
                      sections(next);
                      setSelected(duplicate.id);
                    }}
                  >
                    Duplicate section
                  </button>
                  <button
                    className="designer-danger"
                    onClick={() => {
                      if (
                        !window.confirm(
                          "Remove this section from the draft? The live design will not change until you publish.",
                        )
                      )
                        return;
                      sections(
                        design.templates.home.filter((s) => s.id !== selected),
                      );
                      setSelected("header");
                    }}
                  >
                    Remove section
                  </button>
                </>
              ) : (
                <p>
                  The catalog is kept to preserve existing category and
                  pagination links. You can move or hide it.
                </p>
              )}
            </fieldset>
          )}
        </aside>
      </div>
    </div>
  );
}
