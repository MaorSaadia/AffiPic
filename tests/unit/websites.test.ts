import { describe, expect, test } from "vitest";
import {
  websiteSchema,
  suggestSlug,
  reservedSlugs,
} from "@/lib/websites/schema";
const valid = {
  name: "My picks",
  slug: "my-picks",
  description: "My favorites",
};
test("normalizes names and addresses while preserving a readable description", () => {
  expect(
    websiteSchema.parse({
      name: " My picks ",
      slug: " My-Picks ",
      description: " My favorites ",
    }),
  ).toEqual(valid);
});
test.each([
  "ab",
  "a".repeat(49),
  "-leading",
  "trailing-",
  "double--dash",
  "with spaces",
  "https://example.com",
  "../private",
  "hello_world",
  "שלום",
])("invalid slug %s is rejected", (slug) => {
  expect(websiteSchema.safeParse({ ...valid, slug }).success).toBe(false);
});
test.each(reservedSlugs)("reserved slug %s is rejected", (slug) => {
  expect(websiteSchema.safeParse({ ...valid, slug }).success).toBe(false);
});
test("allows the length boundaries", () => {
  expect(
    websiteSchema.safeParse({
      name: "a".repeat(80),
      slug: "a".repeat(48),
      description: "a".repeat(500),
    }).success,
  ).toBe(true);
});
test("rejects blank name and overlong description", () => {
  expect(websiteSchema.safeParse({ ...valid, name: "  " }).success).toBe(false);
  expect(
    websiteSchema.safeParse({ ...valid, description: "a".repeat(501) }).success,
  ).toBe(false);
});
test("strips unknown ownership and status fields", () => {
  expect(
    websiteSchema.parse({
      ...valid,
      account_id: "victim",
      status: "published",
    }),
  ).toEqual(valid);
});
describe("slug suggestions", () => {
  test("handles accents, punctuation and whitespace", () => {
    expect(suggestSlug(" Café & Everyday Finds! ")).toBe("cafe-everyday-finds");
  });
  test("never leaves a trailing hyphen after truncation", () => {
    expect(suggestSlug("a".repeat(47) + " bbb")).toBe("a".repeat(47));
  });
  test("non-Latin names may use a manually chosen address", () => {
    expect(suggestSlug("שלום")).toBe("");
  });
});
