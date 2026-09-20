import "@/app/public.css";
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="public-site">{children}</div>;
}
