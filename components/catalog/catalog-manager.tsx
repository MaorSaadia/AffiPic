"use client";
import { useActionState, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  CatalogAction,
  CatalogItem,
  CatalogKind,
  CatalogState,
} from "@/lib/catalog/schema";

function ItemForm({
  kind,
  item,
  action,
}: {
  kind: CatalogKind;
  item?: CatalogItem;
  action: CatalogAction;
}) {
  const inputId = useId();
  const [name, setName] = useState(item?.name ?? "");
  const [confirming, setConfirming] = useState(false);
  const [state, submit, pending] = useActionState(
    async (previous: CatalogState, form: FormData) => {
      const result = await action(previous, form);
      if (result.success) {
        if (!item) setName("");
        setConfirming(false);
      }
      return result;
    },
    {},
  );
  const singular = kind === "categories" ? "category" : "merchant";
  return (
    <form
      action={submit}
      className="catalog-form"
      aria-label={item ? `Edit ${item.name}` : `Add ${singular}`}
    >
      <input type="hidden" name="kind" value={kind} />
      <input
        type="hidden"
        name="operation"
        value={item ? "update" : "create"}
      />
      {item && <input type="hidden" name="id" value={item.id} />}
      <div className="form-field">
        <Label htmlFor={inputId}>
          {item ? "Name" : `New ${singular} name`}
        </Label>
        <Input
          id={inputId}
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={80}
          disabled={pending}
          aria-describedby={state.error ? `${inputId}-error` : undefined}
          aria-invalid={!!state.error}
          placeholder={
            kind === "categories" ? "e.g. Home & living" : "e.g. Etsy"
          }
        />
      </div>
      <div className="catalog-buttons">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : item ? "Save name" : `Add ${singular}`}
        </Button>
        {item && !confirming && (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => setConfirming(true)}
          >
            Delete
          </Button>
        )}
        {confirming && (
          <>
            <p>Delete “{item?.name}”? This cannot be undone.</p>
            <Button
              type="submit"
              formAction={(form) => {
                form.set("operation", "delete");
                submit(form);
              }}
              variant="destructive"
              formNoValidate
              disabled={pending}
            >
              Confirm delete
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
          </>
        )}
      </div>
      {state.error && (
        <p id={`${inputId}-error`} role="alert" className="website-field-error">
          {state.error}
        </p>
      )}
      {state.success && <p role="status">{state.success}</p>}
    </form>
  );
}
export function CatalogManager({
  kind,
  items,
  action,
}: {
  kind: CatalogKind;
  items: CatalogItem[];
  action: CatalogAction;
}) {
  return (
    <div className="catalog-grid">
      <section className="panel catalog-create">
        <h2>
          {kind === "categories"
            ? "Organize your picks"
            : "Keep your favorite stores together"}
        </h2>
        <p className="catalog-help">
          Names are unique within your website. You can connect these to
          products in the product-management milestone.
        </p>
        <ItemForm kind={kind} action={action} />
      </section>
      <section className="panel catalog-list" aria-label={kind}>
        <h2>
          {kind === "categories" ? "Your categories" : "Your merchants"}{" "}
          <span className="count-badge">{items.length}</span>
        </h2>
        {items.length === 0 ? (
          <p className="catalog-help">
            No {kind} yet. Add your first one to get started.
          </p>
        ) : (
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <ItemForm kind={kind} item={item} action={action} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
