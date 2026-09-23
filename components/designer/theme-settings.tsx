"use client";
import { colorPresets, paletteSchema } from "@/lib/designer/theme-settings";
import type { Design } from "@/lib/designer/schema";
import type { CatalogItem } from "@/lib/catalog/schema";

export function ThemeSettings({
  design,
  change,
  categories,
  upload,
  busy,
  panel,
}: {
  design: Design;
  change: (design: Design) => void;
  categories: CatalogItem[];
  upload: (file?: File, kind?: "image" | "logo" | "favicon") => void;
  busy: boolean;
  panel: string;
}) {
  const settings = design.settings;
  const set = (value: Partial<Design["settings"]>) =>
    change({ ...design, settings: { ...settings, ...value } });
  const palette = settings.palette ?? colorPresets.coast;
  const categoryIds = settings.category_ids ?? categories.map((c) => c.id);
  const socials = settings.social_links ?? [];
  const paletteCheck = paletteSchema.safeParse(palette);
  return (
    <fieldset disabled={busy} className="designer-theme-settings">
      {panel !== "footer" && (
        <details open>
          <summary>Identity & navigation</summary>
          <div>
            <label>
              Website name
              <input
                value={settings.site_name ?? ""}
                maxLength={80}
                placeholder="Use the name from Website Settings"
                onChange={(e) => set({ site_name: e.target.value })}
              />
            </label>
            <label>
              Topic (optional)
              <input
                value={settings.topic ?? ""}
                maxLength={100}
                list="topic-suggestions"
                placeholder="Your own topic or tagline"
                onChange={(e) => set({ topic: e.target.value })}
              />
            </label>
            <datalist id="topic-suggestions">
              <option value="Thoughtful finds for everyday living" />
              <option value="Made for time outdoors" />
              <option value="Tools for a creative life" />
            </datalist>
            <p>
              Suggestions are optional. Your topic never changes your content or
              categories.
            </p>
            <label>
              Logo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  upload(e.target.files?.[0], "logo");
                  e.target.value = "";
                }}
              />
            </label>
            <p>Up to 1 MB. Saved as a resized WebP.</p>
            {settings.logo_path && (
              <button onClick={() => set({ logo_path: null })}>
                Remove logo
              </button>
            )}
            <label>
              Favicon
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  upload(e.target.files?.[0], "favicon");
                  e.target.value = "";
                }}
              />
            </label>
            <p>
              A square image works best. Up to 1 MB; saved at up to 64 pixels.
            </p>
            {settings.favicon_path && (
              <button onClick={() => set({ favicon_path: null })}>
                Remove favicon
              </button>
            )}
            <h3>Categories</h3>
            <p>Select and order categories for navigation and discovery.</p>
            <div className="designer-product-picker">
              {categories.map((c) => (
                <label key={c.id}>
                  <input
                    type="checkbox"
                    checked={categoryIds.includes(c.id)}
                    onChange={(e) =>
                      set({
                        category_ids: e.target.checked
                          ? [...categoryIds, c.id]
                          : categoryIds.filter((id) => id !== c.id),
                      })
                    }
                  />
                  {c.name}
                </label>
              ))}
            </div>
            <ol className="designer-category-order">
              {categoryIds.map((id, i) => {
                const c = categories.find((c) => c.id === id);
                return (
                  <li key={id}>
                    <span>{c?.name ?? "Unavailable category"}</span>
                    <button
                      aria-label={`Move ${c?.name ?? "category"} up`}
                      disabled={i === 0}
                      onClick={() => {
                        const ids = [...categoryIds];
                        [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
                        set({ category_ids: ids });
                      }}
                    >
                      ↑
                    </button>
                    <button
                      aria-label={`Move ${c?.name ?? "category"} down`}
                      disabled={i === categoryIds.length - 1}
                      onClick={() => {
                        const ids = [...categoryIds];
                        [ids[i + 1], ids[i]] = [ids[i], ids[i + 1]];
                        set({ category_ids: ids });
                      }}
                    >
                      ↓
                    </button>
                    {!c && (
                      <button
                        onClick={() =>
                          set({
                            category_ids: categoryIds.filter((x) => x !== id),
                          })
                        }
                      >
                        Remove
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
            <button onClick={() => set({ category_ids: undefined })}>
              Show all current and future categories
            </button>
          </div>
        </details>
      )}
      {panel === "branding" && (
        <details open>
          <summary>Colors & type</summary>
          <div>
            <label>
              Coordinated color preset
              <select
                aria-label="Coordinated color preset"
                value=""
                onChange={(e) => {
                  const key = e.target.value as keyof typeof colorPresets;
                  if (key) set({ palette: { ...colorPresets[key] } });
                }}
              >
                <option value="">Choose a palette</option>
                <option value="coast">Coast</option>
                <option value="sage">Sage</option>
                <option value="rose">Rose</option>
                <option value="ink">Ink</option>
              </select>
            </label>
            {(["background", "surface", "text", "accent"] as const).map(
              (key) => (
                <label key={key}>
                  Custom {key} color
                  <input
                    maxLength={7}
                    value={palette[key]}
                    onChange={(e) =>
                      set({ palette: { ...palette, [key]: e.target.value } })
                    }
                  />
                </label>
              ),
            )}
            {!paletteCheck.success && (
              <p role="alert">{paletteCheck.error.issues[0].message}</p>
            )}
            <label>
              Font pair
              <select
                aria-label="Font pair"
                value={settings.font_pair ?? "editorial"}
                onChange={(e) =>
                  set({
                    font_pair: e.target.value as
                      "editorial" | "modern" | "classic",
                  })
                }
              >
                <option value="editorial">
                  Editorial · serif headings, sans body
                </option>
                <option value="modern">Modern · sans headings and body</option>
                <option value="classic">
                  Classic · serif headings and body
                </option>
              </select>
            </label>
            <label>
              Button shape
              <select
                aria-label="Button shape"
                value={settings.button_style ?? "pill"}
                onChange={(e) =>
                  set({
                    button_style: e.target.value as "pill" | "soft" | "square",
                  })
                }
              >
                <option value="pill">Pill</option>
                <option value="soft">Soft corners</option>
                <option value="square">Square</option>
              </select>
            </label>
            <label>
              Product cards
              <select
                aria-label="Product cards"
                value={settings.card_style ?? "soft"}
                onChange={(e) =>
                  set({
                    card_style: e.target.value as
                      "soft" | "bordered" | "minimal",
                  })
                }
              >
                <option value="soft">Soft, rounded</option>
                <option value="bordered">Bordered</option>
                <option value="minimal">Minimal</option>
              </select>
            </label>
          </div>
        </details>
      )}
      {panel !== "header" && (
        <details open={panel === "footer"}>
          <summary>Footer & social links</summary>
          <div>
            <label>
              Footer introduction
              <textarea
                rows={4}
                maxLength={500}
                value={settings.footer_text ?? ""}
                placeholder="Use your website description"
                onChange={(e) => set({ footer_text: e.target.value })}
              />
            </label>
            <p>The affiliate disclosure always appears.</p>
            {socials.map((social, index) => (
              <div key={index} className="designer-social-row">
                <label>
                  Link label
                  <input
                    value={social.label}
                    maxLength={40}
                    onChange={(e) =>
                      set({
                        social_links: socials.map((s, i) =>
                          i === index ? { ...s, label: e.target.value } : s,
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  HTTPS address
                  <input
                    type="url"
                    value={social.url}
                    onChange={(e) =>
                      set({
                        social_links: socials.map((s, i) =>
                          i === index ? { ...s, url: e.target.value } : s,
                        ),
                      })
                    }
                  />
                </label>
                <button
                  onClick={() =>
                    set({ social_links: socials.filter((_, i) => i !== index) })
                  }
                >
                  Remove link
                </button>
              </div>
            ))}
            <button
              disabled={socials.length >= 6}
              onClick={() =>
                set({ social_links: [...socials, { label: "", url: "" }] })
              }
            >
              Add social link
            </button>
          </div>
        </details>
      )}
    </fieldset>
  );
}
