import { z } from "zod";

// URLs are unnecessary for writing. Do not forward affiliate tracking or contact details.
export function writingText(text: string) {
  return text
    .replace(/(?:https?:\/\/|www\.)\S+/gi, "")
    .replace(/\b[^\s@]+@[^\s@]+\.[^\s@]+\b/g, "")
    .replace(/<[^>]*>/g, "")
    .trim();
}
export const writingSchema = z
  .object({
    websiteId: z.uuid(),
    productId: z.uuid().nullable(),
    requestId: z.uuid(),
    name: z
      .string()
      .trim()
      .min(1, "Enter a product name.")
      .max(120)
      .transform(writingText),
    categoryId: z.uuid().nullable(),
    facts: z
      .string()
      .trim()
      .max(3000)
      .transform(writingText)
      .refine(
        (value) =>
          value.length >= 25 &&
          (value.match(/[\p{L}\p{N}]+/gu)?.length ?? 0) >= 5,
        "Add at least one specific feature or factual sentence (25 characters and five words).",
      ),
    tone: z.enum(["Friendly", "Professional", "Concise"]),
    length: z.enum(["Short", "Standard"]),
  })
  .refine(
    (value) =>
      value.name.length > 0 &&
      value.facts.toLowerCase() !== value.name.toLowerCase(),
    "Provide a product name and facts beyond its name.",
  );
export type WritingInput = z.input<typeof writingSchema>;
export type WritingState = {
  enabled?: boolean;
  remaining?: number;
  resetAt?: string;
  retryAt?: string;
  error?: string;
  description?: string;
};
export type WritingAction = (input: WritingInput) => Promise<WritingState>;
export type AllowanceAction = (websiteId: string) => Promise<WritingState>;

export function validateDescription(
  value: unknown,
  length: WritingInput["length"],
) {
  const max = length === "Short" ? 800 : 2000;
  if (typeof value !== "string") throw new Error("invalid-response");
  const text = value.trim();
  if (
    text.length < 20 ||
    text.length > max ||
    /[<>]|```|https?:\/\/|www\./i.test(text) ||
    /[\u0000-\u0008\u000b-\u001f]/.test(text)
  )
    throw new Error("invalid-response");
  return text;
}
