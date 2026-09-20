import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getAccount } from "@/lib/server/auth";
import { PageHeading } from "@/components/dashboard/page-heading";
import { AccountForm } from "@/components/auth/account-form";
export const metadata: Metadata = { title: "Your account" };
export default async function Account() {
  const account = await getAccount();
  return (
    <>
      <PageHeading
        eyebrow="YOUR PERSONAL SPACE"
        title="Your account"
        description="A few details that make this workspace yours."
      />
      <section className="panel account-panel">
        <span className="icon-tile">
          <ShieldCheck size={24} />
        </span>
        <h2>Account details</h2>
        <p className="account-email">
          Signed in as <strong>{account.email}</strong>
        </p>
        <AccountForm displayName={account.displayName} />
        <div className="account-security">
          <h2>Account security</h2>
          <p>Your account details are private to you.</p>
          <Link className="text-link" href="/forgot-password">
            Send a password reset email
          </Link>
        </div>
      </section>
    </>
  );
}
