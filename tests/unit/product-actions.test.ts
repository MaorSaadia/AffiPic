import { beforeEach, expect, test, vi } from "vitest";
const m = vi.hoisted(() => ({
  auth: vi.fn(),
  from: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  prepare: vi.fn(),
  sign: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/auth", () => ({ requireUser: m.auth }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidate }));
vi.mock("@/lib/server/product-images", () => ({
  PRODUCT_BUCKET: "product-images",
  prepareProductImage: m.prepare,
  removeProductImage: m.remove,
  signProductImage: m.sign,
}));
import { saveProduct } from "@/app/(dashboard)/dashboard/products/actions";
const site = "00000000-0000-4000-8000-000000000001",
  id = "00000000-0000-4000-8000-000000000002";
const old = {
  id,
  name: "Find",
  description: "",
  affiliate_url: "https://shop.example",
  category_id: null,
  merchant_id: null,
  image_path: site + "/old.webp",
  revision: 1,
  created_at: "",
  updated_at: "",
};
type Call = {
  table: string;
  operation: string;
  values?: unknown;
  filters: Record<string, unknown>;
};
let calls: Call[],
  missingSite: boolean,
  missingProduct: boolean,
  missingRelation: boolean,
  stale: boolean,
  writeError: { code: string } | null,
  writeNull: boolean;
function form(extra: Record<string, string> = {}, image = false) {
  const data = new FormData();
  Object.entries({
    operation: "update",
    id,
    revision: "1",
    name: "Find",
    description: "",
    affiliate_url: "https://shop.example",
    category_id: "",
    merchant_id: "",
    ...extra,
  }).forEach(([k, v]) => data.set(k, v));
  if (image)
    data.set("image", new File(["image"], "test.png", { type: "image/png" }));
  return data;
}
beforeEach(() => {
  vi.resetAllMocks();
  calls = [];
  missingSite = false;
  missingProduct = false;
  missingRelation = false;
  stale = false;
  writeError = null;
  writeNull = false;
  m.prepare.mockResolvedValue(Buffer.from("webp"));
  m.upload.mockResolvedValue({ error: null });
  m.remove.mockResolvedValue(true);
  m.sign.mockResolvedValue({ imageUrl: "signed-url" });
  m.from.mockImplementation((table: string) => {
    const call: Call = { table, operation: "select", filters: {} };
    calls.push(call);
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn((k: string, v: unknown) => {
        call.filters[k] = v;
        return query;
      }),
      insert: vi.fn((values: unknown) => {
        call.operation = "insert";
        call.values = values;
        return query;
      }),
      update: vi.fn((values: unknown) => {
        call.operation = "update";
        call.values = values;
        return query;
      }),
      delete: vi.fn(() => {
        call.operation = "delete";
        return query;
      }),
      maybeSingle: vi.fn(async () => {
        if (table === "websites")
          return { data: missingSite ? null : { id: site }, error: null };
        if (table === "categories" || table === "merchants")
          return { data: missingRelation ? null : { id }, error: null };
        if (call.operation === "select")
          return {
            data: missingProduct ? null : { ...old, revision: stale ? 2 : 1 },
            error: null,
          };
        return {
          data:
            writeNull || writeError
              ? null
              : { ...old, ...(call.values as object), revision: 2 },
          error: writeError,
        };
      }),
    };
    return query;
  });
  m.auth.mockResolvedValue({
    user: { id: "verified-user" },
    supabase: { from: m.from, storage: { from: () => ({ upload: m.upload }) } },
  });
});
test("creation ignores supplied website/image path and uses verified ownership", async () => {
  const result = await saveProduct(
    {},
    form({
      operation: "create",
      website_id: "victim",
      image_path: "victim/secret.webp",
    }),
  );
  expect(result.success).toBe("Product saved.");
  expect(calls[0].filters).toEqual({ account_id: "verified-user" });
  expect(calls.find((c) => c.operation === "insert")?.values).toMatchObject({
    website_id: site,
    image_path: null,
  });
});
test("upload occurs before product save and old-image removal follows success", async () => {
  const result = await saveProduct({}, form({}, true));
  expect(result.product).toBeTruthy();
  expect(m.upload.mock.calls[0][0]).toMatch(
    new RegExp("^" + site + "/.+\\.webp$"),
  );
  expect(m.upload.mock.calls[0][2]).toMatchObject({
    upsert: false,
    contentType: "image/webp",
  });
  expect(calls.find((c) => c.operation === "update")?.filters).toEqual({
    website_id: site,
    id,
    revision: 1,
  });
  expect(m.remove).toHaveBeenCalledWith(expect.anything(), old.image_path);
  expect(m.upload.mock.invocationCallOrder[0]).toBeLessThan(
    m.remove.mock.invocationCallOrder[0],
  );
});
test("upload failure leaves product and old image untouched", async () => {
  m.upload.mockResolvedValue({ error: { message: "failed" } });
  expect((await saveProduct({}, form({}, true))).error).toContain(
    "upload failed",
  );
  expect(calls.some((c) => c.operation === "update")).toBe(false);
  expect(m.remove).not.toHaveBeenCalled();
});
test("confirmed FK failure compensates new upload only", async () => {
  writeError = { code: "23503" };
  expect((await saveProduct({}, form({}, true))).error).toContain("category");
  expect(m.remove).toHaveBeenCalledWith(
    expect.anything(),
    m.upload.mock.calls[0][0],
  );
  expect(m.remove).not.toHaveBeenCalledWith(expect.anything(), old.image_path);
});
test("uncertain write outcome preserves images for reconciliation", async () => {
  writeError = { code: "network" };
  expect((await saveProduct({}, form({}, true))).error).toContain("Reload");
  expect(m.remove).not.toHaveBeenCalled();
});
test("stale revision rejected before upload", async () => {
  stale = true;
  expect((await saveProduct({}, form({}, true))).error).toContain(
    "another tab",
  );
  expect(m.upload).not.toHaveBeenCalled();
});
test("concurrent update losing revision match cleans only unused new upload", async () => {
  writeNull = true;
  expect((await saveProduct({}, form({}, true))).error).toBeTruthy();
  expect(m.remove).toHaveBeenCalledWith(
    expect.anything(),
    m.upload.mock.calls[0][0],
  );
});
test("foreign product cannot upload or mutate", async () => {
  missingProduct = true;
  expect((await saveProduct({}, form({}, true))).error).toContain(
    "unavailable",
  );
  expect(m.upload).not.toHaveBeenCalled();
  expect(calls.some((c) => c.operation === "update")).toBe(false);
});
test("foreign category rejected before uploading", async () => {
  missingRelation = true;
  expect(
    (await saveProduct({}, form({ category_id: id }, true))).error,
  ).toContain("unavailable");
  expect(m.upload).not.toHaveBeenCalled();
});
test("missing website blocks creation", async () => {
  missingSite = true;
  expect(
    (await saveProduct({}, form({ operation: "create" }))).error,
  ).toContain("Create your website");
});
test("no image change keeps old path", async () => {
  await saveProduct({}, form());
  expect(calls.find((c) => c.operation === "update")?.values).toMatchObject({
    image_path: old.image_path,
  });
  expect(m.remove).not.toHaveBeenCalled();
});
test("remove image saves null before cleanup", async () => {
  await saveProduct({}, form({ remove_image: "on" }));
  expect(calls.find((c) => c.operation === "update")?.values).toMatchObject({
    image_path: null,
  });
  expect(m.remove).toHaveBeenCalledWith(expect.anything(), old.image_path);
});
test("cleanup failure does not conceal successful save", async () => {
  m.remove.mockResolvedValue(false);
  const result = await saveProduct({}, form({ remove_image: "on" }));
  expect(result.success).toBeTruthy();
  expect(result.warning).toContain("cleanup");
});
test("delete ignores invalid editor fields and then removes image", async () => {
  const result = await saveProduct(
    {},
    form({ operation: "delete", name: "", affiliate_url: "invalid" }),
  );
  expect(result.deleted).toBe(true);
  expect(m.remove).toHaveBeenCalledWith(expect.anything(), old.image_path);
});
test("failed delete leaves image intact", async () => {
  writeNull = true;
  expect(
    (await saveProduct({}, form({ operation: "delete" }))).error,
  ).toBeTruthy();
  expect(m.remove).not.toHaveBeenCalled();
});
test("invalid bytes return useful error without mutation", async () => {
  m.prepare.mockRejectedValue(new Error("Invalid image"));
  expect((await saveProduct({}, form({}, true))).error).toBe("Invalid image");
  expect(m.upload).not.toHaveBeenCalled();
});
test("unauthenticated action never touches data", async () => {
  m.auth.mockRejectedValue(new Error("login"));
  await expect(saveProduct({}, form())).rejects.toThrow("login");
  expect(m.from).not.toHaveBeenCalled();
});
test.each<Record<string, string>>([
  { affiliate_url: "javascript:alert(1)" },
  { name: " " },
  { category_id: "invalid" },
  { operation: "bad" },
  { id: "invalid" },
  { revision: "0" },
])("rejects invalid input %j", async (input) => {
  expect((await saveProduct({}, form(input))).error).toBeTruthy();
  expect(m.from).not.toHaveBeenCalled();
});
