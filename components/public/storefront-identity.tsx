import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/public/brand-logo";
import { storefrontHref, type PublicWebsite } from "@/lib/public/schema";
function PreviewLink({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
  href: string;
}) {
  return <div className={className}>{children}</div>;
}
export function StorefrontIdentity({
  website,
  preview = false,
  logoUrl,
  part = "both",
}: {
  website: PublicWebsite;
  preview?: boolean;
  logoUrl?: string | null;
  part?: "both" | "header" | "hero";
}) {
  const Heading = preview ? "h3" : "h1";
  const BrandLink = preview ? PreviewLink : Link;
  const BrowseLink = preview ? PreviewLink : "a";
  return (
    <>
      {part !== "hero" && (
        <header className="storefront-header">
          <BrandLink
            href={storefrontHref(website.slug)}
            className="storefront-brand"
          >
            {logoUrl && <BrandLogo key={logoUrl} src={logoUrl} />}
            {website.name}
          </BrandLink>
          <span>GOOD FINDS, THOUGHTFULLY CHOSEN</span>
        </header>
      )}
      {part !== "header" && (
        <section className="storefront-hero" aria-label="Website introduction">
          <div>
            <p className="storefront-eyebrow">
              <Sparkles size={16} aria-hidden="true" /> A LITTLE CURATION GOES A
              LONG WAY
            </p>
            <Heading className="storefront-hero-title">
              {website.branding?.hero_title || website.name}
            </Heading>
            <p className="storefront-intro">
              {website.branding?.hero_subtitle ||
                website.description ||
                "A collection of favorites, chosen to help you find something you’ll love."}
            </p>
            <BrowseLink href="#finds" className="storefront-browse">
              Explore the finds <ArrowUpRight size={18} aria-hidden="true" />
            </BrowseLink>
          </div>
          <div className="storefront-hero-note" aria-hidden="true">
            <span>Selected with care.</span>
            <strong>
              Worth a<br />
              closer look.
            </strong>
            <Sparkles size={42} />
          </div>
        </section>
      )}
    </>
  );
}
