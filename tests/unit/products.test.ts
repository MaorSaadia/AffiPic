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

test("AI image input validates bytes and ownership and resizes privately", async () => {
  const { writingImage } = await import("@/lib/server/ai/image");
  const download = vi.fn();
  const client = {
    storage: { from: () => ({ download }) },
  } as unknown as Parameters<typeof writingImage>[0];
  const site = "00000000-0000-4000-8000-000000000001";
  const bytes = await sharp({
    create: { width: 1400, height: 800, channels: 3, background: "#204080" },
  })
    .png()
    .toBuffer();
  const upload = new FormData();
  upload.set("image", new File([bytes], "sample.png", { type: "image/png" }));
  const image = await writingImage(client, site, null, upload);
  expect(
    (await sharp(Buffer.from(image.data, "base64")).metadata()).width,
  ).toBe(1024);
  expect(download).not.toHaveBeenCalled();
  await expect(
    writingImage(client, site, "another-site/image.webp"),
  ).rejects.toThrow("owned image");
  download.mockResolvedValue({
    data: new Blob([bytes], { type: "image/png" }),
    error: null,
  });
  expect(
    (await writingImage(client, site, site + "/owned.webp")).mimeType,
  ).toBe("image/webp");
  expect(download).toHaveBeenCalledWith(site + "/owned.webp");
  upload.set(
    "image",
    new File(["not an image"], "fake.png", { type: "image/png" }),
  );
  await expect(writingImage(client, site, null, upload)).rejects.toThrow(
    "processed",
  );
});

test("formatted descriptions preserve save payload, safe rendering and legacy literal text", async () => {
  const { formattedDescription, descriptionExcerpt } =
    await import("@/lib/products/description");
  const { DescriptionView } =
    await import("@/components/products/description-view");
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const value = formattedDescription(
    "## Features\n\n**Bold** and *italic*\n\n- Blue design\n- Compact shape\n\n1. First\n2. Second",
  );
  expect(
    productSchema.parse({ ...fields, description: value }).description,
  ).toBe(value);
  const html = renderToStaticMarkup(createElement(DescriptionView, { value }));
  for (const tag of ["h3", "strong", "em", "ul", "ol"])
    expect(html).toContain("<" + tag + ">");
  expect(descriptionExcerpt(value)).not.toContain("affipic:");
  expect(descriptionExcerpt(value)).not.toContain("**");
  const malicious = renderToStaticMarkup(
    createElement(DescriptionView, {
      value: formattedDescription("<script>alert(1)</script>"),
    }),
  );
  expect(malicious).not.toContain("<script>");
  const legacy = renderToStaticMarkup(
    createElement(DescriptionView, { value: "**original literal text**" }),
  );
  expect(legacy).toContain("**original literal text**");
  expect(legacy).not.toContain("<strong>");
});
