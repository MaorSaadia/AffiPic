import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = { title: "Email link unavailable" };
export default function AuthError() {
  return (
    <>
      <p className="eyebrow">LET’S TRY THAT AGAIN</p>
      <h1>This link is no longer available.</h1>
      <p className="auth-description">
        It may have expired or already been used. Request a fresh email to
        continue.
      </p>
      <div className="auth-recovery-links">
        <Link className="auth-text-link" href="/auth/resend">
          Resend confirmation email
        </Link>
        <Link className="auth-text-link" href="/forgot-password">
          Request a password reset
        </Link>
        <Link className="auth-text-link" href="/login">
          Back to sign in
        </Link>
      </div>
    </>
  );
}
