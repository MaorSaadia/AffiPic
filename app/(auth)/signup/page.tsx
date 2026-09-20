import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/auth-page";
export const metadata: Metadata = { title: "Create account" };
export const dynamic = "force-dynamic";
export default function Signup() {
  return <AuthPage mode="signup" />;
}
