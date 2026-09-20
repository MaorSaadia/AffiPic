import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/auth-page";
export const metadata: Metadata = { title: "Reset your password" };
export const dynamic = "force-dynamic";
export default function ForgotPassword() {
  return <AuthPage mode="forgot" />;
}
