"use client";
import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle } from "lucide-react";
import {
  login,
  signup,
  forgotPassword,
  resetPassword,
  resendConfirmation,
} from "@/app/auth/actions";
import type { FormState } from "@/lib/auth/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const actions = {
  login,
  signup,
  forgot: forgotPassword,
  reset: resetPassword,
  resend: resendConfirmation,
};
const labels = {
  login: "Sign in",
  signup: "Create account",
  forgot: "Send reset link",
  reset: "Update password",
  resend: "Resend confirmation",
};
export type AuthMode = keyof typeof actions;
export function AuthForm({
  mode,
  available,
  next = "/dashboard",
}: {
  mode: AuthMode;
  available: boolean;
  next?: string;
}) {
  const [state, action, pending] = useActionState(
    actions[mode],
    {} as FormState,
  );
  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="next" value={next} />
      {mode === "signup" && (
        <div className="form-field">
          <Label htmlFor="name">Your name</Label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            placeholder="How should we call you?"
            required
            maxLength={80}
            disabled={pending}
          />
        </div>
      )}
      {mode !== "reset" && (
        <div className="form-field">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            maxLength={254}
            disabled={pending}
          />
        </div>
      )}
      {["login", "signup", "reset"].includes(mode) && (
        <div className="form-field">
          <div className="auth-label-row">
            <Label htmlFor="password">
              {mode === "reset" ? "New password" : "Password"}
            </Label>
            {mode === "login" && (
              <Link href="/forgot-password">Forgot password?</Link>
            )}
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            required
            minLength={mode === "login" ? 1 : 8}
            maxLength={128}
            disabled={pending}
            aria-describedby={mode !== "login" ? "password-hint" : undefined}
          />
          {mode !== "login" && (
            <p id="password-hint" className="field-hint">
              Use 8–128 characters. A few memorable words work well.
            </p>
          )}
        </div>
      )}
      {mode === "reset" && (
        <div className="form-field">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            disabled={pending}
          />
        </div>
      )}
      <div aria-live="polite" aria-atomic="true">
        {state.error && (
          <p className="auth-message auth-message-error" role="alert">
            {state.error}
          </p>
        )}
        {state.success && (
          <p className="auth-message auth-message-success">{state.success}</p>
        )}
      </div>
      <Button
        type="submit"
        className="h-12 w-full"
        disabled={pending || !available}
        aria-describedby={!available ? "auth-unavailable" : undefined}
      >
        {pending ? (
          <>
            <LoaderCircle className="animate-spin" /> Please wait…
          </>
        ) : (
          <>
            {labels[mode]}
            <ArrowRight size={16} />
          </>
        )}
      </Button>
      {!available && (
        <p id="auth-unavailable" className="auth-message">
          Account access is being set up. Please check back soon.
        </p>
      )}
      {mode === "reset" && state.success && (
        <Link className="auth-text-link" href="/dashboard">
          Return to your workspace <ArrowRight size={15} />
        </Link>
      )}
    </form>
  );
}
