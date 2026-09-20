import "@/app/dashboard.css";
import "@/app/websites.css";
import "@/app/catalog.css";
import "@/app/products.css";
import "@/app/public.css";
import { DashboardShell } from "@/components/dashboard/shell";
import { requireUser } from "@/lib/server/auth";
import { getWebsite } from "@/lib/server/websites";
export const dynamic = "force-dynamic";
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireUser();
  const website = await getWebsite();
  return (
    <DashboardShell
      email={user.email ?? ""}
      websiteName={website?.name ?? null}
      websiteStatus={website?.status}
    >
      {children}
    </DashboardShell>
  );
}
