"use client";
import { useActionState } from "react";
import { LogOut } from "lucide-react";
import { signout } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/auth/validation";
export function SignoutButton() {
  const [state, action, pending] = useActionState(signout, {} as FormState);
  return (
    <form action={action} className="signout-form">
      <Button
        variant="ghost"
        type="submit"
        disabled={pending}
        className="h-10 text-xs"
      >
        <LogOut size={16} />
        {pending ? "Signing out…" : "Sign out"}
      </Button>
      {state.error && (
        <p role="alert" className="signout-error">
          {state.error}
        </p>
      )}
    </form>
  );
}
