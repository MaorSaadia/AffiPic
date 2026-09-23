import { z } from "zod";
import { brandingSchema, defaultBranding } from "@/lib/branding/schema";
import { themeExtras, colorPresets } from "./theme-settings";

export const sectionTypes = [
  "hero",
  "catalog",
  "text",
  "image",
  "products",
  "categories",
  "about",
] as const;
const assetPath = z
  .string()
  .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/)
  .nullable();
export const sectionSettingsSchema = z
  .object({
    title: z.string().max(120),
    body: z.string().max(2000),
    image_path: assetPath,
    alt: z.string().max(200),
    alignment: z.enum(["left", "center"]),
    cta_label: z.string().max(50).optional(),
    cta_target: z.enum(["catalog", "categories", "about"]).optional(),
    image_position: z.enum(["left", "right"]).optional(),
    image_fit: z.enum(["cover", "contain"]).optional(),
    product_ids: z
      .array(z.uuid())
      .max(12)
      .refine((v) => new Set(v).size === v.length),
  })
  .strict();
export const sectionSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9-]{1,64}$/),
    type: z.enum(sectionTypes),
    hidden: z.boolean(),
    settings: sectionSettingsSchema,
    blocks: z.array(z.never()).max(0),
  })
  .strict();
export const designSchema = z
  .object({
    version: z.union([z.literal(1), z.literal(2)]),
    theme: z.enum(["storefront", "curated"]),
    settings: brandingSchema
      .extend({ logo_path: assetPath, ...themeExtras })
      .strict(),
    shared: z
      .object({
        header: z
          .object({ id: z.literal("header"), type: z.literal("header") })
          .strict(),
        footer: z
          .object({ id: z.literal("footer"), type: z.literal("footer") })
          .strict(),
      })
      .strict(),
    templates: z
      .object({ home: z.array(sectionSchema).min(1).max(25) })
      .strict(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if ((value.version === 1) !== (value.theme === "storefront"))
      ctx.addIssue({ code: "custom", message: "Unsupported theme version." });
    const ids = value.templates.home.map((s) => s.id);
    if (
      new Set(ids).size !== ids.length ||
      ids.some((id) => ["header", "footer"].includes(id))
    )
      ctx.addIssue({ code: "custom", message: "Section IDs must be unique." });
    if (value.templates.home.filter((s) => s.type === "catalog").length !== 1)
      ctx.addIssue({
        code: "custom",
        message:
          "Keep one catalog section to preserve category and pagination URLs.",
      });
  });
export type Design = z.infer<typeof designSchema>;
export type DesignSection = z.infer<typeof sectionSchema>;
export type SectionType = DesignSection["type"];
export const defaultSectionSettings: DesignSection["settings"] = {
  title: "",
  body: "",
  image_path: null,
  alt: "",
  alignment: "left",
  product_ids: [],
};
export function initialDesign(
  branding = { ...defaultBranding, logo_path: null as string | null },
): Design {
  return {
    version: 1,
    theme: "storefront",
    settings: branding,
    shared: {
      header: { id: "header", type: "header" },
      footer: { id: "footer", type: "footer" },
    },
    templates: {
      home: [
        {
          id: "hero",
          type: "hero",
          hidden: false,
          blocks: [],
          settings: {
            ...defaultSectionSettings,
            title: branding.hero_title,
            body: branding.hero_subtitle,
          },
        },
        {
          id: "catalog",
          type: "catalog",
          hidden: false,
          blocks: [],
          settings: { ...defaultSectionSettings },
        },
      ],
    },
  };
}
export type DesignRecord = {
  draft: Design;
  published: Design | null;
  revision: number;
};
export type DesignResult = {
  error?: string;
  record?: DesignRecord;
  published?: boolean;
};

// Upgrade is explicit and draft-only. Existing overrides and section IDs survive.
export function personalizeDesign(current: Design, fresh = false): Design {
  const copy = structuredClone(current);
  copy.version = 2;
  copy.theme = "curated";
  copy.settings = {
    ...copy.settings,
    palette:
      copy.settings.palette ??
      (fresh
        ? colorPresets.coast
        : {
            background:
              copy.settings.background === "white"
                ? "#ffffff"
                : copy.settings.background === "mist"
                  ? "#f1f5f9"
                  : "#fbfaf7",
            surface: "#ffffff",
            text: "#172640",
            accent: copy.settings.accent_color,
          }),
    font_pair:
      copy.settings.font_pair ??
      (fresh || copy.settings.heading_font === "serif"
        ? "editorial"
        : "modern"),
  };
  const newId = (base: string) => {
    let id = base;
    while (copy.templates.home.some((s) => s.id === id)) id += "-new";
    return id;
  };
  if (
    copy.templates.home.length < 25 &&
    !copy.templates.home.some((s) => s.type === "categories")
  )
    copy.templates.home.push({
      id: newId("theme-categories"),
      type: "categories",
      hidden: false,
      blocks: [],
      settings: { ...defaultSectionSettings, title: "Find your next favorite" },
    });
  if (
    copy.templates.home.length < 25 &&
    !copy.templates.home.some((s) => s.type === "about")
  )
    copy.templates.home.push({
      id: newId("theme-about"),
      type: "about",
      hidden: false,
      blocks: [],
      settings: { ...defaultSectionSettings, title: "A little about us" },
    });
  // Never replace authored content with suggested copy.
  return copy;
}
