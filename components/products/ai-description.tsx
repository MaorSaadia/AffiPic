"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  writingSchema,
  writingText,
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
export function AiDescription({
  controls,
  productId,
  name,
  description,
  categoryId,
  categoryName,
  onApply,
}: {
  controls: WritingControls;
  productId: string | null;
  name: string;
  description: string;
  categoryId: string | null;
  categoryName: string;
  onApply: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftName, setName] = useState("");
  const [facts, setFacts] = useState("");
  const [tone, setTone] = useState<WritingInput["tone"]>("Friendly");
  const [length, setLength] = useState<WritingInput["length"]>("Standard");
  const [result, setResult] = useState("");
  const [state, setState] = useState<WritingState>({});
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  // A transport failure retains the ID so retrying cannot cause a second provider call.
  const requestId = useRef<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  async function refresh() {
    try {
      setState(await controls.allowance(controls.websiteId));
    } catch {
      setState({
        enabled: false,
        error:
          "Allowance could not be loaded. Keep editing manually or reopen to try again.",
      });
    }
  }
  async function show() {
    setName(name);
    setFacts(writingText(description).slice(0, 3000));
    setResult("");
    setState({});
    setOpen(true);
    await refresh();
  }
  async function generate() {
    if (pending.current) return;
    const input: WritingInput = {
      websiteId: controls.websiteId,
      productId,
      requestId: requestId.current ?? crypto.randomUUID(),
      name: draftName,
      facts,
      categoryId,
      tone,
      length,
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
      const next = await controls.generate(input);
      setState((old) => ({ ...old, ...next, error: next.error }));
      if (next.description) setResult(next.description);
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
    <>
      <Button type="button" variant="outline" onClick={show}>
        Write with AI
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!pending.current) setOpen(value);
        }}
      >
        <DialogContent className="ai-writing-dialog" showCloseButton={!busy}>
          <DialogTitle>Write a product description</DialogTitle>
          <DialogDescription>
            Review facts before sending them to Google Gemini. Do not include
            private information. Nothing is saved or published until you save
            the product.
          </DialogDescription>
          <p aria-live="polite">
            {state.remaining !== undefined
              ? `${state.remaining} successful generations remaining today (shared across your websites).`
              : state.error
                ? "Daily allowance unavailable."
                : "Checking AI availability..."}
          </p>
          {state.resetAt && (
            <p className="field-hint">
              Resets: {new Date(state.resetAt).toUTCString()}
            </p>
          )}
          <div className="form-field">
            <Label htmlFor="ai-name">Product name for AI</Label>
            <Input
              id="ai-name"
              maxLength={120}
              value={draftName}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
            />
          </div>
          {categoryName && <p>Category: {categoryName}</p>}
          <div className="form-field">
            <Label htmlFor="ai-facts">Product facts and features</Label>
            <Textarea
              id="ai-facts"
              rows={4}
              maxLength={3000}
              value={facts}
              onChange={(e) => setFacts(e.target.value)}
              disabled={busy}
            />
            <p className="field-hint">
              Include specific features you know are true. A name alone is not
              enough. URLs are omitted.
            </p>
          </div>
          <div className="form-columns">
            <div className="form-field">
              <Label htmlFor="ai-tone">Tone</Label>
              <select
                id="ai-tone"
                value={tone}
                disabled={busy}
                onChange={(e) =>
                  setTone(e.target.value as WritingInput["tone"])
                }
              >
                {["Friendly", "Professional", "Concise"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <Label htmlFor="ai-length">Length</Label>
              <select
                id="ai-length"
                value={length}
                disabled={busy}
                onChange={(e) =>
                  setLength(e.target.value as WritingInput["length"])
                }
              >
                {["Short", "Standard"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
          </div>
          {state.error && <p role="alert">{state.error}</p>}
          {state.retryAt && (
            <p>Try after {new Date(state.retryAt).toUTCString()}.</p>
          )}
          {result && (
            <div className="form-field">
              <Label htmlFor="ai-result">Review and edit description</Label>
              <Textarea
                id="ai-result"
                rows={6}
                maxLength={5000}
                value={result}
                onChange={(e) => setResult(e.target.value)}
                disabled={busy}
              />
              <p className="field-hint">
                Check every claim. Each successful generation uses one
                allowance, even if discarded. Trying again uses another
                allowance if successful.
              </p>
            </div>
          )}
          <div className="product-form-buttons">
            <Button
              type="button"
              onClick={generate}
              disabled={
                busy ||
                state.enabled !== true ||
                (!uncertain && state.remaining === 0)
              }
            >
              {busy
                ? "Generating..."
                : uncertain
                  ? "Check request"
                  : result
                    ? "Try again"
                    : "Generate"}
            </Button>
            {result && (
              <Button
                type="button"
                disabled={busy || !result.trim()}
                onClick={() => {
                  onApply(result.trim());
                  setOpen(false);
                }}
              >
                Use description
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={refresh}
            >
              Refresh allowance
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
