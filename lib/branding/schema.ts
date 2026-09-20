import { z } from "zod";
import type { CSSProperties } from "react";
export const backgrounds = {
  ivory: "#fbfaf7",
  white: "#ffffff",
  mist: "#f1f5f9",
} as const;
export const headingFonts = {
  sans: "Arial, Helvetica, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
} as const;
export function luminance(hex: string) {
  const channels = [1, 3, 5]
    .map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
export function readableAccent(hex: string) {
  return (
    /^#[0-9a-f]{6}$/i.test(hex) &&
    Object.values(backgrounds).every(
      (bg) => (luminance(bg) + 0.05) / (luminance(hex) + 0.05) >= 4.5,
    )
  );
}
export const brandingSchema = z.object({
  accent_color: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^#[0-9a-f]{6}$/, "Use a six-digit hex color, like #2449c4.")
    .refine(
      readableAccent,
      "Choose a darker accent so links and white button text remain readable.",
    ),
  background: z.enum(["ivory", "white", "mist"]),
  heading_font: z.enum(["sans", "serif"]),
  hero_title: z
    .string()
    .trim()
    .max(120, "Use 120 characters or fewer for the headline."),
  hero_subtitle: z
    .string()
    .trim()
    .max(500, "Use 500 characters or fewer for the introduction."),
});
export type BrandingDesign = z.infer<typeof brandingSchema>;
export const defaultBranding: BrandingDesign = {
  accent_color: "#2449c4",
  background: "ivory",
  heading_font: "sans",
  hero_title: "",
  hero_subtitle: "",
};
export type Branding = BrandingDesign & {
  logo_path: string | null;
  revision: number;
};
export type BrandingView = Branding & {
  logoUrl: string | null;
  logoError?: boolean;
};
export type BrandingState = {
  error?: string;
  warning?: string;
  success?: string;
  branding?: BrandingView;
};
export type BrandingAction = (
  state: BrandingState,
  form: FormData,
) => Promise<BrandingState>;
export const MAX_LOGO_BYTES = 1024 * 1024;
export const brandingColumns =
  "accent_color,background,heading_font,hero_title,hero_subtitle,logo_path";
export function brandingStyles(input?: BrandingDesign): CSSProperties {
  const parsed = brandingSchema.safeParse(input);
  const value = parsed.success ? parsed.data : defaultBranding;
  return {
    "--brand-accent": value.accent_color,
    "--brand-background": backgrounds[value.background],
    "--brand-heading-font": headingFonts[value.heading_font],
  } as CSSProperties;
}

export const ownerBrandingColumns =
  "accent_color,background,heading_font,hero_title,hero_subtitle,logo_path,revision";
