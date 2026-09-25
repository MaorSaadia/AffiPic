"use client";
/* Images are resized and encoded on upload; signed and blob URLs bypass the public image optimizer. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DescriptionEditor } from "./description-editor";
import {
  AiDescription,
  type WritingControls,
} from "@/components/products/ai-description";
import type { CatalogItem } from "@/lib/catalog/schema";
import {
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  type ProductView,
  type ProductAction,
  type ProductState,
} from "@/lib/products/schema";

export function ProductForm({
  product,
  published = false,
  categories,
  merchants,
  action,
  writing,
}: {
  product: ProductView | null;
  published?: boolean;
  categories: CatalogItem[];
  merchants: CatalogItem[];
  action: ProductAction;
  writing?: WritingControls;
}) {
  const [saved, setSaved] = useState(product);
  const [fields, setFields] = useState({
    name: product?.name ?? "",
    description: product?.description ?? "",
    affiliate_url: product?.affiliate_url ?? "",
    category_id: product?.category_id ?? "",
    merchant_id: product?.merchant_id ?? "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState("");
  const [removeImage, setRemoveImage] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const [undoDescription, setUndoDescription] = useState<string | null>(null);
  const [titleContainer, setTitleContainer] = useState<HTMLDivElement | null>(
    null,
  );
  const [originalName, setOriginalName] = useState<string | null>(null);
  const [aiDirty, setAiDirty] = useState(false);
  const dirty =
    !!file ||
    removeImage ||
    aiDirty ||
    fields.name !== (saved?.name ?? "") ||
    fields.description !== (saved?.description ?? "") ||
    fields.affiliate_url !== (saved?.affiliate_url ?? "") ||
    fields.category_id !== (saved?.category_id ?? "") ||
    fields.merchant_id !== (saved?.merchant_id ?? "");
  useEffect(() => {
    if (!dirty) return;
    function unload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    function navigate(event: MouseEvent) {
      const link = (event.target as Element).closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        link &&
        link.target !== "_blank" &&
        !link.hash &&
        !window.confirm("Leave with unsaved product changes or AI notes?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    // Navigation API allows cancellable same-document back/forward in supported browsers.
    const navigation = (window as Window & { navigation?: EventTarget })
      .navigation;
    function traverse(event: Event) {
      const detail = event as Event & {
        navigationType?: string;
        destination?: { url: string };
      };
      if (
        detail.navigationType === "traverse" &&
        event.cancelable &&
        detail.destination?.url !== location.href &&
        !window.confirm("Leave with unsaved product changes or AI notes?")
      )
        event.preventDefault();
    }
    navigation?.addEventListener("navigate", traverse);
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      navigation?.removeEventListener("navigate", traverse);
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty]);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);
  const [state, submit, pending] = useActionState(
    async (previous: ProductState, form: FormData) => {
      if (file && form.get("operation") !== "delete") form.set("image", file);
      if (removeImage) form.set("remove_image", "on");
      const result = await action(previous, form);
      if (result.product) {
        setSaved(result.product);
        setUndoDescription(null);
        setOriginalName(null);
        setFields({
          name: result.product.name,
          description: result.product.description,
          affiliate_url: result.product.affiliate_url,
          category_id: result.product.category_id ?? "",
          merchant_id: result.product.merchant_id ?? "",
        });
        setFile(null);
        setPreview(null);
        setRemoveImage(false);
        if (fileInput.current) fileInput.current.value = "";
      }
      // React resets native form controls after an action resolves, even on
      // validation errors. Remount with retained state so selects keep their values.
      setFormVersion((version) => version + 1);
      return result;
    },
    {},
  );
  function chooseImage(selected: File | null) {
    if (
      selected &&
      (!IMAGE_TYPES.includes(selected.type) || selected.size > MAX_IMAGE_BYTES)
    ) {
      setFileError("Choose a JPEG, PNG, or WebP image up to 2 MB.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    setFileError("");
    setFile(selected);
    setPreview(selected ? URL.createObjectURL(selected) : null);
    if (selected) setRemoveImage(false);
  }
  if (state.deleted)
    return (
      <section className="panel product-editor">
        <h2>Product deleted</h2>
        {state.warning && <p role="status">{state.warning}</p>}
        <Link className="text-link" href="/dashboard/products">
          Back to products
        </Link>
      </section>
    );
  const image = file ? preview : removeImage ? null : saved?.imageUrl;
  return (
    <section className="panel product-editor">
      <div className="product-editor-heading">
        <h2>{saved ? "Edit product" : "Add a product"}</h2>
        <p>
          {published
            ? "Your website is published. Saved changes appear live."
            : "Save your recommendation to your private website catalog."}
        </p>
      </div>
      <div className="product-workspace">
        <form
          key={formVersion}
          action={submit}
          className="product-form"
          aria-label={saved ? "Edit product" : "Add a product"}
        >
          <input
            type="hidden"
            name="operation"
            value={saved ? "update" : "create"}
          />
          {saved && (
            <>
              <input type="hidden" name="id" value={saved.id} />
              <input type="hidden" name="revision" value={saved.revision} />
            </>
          )}
          <fieldset disabled={pending} className="product-fields">
            <div className="form-field">
              <Label htmlFor="product-name">Product name</Label>
              <Input
                id="product-name"
                name="name"
                required
                maxLength={120}
                value={fields.name}
                onChange={(e) => setFields({ ...fields, name: e.target.value })}
              />
              {writing && <div ref={setTitleContainer} />}
              {originalName !== null && (
                <div className="title-original">
                  <p>Original name: {originalName || "(empty)"}</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setFields((current) => ({
                        ...current,
                        name: originalName,
                      }))
                    }
                  >
                    Undo title choice
                  </Button>
                </div>
              )}
            </div>
            <div className="form-field">
              <Label htmlFor="product-description">
                Description (optional)
              </Label>
              <DescriptionEditor
                id="product-description"
                name="description"
                disabled={pending}
                value={fields.description}
                onChange={(description) =>
                  setFields((current) => ({ ...current, description }))
                }
              />
              {undoDescription !== null && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFields((current) => ({
                      ...current,
                      description: undoDescription,
                    }));
                    setUndoDescription(null);
                  }}
                >
                  Undo AI replacement
                </Button>
              )}
            </div>
            <div className="form-columns">
              <div className="form-field">
                <Label htmlFor="product-category">Category (optional)</Label>
                <select
                  id="product-category"
                  name="category_id"
                  value={fields.category_id}
                  onChange={(e) =>
                    setFields({ ...fields, category_id: e.target.value })
                  }
                >
                  <option value="">No category</option>
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <Link className="text-link" href="/dashboard/categories">
                  Manage categories
                </Link>
              </div>
              <div className="form-field">
                <Label htmlFor="product-merchant">Merchant (optional)</Label>
                <select
                  id="product-merchant"
                  name="merchant_id"
                  value={fields.merchant_id}
                  onChange={(e) =>
                    setFields({ ...fields, merchant_id: e.target.value })
                  }
                >
                  <option value="">No merchant</option>
                  {merchants.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <Link className="text-link" href="/dashboard/merchants">
                  Manage merchants
                </Link>
              </div>
            </div>
            <div className="form-field">
              <Label htmlFor="product-affiliate">Affiliate URL</Label>
              <Input
                id="product-affiliate"
                name="affiliate_url"
                type="url"
                required
                maxLength={2048}
                value={fields.affiliate_url}
                onChange={(e) =>
                  setFields({ ...fields, affiliate_url: e.target.value })
                }
                placeholder="https://merchant.com/your-affiliate-link"
              />
              <p className="field-hint">
                Shoppers purchase on the merchant’s website. Paste your own
                affiliate link.
              </p>
            </div>
            <div className="product-form-buttons">
              <Button type="submit" disabled={pending || !!fileError}>
                {pending ? "Saving…" : "Save product"}
              </Button>
              <Link href="/dashboard/products" className="text-link">
                Back to products
              </Link>
            </div>
          </fieldset>
          {state.error && (
            <p role="alert" className="website-field-error">
              {state.error}
            </p>
          )}
          {state.success && (
            <p role="status" className="website-notice">
              {state.success}
            </p>
          )}
          {state.warning && <p role="status">{state.warning}</p>}
          {saved && (
            <div className="product-delete">
              {!confirmDelete ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete product
                </Button>
              ) : (
                <>
                  <p>
                    Delete “{saved.name}” and its image? This cannot be undone.
                  </p>
                  <div className="product-form-buttons">
                    <Button
                      type="submit"
                      variant="destructive"
                      formNoValidate
                      disabled={pending}
                      formAction={(form) => {
                        form.set("operation", "delete");
                        submit(form);
                      }}
                    >
                      Confirm delete
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={pending}
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </form>
        <section
          className="product-image-field form-field"
          aria-label="Product image"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (!pending) chooseImage(event.dataTransfer.files[0] ?? null);
          }}
        >
          <h2>Start with a picture</h2>
          <p className="field-hint">Drop a file here or choose one below.</p>
          <Label htmlFor="product-image">Product image (optional)</Label>
          {image && (
            <img
              src={image}
              alt="Product image preview"
              className="product-image-preview"
            />
          )}
          {saved?.imageError && !file && !removeImage && (
            <p role="status">
              The saved image preview is unavailable. Reload to try again, or
              replace the image.
            </p>
          )}
          <Input
            ref={fileInput}
            id="product-image"
            name="image"
            type="file"
            accept={IMAGE_TYPES.join(",")}
            aria-describedby="product-image-hint"
            disabled={pending}
            onChange={(e) => chooseImage(e.target.files?.[0] ?? null)}
          />
          <p className="field-hint" id="product-image-hint">
            JPEG, PNG, or WebP, up to 2 MB. Still images only. Images upload
            when you save.
          </p>
          {fileError && (
            <p role="alert" className="website-field-error">
              {fileError}
            </p>
          )}
          {(file || fileError) && (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setFile(null);
                setFileError("");
                setPreview(null);
                if (fileInput.current) fileInput.current.value = "";
              }}
            >
              Clear selected image
            </Button>
          )}
          {image && (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => fileInput.current?.click()}
            >
              Replace image
            </Button>
          )}
          {pending && file && (
            <p role="status">Uploading and processing image while saving...</p>
          )}
          {saved?.image_path && !file && (
            <label className="product-checkbox">
              <input
                type="checkbox"
                name="remove_image"
                disabled={pending}
                checked={removeImage}
                onChange={(e) => setRemoveImage(e.target.checked)}
              />{" "}
              Remove saved image when saving
            </label>
          )}
        </section>

        {writing && (
          <AiDescription
            controls={writing}
            titleContainer={titleContainer}
            savePending={pending}
            onApplyTitle={(name) => {
              setOriginalName((current) => current ?? fields.name);
              setFields((current) => ({ ...current, name }));
            }}
            productId={saved?.id ?? null}
            name={fields.name}
            categoryId={fields.category_id || null}
            categoryName={
              categories.find((item) => item.id === fields.category_id)?.name ??
              ""
            }
            imageFile={file}
            hasImage={!!file || (!!saved?.image_path && !removeImage)}
            onUnsaved={setAiDirty}
            onApply={(description) => {
              setUndoDescription(fields.description);
              setFields((current) => ({ ...current, description }));
            }}
          />
        )}
      </div>
    </section>
  );
}
