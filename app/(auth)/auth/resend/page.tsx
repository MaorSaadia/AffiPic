import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/auth-page";
export const metadata: Metadata = { title: "Confirm your email" };
export const dynamic = "force-dynamic";
export default function Resend() {
  return <AuthPage mode="resend" />;
}
