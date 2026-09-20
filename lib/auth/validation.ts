import { z } from "zod";
export const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .max(254);
export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128, "Use no more than 128 characters.");
export const nameSchema = z
  .string()
  .trim()
  .min(1, "Enter your name.")
  .max(80, "Use no more than 80 characters.");
export type FormState = { error?: string; success?: string };
export function safeNext(value: unknown) {
  // Only known dashboard destinations are accepted, including query/hash-free paths.
  const paths = [
    "/dashboard",
    "/dashboard/products",
    "/dashboard/categories",
    "/dashboard/merchants",
    "/dashboard/collections",
    "/dashboard/guides",
    "/dashboard/settings",
    "/dashboard/analytics",
    "/dashboard/billing",
    "/dashboard/account",
  ];
  return typeof value === "string" && paths.includes(value)
    ? value
    : "/dashboard";
}
