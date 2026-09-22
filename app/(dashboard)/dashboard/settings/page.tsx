import type { Metadata } from "next";
import { getWebsite } from "@/lib/server/websites";
import { WebsiteSettings } from "@/components/websites/website-settings";
import { createWebsite, updateWebsite } from "./actions";
import { PublishingPanel } from "@/components/websites/publishing-panel";
import { setPublication } from "./publishing-actions";
import Link from "next/link";
export const metadata: Metadata = { title: "Website Settings" };
export default async function Settings() {
  const website = await getWebsite();
  return (
    <>
      <WebsiteSettings
        website={website}
        action={website ? updateWebsite : createWebsite}
      />
      {website && (
        <section id="branding" className="panel branding-panel">
          <h2>Website Designer</h2>
          <p>
            Edit your homepage sections in a private draft. Publish when the
            design is ready.
          </p>
          <Link href="/designer">Open Website Designer</Link>
        </section>
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
