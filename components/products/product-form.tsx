"use client";
/* Images are resized and encoded on upload; signed and blob URLs bypass the public image optimizer. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
}: {
  product: ProductView | null;
  published?: boolean;
  categories: CatalogItem[];
  merchants: CatalogItem[];
  action: ProductAction;
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
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);
  const [state, submit, pending] = useActionState(
    async (previous: ProductState, form: FormData) => {
      if (file && form.get("operation") !== "delete") form.set("image", file);
      const result = await action(previous, form);
      if (result.product) {
        setSaved(result.product);
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
          </div>
          <div className="form-field">
            <Label htmlFor="product-description">Description (optional)</Label>
            <Textarea
              id="product-description"
              name="description"
              rows={5}
              maxLength={5000}
              value={fields.description}
              onChange={(e) =>
                setFields({ ...fields, description: e.target.value })
              }
            />
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
          <div className="product-image-field form-field">
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
              onChange={(e) => {
                const selected = e.target.files?.[0] ?? null;
                if (
                  selected &&
                  (!IMAGE_TYPES.includes(selected.type) ||
                    selected.size > MAX_IMAGE_BYTES)
                ) {
                  setFileError("Choose a JPEG, PNG, or WebP image up to 2 MB.");
                  e.target.value = "";
                  setFile(null);
                  setPreview(null);
                  return;
                }
                setFileError("");
                setFile(selected);
                setPreview(selected ? URL.createObjectURL(selected) : null);
                if (selected) setRemoveImage(false);
              }}
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
            {saved?.image_path && !file && (
              <label className="product-checkbox">
                <input
                  type="checkbox"
                  name="remove_image"
                  checked={removeImage}
                  onChange={(e) => setRemoveImage(e.target.checked)}
                />{" "}
                Remove saved image when saving
              </label>
            )}
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
    </section>
  );
}
