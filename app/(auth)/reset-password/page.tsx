import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/auth-page";
import { requireUser } from "@/lib/server/auth";
export const metadata: Metadata = { title: "Choose a new password" };
export const dynamic = "force-dynamic";
export default async function ResetPassword() {
  await requireUser();
  return <AuthPage mode="reset" />;
}
