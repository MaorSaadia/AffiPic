"use server";
import { z } from "zod";
import { requireUser } from "@/lib/server/auth";
import {
  writingSchema,
  writingText,
  validateDescription,
  validateTitles,
  type WritingInput,
  type WritingState,
} from "@/lib/ai/schema";
import { writingConfig, writingDatabase } from "@/lib/server/ai/config";
import { geminiProvider } from "@/lib/server/ai/provider";
import { writingImage } from "@/lib/server/ai/image";

const unavailable =
  "AI writing is not configured yet. You can keep editing manually.";
const temporary =
  "AI writing is temporarily unavailable. Your product has not changed. Please try again later.";
function allowanceState(data: Record<string, unknown> | null): WritingState {
  return {
    ...(typeof data?.remaining === "number"
      ? { remaining: data.remaining }
      : {}),
    ...(typeof data?.resetAt === "string" ? { resetAt: data.resetAt } : {}),
    ...(typeof data?.retryAt === "string" ? { retryAt: data.retryAt } : {}),
  };
}
export async function getWritingAllowance(
  websiteId: string,
): Promise<WritingState> {
  const { user } = await requireUser();
  if (!z.uuid().safeParse(websiteId).success)
    return { error: "Website unavailable." };
  const config = writingConfig();
  if (!config) return { enabled: false, error: unavailable };
  try {
    const { data, error } = await writingDatabase(config).rpc("ai_allowance", {
      p_account: user.id,
      p_website: websiteId,
    });
    if (error || data?.code !== "ready")
      return { enabled: false, error: temporary };
    return { enabled: true, ...allowanceState(data) };
  } catch {
    return { enabled: false, error: temporary };
  }
}

export async function generateDescription(
  input: WritingInput,
  upload?: FormData,
): Promise<WritingState> {
  const { user, supabase } = await requireUser();
  const parsed = writingSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const config = writingConfig();
  if (!config) return { enabled: false, error: unavailable };
  const values = parsed.data;
  const db = writingDatabase(config);
  let reserved = false;
  let finalizing = false;
  let state: WritingState = {};
  try {
    // Validate every reference using the authenticated client's RLS before reserving.
    const owned = await supabase
      .from("websites")
      .select("id")
      .eq("id", values.websiteId)
      .eq("account_id", user.id)
      .maybeSingle();
    if (owned.error || !owned.data) return { error: "Website unavailable." };
    let imagePath: string | null = null;
    if (values.productId) {
      const product = await supabase
        .from("products")
        .select("id,image_path")
        .eq("id", values.productId)
        .eq("website_id", values.websiteId)
        .maybeSingle();
      if (product.error || !product.data)
        return { error: "Product unavailable." };
      imagePath = product.data.image_path ?? null;
    }
    let image: { mimeType: string; data: string } | undefined;
    if (values.useImage) {
      if (!["gemini-3.1-flash-lite", "gemini-3.6-flash"].includes(config.model))
        return {
          error:
            "Image assistance is verified for gemini-3.1-flash-lite and gemini-3.6-flash. Configure that model or turn image assistance off for text-only writing.",
        };
      try {
        image = await writingImage(
          supabase,
          values.websiteId,
          imagePath,
          upload,
        );
      } catch (error) {
        return {
          error:
            error instanceof Error
              ? error.message
              : "Image processing failed. Retry or turn image assistance off.",
        };
      }
    }
    let category = "";
    if (values.categoryId) {
      const found = await supabase
        .from("categories")
        .select("name")
        .eq("id", values.categoryId)
        .eq("website_id", values.websiteId)
        .maybeSingle();
      if (found.error || !found.data) return { error: "Category unavailable." };
      category = writingText(String(found.data.name).slice(0, 120));
    }
    // Topic comes from the existing private draft. No separate brand settings are created.
    const design = await supabase
      .from("website_designs")
      .select("draft")
      .eq("website_id", values.websiteId)
      .maybeSingle();
    if (design.error) return { error: temporary };
    const topicValue = design.data?.draft?.settings?.topic;
    const topic =
      typeof topicValue === "string"
        ? writingText(topicValue.slice(0, 100))
        : "";
    const reservation = await db.rpc("ai_reserve", {
      p_account: user.id,
      p_website: values.websiteId,
      p_product: values.productId,
      p_request: values.requestId,
      p_model: config.model,
    });
    if (reservation.error || !reservation.data) return { error: temporary };
    state = allowanceState(reservation.data);
    const messages: Record<string, string> = {
      ownership: "Website or product unavailable.",
      invalid: "Check the product information.",
      duplicate:
        "This request has already been handled. It will not generate or charge again. Start a new attempt if needed.",
      running:
        "Another request is already running for your account. Wait for it to finish (up to two minutes).",
      exhausted:
        "Your daily AI allowance is exhausted. It resets at 00:00 UTC.",
      cooldown: "Please wait for the short cooldown before trying again.",
      capacity:
        "Shared AI service capacity has been reached. Please try after the next UTC reset.",
    };
    if (reservation.data.code !== "reserved")
      return { ...state, error: messages[reservation.data.code] ?? temporary };
    reserved = true;
    const generated = await geminiProvider(
      config.apiKey,
      config.model,
    ).generate({
      task: values.task,
      name: values.name,
      facts: values.facts,
      tone: values.tone,
      length: values.length,
      category,
      topic,
      format: values.format,
      emojis: values.emojis,
      audience: values.audience,
      instructions: values.instructions,
      cta: values.cta,
      ...(image ? { image } : {}),
    });
    const result =
      values.task === "titles"
        ? { titles: validateTitles(generated.titles) }
        : { description: validateDescription(generated.text, values.length) };
    const tokens = (value: number | undefined) =>
      Number.isInteger(value) && value! >= 0 && value! <= 2147483647
        ? value
        : null;
    finalizing = true;
    const finalized = await db.rpc("ai_finish", {
      p_account: user.id,
      p_request: values.requestId,
      p_success: true,
      p_input: tokens(generated.inputTokens),
      p_output: tokens(generated.outputTokens),
    });
    // An uncertain commit must never display uncharged output or call the provider again.
    reserved = false;
    if (finalized.error || finalized.data !== true)
      return {
        ...state,
        error:
          "The result could not be confirmed. Refresh the allowance before a new attempt; this generation may have counted.",
      };
    return {
      ...state,
      remaining: Math.max(0, (state.remaining ?? 1) - 1),
      ...result,
    };
  } catch (error) {
    if (finalizing)
      return {
        ...state,
        error:
          "The result could not be confirmed. Refresh the allowance before a new attempt; this generation may have counted.",
      };
    if (reserved) {
      try {
        await db.rpc("ai_finish", {
          p_account: user.id,
          p_request: values.requestId,
          p_success: false,
        });
      } catch {
        /* The durable lease expires. Never log provider payloads or secrets. */
      }
    }
    const status =
      error && typeof error === "object" && "status" in error
        ? error.status
        : null;
    const invalid =
      error instanceof Error &&
      (error.message === "invalid-response" || error instanceof SyntaxError);
    return {
      ...state,
      error:
        error instanceof Error && error.message.startsWith("clarification:")
          ? "Please clarify: " +
            error.message.slice(14) +
            " Your allowance was not used."
          : status === 429
            ? "The AI provider is rate limited. Try again later. Your successful-generation allowance was not used."
            : invalid
              ? "AI could not produce usable suggestions. Add clearer facts and try again. Your allowance was not used."
              : "The AI provider timed out or is temporarily unavailable. Your allowance was not used. Try again later.",
    };
  }
}
