"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StorefrontIdentity } from "@/components/public/storefront-identity";
import {
  brandingStyles,
  brandingSchema,
  defaultBranding,
  MAX_LOGO_BYTES,
  type BrandingDesign,
  type BrandingView,
  type BrandingAction,
  type BrandingState,
} from "@/lib/branding/schema";
import { IMAGE_TYPES } from "@/lib/products/schema";
export function BrandingForm({
  branding,
  website,
  action,
}: {
  branding: BrandingView;
  website: {
    name: string;
    slug: string;
    description: string;
    status: "draft" | "published";
  };
  action: BrandingAction;
}) {
  const [saved, setSaved] = useState(branding);
  const [fields, setFields] = useState<BrandingDesign>(branding);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  const [fileError, setFileError] = useState("");
  const [version, setVersion] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const [state, submit, pending] = useActionState(
    async (previous: BrandingState, form: FormData) => {
      if (file) form.set("logo", file);
      const result = await action(previous, form);
      if (result.branding) {
        setSaved(result.branding);
        setFields(result.branding);
        setFile(null);
        setPreview(null);
        setRemove(false);
      }
      setVersion((v) => v + 1);
      return result;
    },
    {},
  );
  function clearFile() {
    setFile(null);
    setPreview(null);
    setFileError("");
    if (fileInput.current) fileInput.current.value = "";
  }
  const parsed = brandingSchema.safeParse(fields);
  const logoUrl = file ? preview : remove ? null : saved.logoUrl;
  return (
    <section id="branding" className="panel branding-panel">
      <div className="branding-heading">
        <span className="eyebrow">MAKE IT YOURS</span>
        <h2>Website branding</h2>
        <p>
          {website.status === "published"
            ? "Your website is public. Saved branding changes appear live."
            : "Preview your look here. Your draft remains private until you publish."}
        </p>
      </div>
      <div className="branding-grid">
        <form
          key={version}
          action={submit}
          className="branding-form"
          aria-label="Website branding"
        >
          <input type="hidden" name="revision" value={saved.revision} />
          <fieldset disabled={pending}>
            <div className="form-field">
              <Label htmlFor="brand-color">Accent color</Label>
              <div className="branding-color">
                <input
                  type="color"
                  aria-label="Choose accent color"
                  value={
                    /^#[0-9a-f]{6}$/i.test(fields.accent_color)
                      ? fields.accent_color
                      : "#2449c4"
                  }
                  onChange={(e) =>
                    setFields({ ...fields, accent_color: e.target.value })
                  }
                />
                <Input
                  id="brand-color"
                  name="accent_color"
                  value={fields.accent_color}
                  onChange={(e) =>
                    setFields({ ...fields, accent_color: e.target.value })
                  }
                  maxLength={7}
                  required
                  aria-describedby="branding-color-hint"
                />
              </div>
              <p id="branding-color-hint" className="field-hint">
                Choose a dark color for readable links and white button text.
              </p>
            </div>
            <div className="form-field">
              <Label htmlFor="brand-background">Page background</Label>
              <select
                id="brand-background"
                name="background"
                value={fields.background}
                onChange={(e) =>
                  setFields({
                    ...fields,
                    background: e.target.value as BrandingDesign["background"],
                  })
                }
              >
                <option value="ivory">Warm ivory</option>
                <option value="white">Bright white</option>
                <option value="mist">Cool mist</option>
              </select>
            </div>
            <div className="form-field">
              <Label htmlFor="brand-font">Heading style</Label>
              <select
                id="brand-font"
                name="heading_font"
                value={fields.heading_font}
                onChange={(e) =>
                  setFields({
                    ...fields,
                    heading_font: e.target
                      .value as BrandingDesign["heading_font"],
                  })
                }
              >
                <option value="sans">Modern sans serif</option>
                <option value="serif">Classic serif</option>
              </select>
            </div>
            <div className="form-field">
              <Label htmlFor="brand-title">Hero headline (optional)</Label>
              <Input
                id="brand-title"
                name="hero_title"
                value={fields.hero_title}
                maxLength={120}
                placeholder={website.name}
                onChange={(e) =>
                  setFields({ ...fields, hero_title: e.target.value })
                }
              />
            </div>
            <div className="form-field">
              <Label htmlFor="brand-subtitle">
                Hero introduction (optional)
              </Label>
              <Textarea
                id="brand-subtitle"
                name="hero_subtitle"
                value={fields.hero_subtitle}
                maxLength={500}
                rows={4}
                placeholder={
                  website.description ||
                  "Leave blank to use your website description."
                }
                onChange={(e) =>
                  setFields({ ...fields, hero_subtitle: e.target.value })
                }
              />
            </div>
            <div className="form-field">
              <Label htmlFor="brand-logo">Website logo (optional)</Label>
              <Input
                ref={fileInput}
                id="brand-logo"
                name="logo"
                type="file"
                accept={IMAGE_TYPES.join(",")}
                aria-describedby="brand-logo-hint"
                onChange={(e) => {
                  const selected = e.target.files?.[0] ?? null;
                  if (
                    selected &&
                    (!IMAGE_TYPES.includes(selected.type) ||
                      selected.size > MAX_LOGO_BYTES)
                  ) {
                    clearFile();
                    setFileError(
                      "Choose a JPEG, PNG, or WebP logo up to 1 MB.",
                    );
                    return;
                  }
                  setFileError("");
                  setFile(selected);
                  if (selected) {
                    setPreview(URL.createObjectURL(selected));
                    setRemove(false);
                  }
                }}
              />
              <p id="brand-logo-hint" className="field-hint">
                Still JPEG, PNG, or WebP, up to 1 MB. Your logo uploads when you
                save.
              </p>
              {(file || fileError) && (
                <Button variant="outline" type="button" onClick={clearFile}>
                  Clear selected logo
                </Button>
              )}
              {file && <p className="field-hint">Selected: {file.name}</p>}
              {saved.logo_path && !file && (
                <label className="branding-checkbox">
                  <input
                    type="checkbox"
                    name="remove_logo"
                    checked={remove}
                    onChange={(e) => setRemove(e.target.checked)}
                  />{" "}
                  Remove saved logo when saving
                </label>
              )}
              {saved.logoError && !file && !remove && (
                <p role="status">
                  The saved logo preview is unavailable. Reload or replace the
                  logo.
                </p>
              )}
            </div>
            <div className="product-form-buttons">
              <Button
                type="submit"
                disabled={pending || !!fileError || !parsed.success}
              >
                {pending ? "Saving…" : "Save branding"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFields({ ...defaultBranding });
                  clearFile();
                  setRemove(!!saved.logo_path);
                }}
              >
                Use defaults
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFields(saved);
                  clearFile();
                  setRemove(false);
                }}
              >
                Discard changes
              </Button>
            </div>
          </fieldset>
          {!parsed.success && (
            <p role="alert" className="website-field-error">
              {parsed.error.issues[0].message}
            </p>
          )}
          {fileError && (
            <p role="alert" className="website-field-error">
              {fileError}
            </p>
          )}
          {state.error && (
            <p role="alert" className="website-field-error">
              {state.error}
            </p>
          )}
          {state.success && <p role="status">{state.success}</p>}
          {state.warning && <p role="status">{state.warning}</p>}
        </form>
        <aside className="branding-preview" aria-label="Branding preview">
          <p className="eyebrow">LIVE PREVIEW · NOT SAVED UNTIL YOU SAVE</p>
          <div className="storefront-surface" style={brandingStyles(fields)}>
            <div className="storefront">
              <StorefrontIdentity
                website={{
                  ...website,
                  id: "preview",
                  status: "published",
                  branding: { ...fields, logo_path: saved.logo_path },
                }}
                preview
                logoUrl={logoUrl}
              />
            </div>
          </div>
          <p className="field-hint">
            Blank hero fields use your website name and description. Defaults
            and discarded changes are not saved automatically.
          </p>
        </aside>
      </div>
    </section>
  );
}
