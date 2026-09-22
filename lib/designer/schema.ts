import { z } from "zod";
import { brandingSchema, defaultBranding } from "@/lib/branding/schema";

export const sectionTypes = [
  "hero",
  "catalog",
  "text",
  "image",
  "products",
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
    version: z.literal(1),
    theme: z.literal("storefront"),
    settings: brandingSchema.extend({ logo_path: assetPath }).strict(),
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
