"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DescriptionEditor } from "./description-editor";
import { formattedDescription } from "@/lib/products/description";
import {
  writingSchema,
  type WritingAction,
  type AllowanceAction,
  type WritingInput,
  type WritingState,
} from "@/lib/ai/schema";
export type WritingControls = {
  websiteId: string;
  generate: WritingAction;
  allowance: AllowanceAction;
};
type Preferences = Pick<
  WritingInput,
  "tone" | "length" | "format" | "emojis" | "audience" | "instructions" | "cta"
>;
const defaults: Preferences = {
  tone: "Friendly",
  length: "Standard",
  format: "Paragraphs",
  emojis: "None",
  audience: "",
  instructions: "",
  cta: false,
};
export function AiDescription({
  controls,
  productId,
  name,
  categoryId,
  categoryName,
  imageFile,
  hasImage,
  onApply,
  onUnsaved,
  titleContainer,
  onApplyTitle,
  savePending,
}: {
  controls: WritingControls;
  productId: string | null;
  name: string;
  categoryId: string | null;
  categoryName: string;
  imageFile: File | null;
  hasImage: boolean;
  onApply: (value: string) => void;
  onUnsaved: (value: boolean) => void;
  titleContainer: HTMLDivElement | null;
  onApplyTitle: (value: string) => void;
  savePending: boolean;
}) {
  const { websiteId, allowance } = controls;
  const [facts, setFacts] = useState("");
  const [prefs, setPrefs] = useState<Preferences>(defaults);
  const [useImage, setUseImage] = useState(false);
  const [titles, setTitles] = useState<string[]>([]);
  const [requestTask, setRequestTask] = useState<"description" | "titles">(
    "description",
  );
  const [result, setResult] = useState("");
  const [state, setState] = useState<WritingState>({});
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const requestId = useRef<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const storageKey = "affipic:writing:" + websiteId;
  useEffect(() => {
    let active = true;
    // Browser-only preferences; never store image consent, facts, or generated content.
    Promise.resolve().then(() => {
      try {
        const stored = JSON.parse(localStorage.getItem(storageKey) || "null");
        if (stored && active) {
          const parsed = writingSchema.safeParse({
            ...defaults,
            ...stored,
            websiteId: websiteId,
            productId: null,
            requestId: crypto.randomUUID(),
            categoryId: null,
            name: "Preferences",
            facts: "Enough factual information to validate preferences.",
            useImage: false,
          });
          if (parsed.success) {
            const {
              tone,
              length,
              format,
              emojis,
              audience,
              instructions,
              cta,
            } = parsed.data;
            setPrefs({
              tone,
              length,
              format,
              emojis,
              audience,
              instructions,
              cta,
            });
          }
        }
      } catch {
        /* Private browsing or invalid preferences: use defaults. */
      }
    });
    allowance(websiteId)
      .then((value) => {
        if (active) setState(value);
      })
      .catch(() => {
        if (active)
          setState({
            error:
              "Allowance unavailable. Refresh to retry; manual editing is available.",
          });
      });
    return () => {
      active = false;
    };
  }, [allowance, websiteId, storageKey]);
  function preferences(next: Preferences) {
    setPrefs(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* Preferences remain available for this session. */
    }
  }
  async function refresh() {
    try {
      setState(await allowance(websiteId));
    } catch {
      setState({ error: "Allowance unavailable. Please try again." });
    }
  }
  async function generate(task: "description" | "titles" = "description") {
    if (pending.current || (uncertain && task !== requestTask)) return;
    setRequestTask(task);
    if (useImage && !hasImage) {
      setState((old) => ({
        ...old,
        error: "Select a product image or turn image assistance off.",
      }));
      return;
    }
    const input: WritingInput = {
      ...prefs,
      task,
      websiteId: websiteId,
      productId,
      requestId: requestId.current ?? crypto.randomUUID(),
      name,
      facts,
      categoryId,
      useImage,
    };
    const parsed = writingSchema.safeParse(input);
    if (!parsed.success) {
      setState((old) => ({ ...old, error: parsed.error.issues[0].message }));
      return;
    }
    pending.current = true;
    setBusy(true);
    requestId.current = input.requestId;
    try {
      const upload = new FormData();
      if (useImage && imageFile) upload.set("image", imageFile);
      const next = await controls.generate(input, upload);
      setState((old) => ({ ...old, ...next, error: next.error }));
      if (next.titles) setTitles(next.titles);
      if (next.description) {
        setResult(formattedDescription(next.description));
        onUnsaved(true);
      }
      requestId.current = null;
      setUncertain(false);
    } catch {
      setUncertain(true);
      setState((old) => ({
        ...old,
        error:
          "The connection was interrupted. Check this request before starting another; it may have counted.",
      }));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="inline-writing" aria-label="AI writing assistant">
      {titleContainer &&
        createPortal(
          <div className="title-assistance">
            <Button
              type="button"
              variant="outline"
              disabled={
                busy ||
                savePending ||
                state.enabled !== true ||
                (!uncertain && state.remaining === 0) ||
                (uncertain && requestTask !== "titles")
              }
              onClick={() => generate("titles")}
            >
              {busy && requestTask === "titles"
                ? "Suggesting titles..."
                : uncertain && requestTask === "titles"
                  ? "Check title request"
                  : "Suggest titles with AI"}
            </Button>
            <p className="field-hint">
              Uses the current name, product facts below, and image only when
              enabled. Three suggestions use one allowance.{" "}
              {state.remaining !== undefined
                ? `${state.remaining} remaining today.`
                : "Checking AI availability..."}
            </p>
            {requestTask === "titles" && state.error && (
              <p role="alert">{state.error}</p>
            )}
            {state.enabled === false &&
              requestTask !== "titles" &&
              state.error && <p role="status">{state.error}</p>}
            {!!titles.length && (
              <div
                className="title-suggestions"
                aria-label="Suggested product titles"
              >
                {titles.map((title) => (
                  <Button
                    type="button"
                    variant="outline"
                    key={title}
                    disabled={savePending}
                    onClick={() => onApplyTitle(title)}
                  >
                    {title}
                  </Button>
                ))}
              </div>
            )}
            {!!titles.length && (
              <p className="field-hint">
                Choose a title to use it in the form. Nothing is saved
                automatically.
              </p>
            )}
          </div>,
          titleContainer,
        )}
      <div className="writing-heading">
        <span className="writing-badge">WRITING ASSISTANT</span>
        <h2>Shape your product story</h2>
        <p>
          Start with facts. Review every claim before applying a suggestion.
        </p>
      </div>
      <label className="product-checkbox">
        <input
          type="checkbox"
          checked={useImage}
          onChange={(e) => setUseImage(e.target.checked)}
          disabled={busy}
        />
        Use this image for AI titles and descriptions.
      </label>
      <p className="field-hint">
        Off by default. Enabling this sends the selected product image to Google
        Gemini only when you click Generate. Images can support visible details,
        not safety or material claims.
      </p>
      {categoryName && <p className="field-hint">Category: {categoryName}</p>}
      <div className="form-field">
        <Label htmlFor="ai-facts">Product facts and features</Label>
        <Textarea
          id="ai-facts"
          rows={5}
          maxLength={3000}
          value={facts}
          onChange={(e) => {
            setFacts(e.target.value);
            onUnsaved(!!e.target.value || !!result);
          }}
        />
        <p className="field-hint">
          Separate source notes, not the description. Include only known facts;
          exclude private information. URLs are omitted.
        </p>
      </div>
      <div className="form-field">
        <Label htmlFor="ai-preset">Style preset</Label>
        <select
          id="ai-preset"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value === "clean")
              preferences({
                ...prefs,
                tone: "Professional",
                length: "Standard",
                format: "Paragraphs",
                emojis: "None",
                cta: false,
              });
            if (e.target.value === "friendly")
              preferences({
                ...prefs,
                tone: "Friendly",
                length: "Standard",
                format: "Structured description",
                emojis: "Light",
                cta: true,
              });
            if (e.target.value === "detailed")
              preferences({
                ...prefs,
                tone: "Straightforward",
                length: "Detailed",
                format: "Bullet points",
                emojis: "None",
                cta: false,
              });
          }}
        >
          <option value="">Choose a starting point</option>
          <option value="clean">Clean &amp; professional</option>
          <option value="friendly">Friendly with emojis</option>
          <option value="detailed">Detailed feature breakdown</option>
        </select>
      </div>
      <div className="writing-options">
        {(
          [
            [
              "tone",
              "Writing style",
              [
                "Friendly",
                "Professional",
                "Playful",
                "Premium",
                "Straightforward",
              ],
            ],
            ["length", "Length", ["Short", "Standard", "Detailed"]],
            [
              "format",
              "Format",
              ["Paragraphs", "Bullet points", "Structured description"],
            ],
            ["emojis", "Emojis", ["None", "Light", "Expressive"]],
          ] as const
        ).map(([key, label, options]) => (
          <div className="form-field" key={key}>
            <Label htmlFor={"ai-" + key}>{label}</Label>
            <select
              id={"ai-" + key}
              value={prefs[key]}
              onChange={(e) => preferences({ ...prefs, [key]: e.target.value })}
            >
              {options.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className="form-field">
        <Label htmlFor="ai-audience">Target audience (optional)</Label>
        <Input
          id="ai-audience"
          maxLength={150}
          value={prefs.audience}
          onChange={(e) => preferences({ ...prefs, audience: e.target.value })}
        />
      </div>
      <label className="product-checkbox">
        <input
          type="checkbox"
          checked={prefs.cta}
          onChange={(e) => preferences({ ...prefs, cta: e.target.checked })}
        />
        Include a short closing call to action
      </label>
      <div className="form-field">
        <Label htmlFor="ai-instructions">Extra instructions (optional)</Label>
        <Textarea
          id="ai-instructions"
          rows={2}
          maxLength={600}
          value={prefs.instructions}
          onChange={(e) =>
            preferences({ ...prefs, instructions: e.target.value })
          }
        />
      </div>
      <p className="field-hint">
        Writing preferences are remembered for this website in this browser.
        They do not change your public branding.
      </p>
      <div className="writing-allowance" aria-live="polite">
        {state.remaining !== undefined
          ? `${state.remaining} successful generations remaining today`
          : state.error
            ? "Allowance unavailable"
            : "Checking allowance..."}
        {state.resetAt && (
          <small>Resets {new Date(state.resetAt).toUTCString()}</small>
        )}
      </div>
      {state.error && (
        <p role="alert" className="website-field-error">
          {state.error}
        </p>
      )}
      {state.retryAt && (
        <p className="field-hint">
          Try after {new Date(state.retryAt).toUTCString()}.
        </p>
      )}
      <div className="product-form-buttons">
        <Button
          type="button"
          onClick={() => generate("description")}
          disabled={
            busy ||
            (uncertain && requestTask !== "description") ||
            state.enabled !== true ||
            (!uncertain && state.remaining === 0)
          }
        >
          {busy
            ? "Generating suggestion..."
            : uncertain
              ? "Check request"
              : result
                ? "Regenerate"
                : "Generate"}
        </Button>
        <Button type="button" variant="ghost" onClick={refresh} disabled={busy}>
          Refresh allowance
        </Button>
      </div>
      <p className="field-hint">
        A successful generation or regeneration uses one allowance, including
        with an image. Applying and editing are free. No automatic save or
        publication.
      </p>
      {result && (
        <section className="writing-suggestion">
          <h3>Your suggestion</h3>
          <Label htmlFor="ai-result">Edit suggestion</Label>
          <DescriptionEditor
            id="ai-result"
            value={result}
            onChange={(value) => {
              setResult(value);
              onUnsaved(true);
            }}
          />
          <div className="product-form-buttons">
            <Button
              type="button"
              disabled={busy || savePending}
              onClick={() => {
                onApply(result);
                onUnsaved(!!facts);
              }}
            >
              Apply to description
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setResult("");
                onUnsaved(!!facts);
              }}
            >
              Discard
            </Button>
          </div>
        </section>
      )}
    </section>
  );
}
