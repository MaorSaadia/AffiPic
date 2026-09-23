import { expect, test } from "vitest";
import {
  brandingSchema,
  defaultBranding,
  brandingStyles,
  readableAccent,
} from "@/lib/branding/schema";
test.each(["#2449c4", "#166534", "#9f1239", "#000000"])(
  "readable accent %s",
  (color) => {
    expect(readableAccent(color)).toBe(true);
  },
);
test.each(["#ffffff", "#ffff00", "#777777", "red", "url(javascript:alert(1))"])(
  "rejects unreadable or injected color %s",
  (color) => {
    expect(
      brandingSchema.safeParse({ ...defaultBranding, accent_color: color })
        .success,
    ).toBe(false);
  },
);
test("normalizes hex and hero text", () => {
  expect(
    brandingSchema.parse({
      ...defaultBranding,
      accent_color: " #2449C4 ",
      hero_title: " My picks ",
    }),
  ).toMatchObject({ accent_color: "#2449c4", hero_title: "My picks" });
});
test("limits text and font choices", () => {
  expect(
    brandingSchema.safeParse({
      ...defaultBranding,
      hero_title: "a".repeat(121),
    }).success,
  ).toBe(false);
  expect(
    brandingSchema.safeParse({ ...defaultBranding, heading_font: "url(evil)" })
      .success,
  ).toBe(false);
});
test("styles fall back to safe defaults for malformed persisted data", () => {
  expect(
    brandingStyles({ ...defaultBranding, accent_color: "red;display:none" }),
  ).toEqual(brandingStyles(defaultBranding));
});

// Theme upgrades preserve overrides; samples can never become catalog references.
import {
  designSchema,
  initialDesign,
  personalizeDesign,
} from "@/lib/designer/schema";
import { colorPresets, paletteSchema } from "@/lib/designer/theme-settings";
test("curated upgrade keeps content and rejects sample selections and script links", () => {
  const old = initialDesign({
    ...defaultBranding,
    hero_title: "My own wording",
    accent_color: "#166534",
    logo_path: null,
  });
  const design = personalizeDesign(old);
  expect(design.templates.home[0]).toEqual(old.templates.home[0]);
  expect(design.settings.palette?.accent).toBe("#166534");
  expect(old.version).toBe(1);
  expect(designSchema.safeParse(design).success).toBe(true);
  design.templates.home[0].settings.product_ids = ["sample-1"];
  expect(designSchema.safeParse(design).success).toBe(false);
  design.templates.home[0].settings.product_ids = [];
  design.settings.social_links = [
    { label: "Unsafe", url: "javascript:alert(1)" },
  ];
  expect(designSchema.safeParse(design).success).toBe(false);
  for (const palette of Object.values(colorPresets))
    expect(paletteSchema.safeParse(palette).success).toBe(true);
});
