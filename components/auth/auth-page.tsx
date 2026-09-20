import Link from "next/link";
import { AuthForm, type AuthMode } from "@/components/auth/auth-form";
import { getSiteOrigin, getSupabaseConfig } from "@/lib/auth/config";

const content = {
  login: {
    eyebrow: "YOUR NEXT CHAPTER",
    title: "Welcome back.",
    description:
      "Your ideas, your finds, your little corner of the internet. Pick up where you left off.",
  },
  signup: {
    eyebrow: "MAKE ROOM FOR YOUR IDEAS",
    title: "Good things start with you.",
    description:
      "Create your AffiPic account. Your favorite finds deserve a place of their own.",
  },
  forgot: {
    eyebrow: "LET’S GET YOU BACK IN",
    title: "Forgot your password?",
    description:
      "It happens. Enter your email and we’ll send you a link to choose a new one.",
  },
  reset: {
    eyebrow: "A FRESH START",
    title: "Choose a new password.",
    description:
      "Make it memorable for you and hard to guess for everyone else.",
  },
  resend: {
    eyebrow: "ONE MORE STEP",
    title: "Check your inbox.",
    description:
      "Need a new confirmation email? Enter the address you used to create your account.",
  },
};
export function AuthPage({ mode, next }: { mode: AuthMode; next?: string }) {
  const copy = content[mode];
  const available =
    !!getSupabaseConfig() &&
    (mode === "login" || mode === "reset" || !!getSiteOrigin());
  return (
    <>
      <p className="eyebrow">{copy.eyebrow}</p>
      <h1>{copy.title}</h1>
      <p className="auth-description">{copy.description}</p>
      <AuthForm mode={mode} available={available} next={next} />
      <div className="auth-links">
        {mode === "login" ? (
          <>
            <p>
              New to AffiPic? <Link href="/signup">Create an account</Link>
            </p>
            <Link href="/auth/resend">Resend confirmation email</Link>
          </>
        ) : mode === "signup" ? (
          <p>
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        ) : (
          <Link href="/login">Back to sign in</Link>
        )}
      </div>
    </>
  );
}
