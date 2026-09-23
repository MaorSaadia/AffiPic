import type { PublicProduct } from "@/lib/public/schema";
// Editor-only display data. Invalid catalog IDs and empty merchant links make
// accidental persistence impossible at both the schema and database boundaries.
export const previewSamples: PublicProduct[] = [
  "Everyday notebook",
  "Ceramic cup",
  "Reading light",
  "Canvas carryall",
].map((name, index) => ({
  id: `sample-${index}`,
  name,
  description: "Sample content for preview only.",
  affiliate_url: "",
  category_id: null,
  merchant_id: null,
  image_path: null,
}));
