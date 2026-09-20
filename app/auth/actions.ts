"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/server/supabase/client";
import { getSiteOrigin, getSupabaseConfig } from "@/lib/auth/config";
import {
  emailSchema,
  nameSchema,
  passwordSchema,
  safeNext,
  type FormState,
} from "@/lib/auth/validation";
import { requireUser } from "@/lib/server/auth";

const unavailable = {
  error: "We couldn’t connect right now. Please try again in a moment.",
};
const setupRequired = {
  error:
    "Account access isn’t available yet. Please try again once setup is complete.",
};

export async function login(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  if (!getSupabaseConfig()) return setupRequired;
  const email = emailSchema.safeParse(form.get("email"));
  const password = form.get("password");
  if (
    !email.success ||
    typeof password !== "string" ||
    password.length < 1 ||
    password.length > 128
  )
    return { error: "Enter a valid email address and password." };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.data,
      password,
    });
    if (error || !data.user?.email_confirmed_at || data.user?.is_anonymous) {
      if (data.session) await supabase.auth.signOut({ scope: "local" });
      return {
        error:
          "Unable to sign in. Check your email and password and try again.",
      };
    }
  } catch {
    return unavailable;
  }
  revalidatePath("/", "layout");
  redirect(safeNext(form.get("next")));
}

export async function signup(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const origin = getSiteOrigin();
  if (!getSupabaseConfig() || !origin) return setupRequired;
  const name = nameSchema.safeParse(form.get("name"));
  const email = emailSchema.safeParse(form.get("email"));
  const password = passwordSchema.safeParse(form.get("password"));
  if (!name.success)
    return { error: "Enter a name between 1 and 80 characters." };
  if (!email.success) return { error: "Enter a valid email address." };
  if (!password.success)
    return { error: "Use a password between 8 and 128 characters." };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.data,
      password: password.data,
      options: {
        data: { display_name: name.data },
        emailRedirectTo: `${origin}/auth/confirm`,
      },
    });
    if (error && error.code !== "user_already_exists")
      return {
        error:
          "We couldn’t create your account right now. Please try again later, or sign in if you already have an account.",
      };
    if (error)
      return {
        error: "Unable to create this account. Try signing in instead.",
      };
    // With Confirm email disabled, Supabase confirms the user and issues a session.
    if (!data.session)
      return {
        success:
          "If your address is eligible, you’ll receive a confirmation email. Open it to finish creating your account. Already registered? Sign in instead.",
      };
    if (!data.user?.email_confirmed_at || data.user.is_anonymous) {
      await supabase.auth.signOut({ scope: "local" });
      return unavailable;
    }
  } catch {
    return unavailable;
  }
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function resendConfirmation(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const origin = getSiteOrigin();
  if (!getSupabaseConfig() || !origin) return setupRequired;
  const email = emailSchema.safeParse(form.get("email"));
  if (!email.success) return { error: "Enter a valid email address." };
  try {
    const supabase = await createClient();
    await supabase.auth.resend({
      type: "signup",
      email: email.data,
      options: { emailRedirectTo: `${origin}/auth/confirm` },
    });
    return {
      success:
        "If your account needs confirmation, a new email will arrive shortly. Check your spam folder too, and wait a minute before requesting another.",
    };
  } catch {
    return unavailable;
  }
}

export async function forgotPassword(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const origin = getSiteOrigin();
  if (!getSupabaseConfig() || !origin) return setupRequired;
  const email = emailSchema.safeParse(form.get("email"));
  if (!email.success) return { error: "Enter a valid email address." };
  try {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email.data, {
      redirectTo: `${origin}/auth/confirm`,
    });
    return {
      success:
        "If an account exists for that email, you’ll receive a password reset link shortly. Check your spam folder too.",
    };
  } catch {
    return unavailable;
  }
}

export async function resetPassword(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser();
  const password = passwordSchema.safeParse(form.get("password"));
  if (!password.success)
    return { error: "Use a password between 8 and 128 characters." };
  if (password.data !== form.get("confirmPassword"))
    return { error: "Your passwords don’t match." };
  try {
    const { error } = await supabase.auth.updateUser({
      password: password.data,
    });
    if (error)
      return {
        error:
          "We couldn’t update your password. Choose a different password or request a fresh reset link.",
      };
  } catch {
    return unavailable;
  }
  return {
    success:
      "Your password has been updated. You can return to your workspace.",
  };
}

export async function signout(): Promise<FormState> {
  if (getSupabaseConfig()) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error)
        return { error: "We couldn’t sign you out. Please try again." };
    } catch {
      return unavailable;
    }
  }
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function updateAccount(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const name = nameSchema.safeParse(form.get("name"));
  if (!name.success)
    return { error: "Enter a name between 1 and 80 characters." };
  try {
    // Ignore any account ID submitted by the client; identity comes from verified Auth.
    const { data, error } = await supabase
      .from("accounts")
      .update({ display_name: name.data })
      .eq("id", user.id)
      .select("id")
      .single();
    if (error || !data)
      return { error: "Your changes couldn’t be saved. Please try again." };
  } catch {
    return unavailable;
  }
  revalidatePath("/dashboard", "layout");
  return { success: "Your account name has been updated." };
}
