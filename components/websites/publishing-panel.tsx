"use client";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import type {
  PublicationAction,
  PublicationState,
} from "@/lib/publishing/schema";
export function PublishingPanel({
  status,
  slug,
  action,
}: {
  status: "draft" | "published";
  slug: string;
  action: PublicationAction;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, submit, pending] = useActionState(
    async (previous: PublicationState, form: FormData) => {
      const result = await action(previous, form);
      if (result.status) setConfirming(false);
      return result;
    },
    {} as PublicationState,
  );
  const current = state.status ?? status;
  const published = current === "published";
  return (
    <section className="panel publishing-panel" id="publishing">
      <span className="eyebrow">SHARE YOUR PICKS</span>
      <h2>
        {published ? "Your website is live" : "Ready to share your website?"}
      </h2>
      <p>
        {published
          ? "Saved changes to website details, products, categories, and merchants appear live. Unpublish first if you want to edit privately."
          : "Publishing makes your website details, products, categories, merchants, and product images visible to everyone. Add at least one product before publishing."}
      </p>
      <p className="publishing-address">
        {published ? (
          <a href={"/s/" + slug} target="_blank" rel="noopener noreferrer">
            Open public website: /s/{slug}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          <span>/s/{slug}</span>
        )}
      </p>
      {!confirming ? (
        <Button type="button" onClick={() => setConfirming(true)}>
          {published ? "Unpublish website" : "Publish website"}
        </Button>
      ) : (
        <form action={submit}>
          <input type="hidden" name="expected_status" value={current} />
          <input
            type="hidden"
            name="status"
            value={published ? "draft" : "published"}
          />
          <label className="publication-confirm">
            <input type="checkbox" name="confirm" required disabled={pending} />
            {published
              ? "I understand new visitors will no longer be able to open this website."
              : "I have reviewed my catalog and want to make it public."}
          </label>
          <div className="product-form-buttons">
            <Button type="submit" disabled={pending}>
              {pending
                ? "Updating…"
                : published
                  ? "Confirm unpublish"
                  : "Confirm publish"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
      {state.error && (
        <p role="alert" className="website-field-error">
          {state.error}
        </p>
      )}
      {state.success && <p role="status">{state.success}</p>}
    </section>
  );
}
