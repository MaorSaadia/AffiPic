import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/auth-page";
import { safeNext } from "@/lib/auth/validation";
export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return <AuthPage mode="login" next={safeNext((await searchParams).next)} />;
}
