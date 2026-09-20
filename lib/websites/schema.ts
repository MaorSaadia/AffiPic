import { z } from "zod";
export const reservedSlugs = [
  "admin",
  "api",
  "app",
  "auth",
  "billing",
  "dashboard",
  "help",
  "login",
  "logout",
  "new",
  "settings",
  "signup",
  "support",
  "www",
  "affipic",
];
export const websiteSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give your website a name.")
    .max(80, "Use 80 characters or fewer."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Use at least 3 characters.")
    .max(48, "Use 48 characters or fewer.")
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and single hyphens between words.",
    )
    .refine(
      (value) => !reservedSlugs.includes(value),
      "This address is reserved. Choose another.",
    ),
  description: z.string().trim().max(500, "Use 500 characters or fewer."),
});
export type WebsiteDetails = z.infer<typeof websiteSchema>;
export type Website = WebsiteDetails & {
  id: string;
  status: "draft";
  created_at: string;
  updated_at: string;
};
export type WebsiteState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof WebsiteDetails, string>>;
  values?: WebsiteDetails;
  website?: Website;
  success?: string;
};
export type WebsiteAction = (
  state: WebsiteState,
  form: FormData,
) => Promise<WebsiteState>;
export function suggestSlug(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
}
