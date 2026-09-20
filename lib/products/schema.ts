import { z } from "zod";
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const optionalId = z
  .union([z.uuid(), z.literal("")])
  .transform((value) => value || null);
export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a product name.")
    .max(120, "Use 120 characters or fewer."),
  description: z.string().trim().max(5000, "Use 5,000 characters or fewer."),
  affiliate_url: z
    .string()
    .trim()
    .max(2048)
    .refine((value) => {
      try {
        const url = new URL(value);
        return (
          /^https?:\/\//.test(value) &&
          ["https:", "http:"].includes(url.protocol) &&
          !!url.hostname &&
          !url.username &&
          !url.password &&
          !/\s/.test(value)
        );
      } catch {
        return false;
      }
    }, "Enter a complete http or https affiliate URL without login details."),
  category_id: optionalId,
  merchant_id: optionalId,
});
export type Product = {
  id: string;
  name: string;
  description: string;
  affiliate_url: string;
  category_id: string | null;
  merchant_id: string | null;
  image_path: string | null;
  revision: number;
  created_at: string;
  updated_at: string;
};
export type ProductView = Product & {
  imageUrl: string | null;
  imageError?: boolean;
};
export type ProductState = {
  error?: string;
  warning?: string;
  product?: ProductView;
  deleted?: boolean;
  success?: string;
};
export type ProductAction = (
  previous: ProductState,
  form: FormData,
) => Promise<ProductState>;
