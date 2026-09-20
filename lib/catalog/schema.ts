import { z } from "zod";
export const catalogKind = z.enum(["categories", "merchants"]);
export type CatalogKind = z.infer<typeof catalogKind>;
export const catalogName = z
  .string()
  .trim()
  .min(1, "Enter a name.")
  .max(80, "Use 80 characters or fewer.");
export type CatalogItem = { id: string; name: string };
export type CatalogState = { error?: string; success?: string };
export type CatalogAction = (
  state: CatalogState,
  form: FormData,
) => Promise<CatalogState>;
