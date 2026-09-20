import type { Metadata } from "next";
import { getWebsite } from "@/lib/server/websites";
import { WebsiteSettings } from "@/components/websites/website-settings";
import { createWebsite, updateWebsite } from "./actions";
import { PublishingPanel } from "@/components/websites/publishing-panel";
import { setPublication } from "./publishing-actions";
import { BrandingForm } from "@/components/websites/branding-form";
import { getBranding } from "@/lib/server/branding";
import { saveBranding } from "./branding-actions";
export const metadata: Metadata = { title: "Website Settings" };
export default async function Settings() {
  const website = await getWebsite();
  const branding = website ? await getBranding() : null;
  return (
    <>
      <WebsiteSettings
        website={website}
        action={website ? updateWebsite : createWebsite}
      />
      {website && branding && (
        <BrandingForm
          website={website}
          branding={branding}
          action={saveBranding}
        />
      )}
      {website && (
        <PublishingPanel
          key={website.status + website.slug}
          status={website.status}
          slug={website.slug}
          action={setPublication}
        />
      )}
    </>
  );
}
