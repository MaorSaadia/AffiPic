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
    task: z.enum(["description", "titles"]).default("description"),
    name: z
      .string()
      .trim()
      .min(1, "Enter a product name.")
      .max(120)
      .transform(writingText),
    categoryId: z.uuid().nullable(),
    facts: z.string().trim().max(3000).transform(writingText),
    tone: z.enum([
      "Friendly",
      "Professional",
      "Playful",
      "Premium",
      "Straightforward",
      "Concise",
    ]),
    length: z.enum(["Short", "Standard", "Detailed"]),
    format: z
      .enum(["Paragraphs", "Bullet points", "Structured description"])
      .default("Paragraphs"),
    emojis: z.enum(["None", "Light", "Expressive"]).default("None"),
    audience: z.string().trim().max(150).transform(writingText).default(""),
    instructions: z.string().trim().max(600).transform(writingText).default(""),
    cta: z.boolean().default(false),
    useImage: z.boolean().default(false),
  })
  .refine(
    (value) =>
      value.name.length > 0 &&
      (value.useImage ||
        (value.facts.length >= 25 &&
          (value.facts.match(/[\p{L}\p{N}]+/gu)?.length ?? 0) >= 5 &&
          value.facts.toLowerCase() !== value.name.toLowerCase())),
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
  titles?: string[];
};
export type WritingAction = (
  input: WritingInput,
  image?: FormData,
) => Promise<WritingState>;
export type AllowanceAction = (websiteId: string) => Promise<WritingState>;

export function validateDescription(
  value: unknown,
  length: WritingInput["length"],
) {
  const max = length === "Short" ? 800 : length === "Detailed" ? 4500 : 2000;
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

export function validateTitles(value: unknown): string[] {
  const titles = z
    .array(
      z
        .string()
        .trim()
        .min(3)
        .max(90)
        .refine(
          (title) =>
            !/[<>\n\r*#]|https?:\/\/|www\.|\p{Extended_Pictographic}/u.test(
              title,
            ),
        ),
    )
    .length(3)
    .safeParse(value);
  if (
    !titles.success ||
    new Set(titles.data.map((title) => title.toLocaleLowerCase())).size !== 3
  )
    throw new Error("invalid-response");
  return titles.data;
}
