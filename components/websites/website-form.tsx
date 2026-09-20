"use client";
import { useActionState, useState } from "react";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  suggestSlug,
  type Website,
  type WebsiteAction,
  type WebsiteState,
} from "@/lib/websites/schema";

export function WebsiteForm({
  website,
  action,
}: {
  website: Website | null;
  action: WebsiteAction;
}) {
  const [name, setName] = useState(website?.name ?? "");
  const [slug, setSlug] = useState(website?.slug ?? "");
  const [description, setDescription] = useState(website?.description ?? "");
  const [slugEdited, setSlugEdited] = useState(!!website);
  const [state, submit, pending] = useActionState(
    async (previous: WebsiteState, form: FormData) => {
      const result = await action(previous, form);
      if (result.website) {
        setName(result.website.name);
        setSlug(result.website.slug);
        setDescription(result.website.description);
        setSlugEdited(true);
      }
      return result;
    },
    {} as WebsiteState,
  );
  const errors = state.fieldErrors;
  return (
    <form
      action={submit}
      className="website-form"
      aria-label={website ? "Edit website details" : "Create website"}
    >
      <div className="form-field">
        <Label htmlFor="website-name">Website name</Label>
        <Input
          id="website-name"
          name="name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (!slugEdited) setSlug(suggestSlug(event.target.value));
          }}
          placeholder="e.g. The Everyday Edit"
          required
          maxLength={80}
          disabled={pending}
          aria-invalid={!!errors?.name}
          aria-describedby={errors?.name ? "website-name-error" : undefined}
        />
        {errors?.name && (
          <p id="website-name-error" className="website-field-error">
            {errors.name}
          </p>
        )}
      </div>
      <div className="form-field">
        <Label htmlFor="website-slug">Website address</Label>
        <div className="slug-field">
          <span aria-hidden="true">/s/</span>
          <Input
            id="website-slug"
            name="slug"
            value={slug}
            onChange={(event) => {
              setSlugEdited(true);
              setSlug(event.target.value.toLowerCase());
            }}
            placeholder="the-everyday-edit"
            required
            minLength={3}
            maxLength={48}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            disabled={pending}
            aria-invalid={!!errors?.slug}
            aria-describedby={`website-slug-hint${errors?.slug ? " website-slug-error" : ""}`}
          />
        </div>
        <p id="website-slug-hint" className="field-hint">
          3–48 lowercase letters, numbers, or single hyphens between words.
          Availability is checked when you save.
        </p>
        {errors?.slug && (
          <p id="website-slug-error" className="website-field-error">
            {errors.slug}
          </p>
        )}
      </div>
      <div className="form-field">
        <div className="website-label-row">
          <Label htmlFor="website-description">
            Description <span className="website-optional">(optional)</span>
          </Label>
          <span>{description.length}/500</span>
        </div>
        <Textarea
          id="website-description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="A few words about your picks and who they’re for."
          rows={4}
          maxLength={500}
          disabled={pending}
          aria-invalid={!!errors?.description}
          aria-describedby={
            errors?.description ? "website-description-error" : undefined
          }
        />
        {errors?.description && (
          <p id="website-description-error" className="website-field-error">
            {errors.description}
          </p>
        )}
      </div>
      <div className="website-address-preview">
        <span className="eyebrow">YOUR WEBSITE ADDRESS</span>
        <p>/s/{slug || "your-website"}</p>
        <span>
          {website?.status === "published"
            ? "This website is public. Saved edits appear live; changing its address makes the old URL unavailable."
            : "Your draft stays private until you publish in Website Settings."}
        </span>
      </div>
      <div aria-live="polite" aria-atomic="true">
        {state.error && (
          <p role="alert" className="website-notice website-notice-error">
            {state.error}
          </p>
        )}
        {state.success && (
          <p className="website-notice website-notice-success">
            <Check size={17} />
            {state.success}
          </p>
        )}
      </div>
      <div className="website-form-footer">
        <p>
          {website
            ? "Only you can manage this website."
            : "One website, owned by your account. Make it yours."}
        </p>
        <Button className="h-11 px-5" type="submit" disabled={pending}>
          {pending ? (
            <>
              <LoaderCircle className="animate-spin" />
              Saving…
            </>
          ) : (
            <>
              {website ? "Save changes" : "Create website"}
              <ArrowRight size={16} />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
