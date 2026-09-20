"use client";
import { useActionState } from "react";
import { updateAccount } from "@/app/auth/actions";
import type { FormState } from "@/lib/auth/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export function AccountForm({ displayName }: { displayName: string }) {
  const [state, action, pending] = useActionState(
    updateAccount,
    {} as FormState,
  );
  return (
    <form action={action} className="account-form">
      <div className="form-field">
        <Label htmlFor="account-name">Your name</Label>
        <Input
          id="account-name"
          name="name"
          autoComplete="name"
          defaultValue={displayName}
          required
          maxLength={80}
          disabled={pending}
        />
      </div>
      <div aria-live="polite" aria-atomic="true">
        {state.error && (
          <p role="alert" className="account-error">
            {state.error}
          </p>
        )}
        {state.success && <p className="account-success">{state.success}</p>}
      </div>
      <Button type="submit" className="h-10 w-fit px-5" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
