import { z } from "zod";
import { luminance } from "@/lib/branding/schema";
import type { CSSProperties } from "react";

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export function contrast(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export const paletteSchema = z
  .object({ background: color, surface: color, text: color, accent: color })
  .strict()
  .refine(
    (p) =>
      [p.background, p.surface, "#ffffff"].every(
        (bg) => contrast(p.text, bg) >= 4.5 && contrast(p.accent, bg) >= 4.5,
      ),
    "Choose text and accent colors with at least 4.5:1 contrast against the page, surface, and white buttons.",
  );
export const colorPresets = {
  coast: {
    background: "#fbfeff",
    surface: "#e8f8fc",
    text: "#063f5b",
    accent: "#006d89",
  },
  sage: {
    background: "#fcfdf9",
    surface: "#edf3e8",
    text: "#263c31",
    accent: "#365e46",
  },
  rose: {
    background: "#fffcfb",
    surface: "#fbeeea",
    text: "#4f3036",
    accent: "#933e55",
  },
  ink: {
    background: "#fcfcfd",
    surface: "#f0f1f5",
    text: "#202c42",
    accent: "#354b83",
  },
} as const;
export const fontPairs = {
  editorial: {
    heading: "Georgia, 'Times New Roman', serif",
    body: "'Avenir Next', 'Segoe UI', Arial, sans-serif",
  },
  modern: {
    heading: "Arial, Helvetica, sans-serif",
    body: "Arial, Helvetica, sans-serif",
  },
  classic: {
    heading: "Georgia, 'Times New Roman', serif",
    body: "Georgia, 'Times New Roman', serif",
  },
} as const;
export const socialSchema = z
  .object({
    label: z.string().trim().min(1).max(40),
    url: z
      .url()
      .max(500)
      .refine((v) => /^https:\/\//i.test(v), "Use an https:// address."),
  })
  .strict();
export const themeExtras = {
  site_name: z.string().trim().max(80).optional(),
  topic: z.string().trim().max(100).optional(),
  favicon_path: z
    .string()
    .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/)
    .nullable()
    .optional(),
  palette: paletteSchema.optional(),
  font_pair: z.enum(["editorial", "modern", "classic"]).optional(),
  button_style: z.enum(["pill", "soft", "square"]).optional(),
  card_style: z.enum(["soft", "bordered", "minimal"]).optional(),
  footer_text: z.string().max(500).optional(),
  social_links: z.array(socialSchema).max(6).optional(),
  category_ids: z
    .array(z.uuid())
    .max(50)
    .refine((v) => new Set(v).size === v.length)
    .optional(),
};
export type ThemeOptions = z.infer<z.ZodObject<typeof themeExtras>>;
export function themeStyles(options: ThemeOptions): CSSProperties {
  const checked = paletteSchema.safeParse(
    options.palette ?? colorPresets.coast,
  );
  const palette = checked.success ? checked.data : colorPresets.coast;
  const fonts = fontPairs[options.font_pair ?? "editorial"];
  return {
    "--theme-bg": palette.background,
    "--theme-surface": palette.surface,
    "--theme-text": palette.text,
    "--theme-accent": palette.accent,
    "--theme-heading": fonts.heading,
    "--theme-body": fonts.body,
    "--theme-button-radius":
      options.button_style === "square"
        ? "4px"
        : options.button_style === "soft"
          ? "12px"
          : "999px",
  } as CSSProperties;
}
