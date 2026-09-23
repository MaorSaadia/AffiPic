import "@/app/public.css";
import "@/app/designer.css";
import { requireUser } from "@/lib/server/auth";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return children;
}
import "@/app/curated.css";
