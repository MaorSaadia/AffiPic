import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { futureFeatures } from "@/lib/features";
import { navigation } from "@/lib/navigation";
import { PageHeading } from "@/components/dashboard/page-heading";
type Props = { params: Promise<{ section: string }> };
function getFeature(section: string) {
  return Object.hasOwn(futureFeatures, section)
    ? futureFeatures[section as keyof typeof futureFeatures]
    : undefined;
}
export function generateStaticParams() {
  return Object.keys(futureFeatures).map((section) => ({ section }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const feature = getFeature((await params).section);
  return { title: feature?.title ?? "Not found" };
}
export default async function FeaturePage({ params }: Props) {
  const { section } = await params;
  const feature = getFeature(section);
  if (!feature) notFound();
  const Icon = navigation.find(
    (item) => item.href === `/dashboard/${section}`,
  )!.icon;
  return (
    <>
      <PageHeading
        eyebrow={feature.eyebrow}
        title={feature.title}
        description={feature.description}
      />
      <section className="panel coming-soon">
        <span className="icon-tile">
          <Icon size={30} />
        </span>
        <span className="coming-badge">Coming soon</span>
        <h2>{feature.headline}</h2>
        <p>{feature.detail}</p>
        <span className="milestone-label">{feature.milestone}</span>
        <Link href="/dashboard" className="text-link">
          <ArrowLeft size={15} /> Back to your setup checklist
        </Link>
      </section>
    </>
  );
}
