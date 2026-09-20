import { expect, test, vi } from "vitest";
import sharp from "sharp";
vi.mock("server-only", () => ({}));
import { prepareProductImage } from "@/lib/server/product-images";
import { productSchema, MAX_IMAGE_BYTES } from "@/lib/products/schema";
const fields = {
  name: " Find ",
  description: "",
  category_id: "",
  merchant_id: "",
  affiliate_url: "https://shop.example/item?tag=mine",
};
test("normalizes optional relationships and whitespace", () => {
  expect(productSchema.parse(fields)).toMatchObject({
    name: "Find",
    category_id: null,
    merchant_id: null,
  });
});
test.each([
  "javascript:alert(1)",
  "data:image/png,abc",
  "//shop.example",
  "ftp://shop.example",
  "https://user:pass@shop.example",
  "https://bad host",
])("rejects unsafe URL %s", (url) => {
  expect(
    productSchema.safeParse({ ...fields, affiliate_url: url }).success,
  ).toBe(false);
});
test.each(["jpeg", "png", "webp"] as const)(
  "decodes %s, resizes and strips metadata",
  async (format) => {
    const bytes = await sharp({
      create: { width: 2000, height: 1000, channels: 3, background: "#3466aa" },
    })
      .withMetadata()
      .toFormat(format)
      .toBuffer();
    const output = await prepareProductImage(
      new File([new Uint8Array(bytes)], "test." + format, {
        type: "image/" + format,
      }),
    );
    const metadata = await sharp(output).metadata();
    expect(metadata).toMatchObject({
      format: "webp",
      width: 1600,
      height: 800,
    });
    expect(metadata.exif).toBeUndefined();
  },
);
test("rejects disguised SVG and corrupt image bytes", async () => {
  await expect(
    prepareProductImage(
      new File(
        ['<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'],
        "image.png",
        { type: "image/png" },
      ),
    ),
  ).rejects.toThrow(/could not be processed/);
  await expect(
    prepareProductImage(
      new File(["not a jpeg"], "x.jpg", { type: "image/jpeg" }),
    ),
  ).rejects.toThrow(/could not be processed/);
});
test("rejects oversized file before decoding", async () => {
  await expect(
    prepareProductImage(
      new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], "x.jpg", {
        type: "image/jpeg",
      }),
    ),
  ).rejects.toThrow(/2 MB/);
});
test("rejects oversized dimensions", async () => {
  const bytes = await sharp({
    create: { width: 6000, height: 5000, channels: 3, background: "#fff" },
  })
    .png()
    .toBuffer();
  await expect(
    prepareProductImage(
      new File([new Uint8Array(bytes)], "x.png", { type: "image/png" }),
    ),
  ).rejects.toThrow(/25 megapixels/);
});
