// Isolated component fixture. Not part of Next.js routes or authentication.
// Actions here simulate UI responses only; database and server actions have separate tests.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { WebsiteSettings } from "@/components/websites/website-settings";
import {
  websiteSchema,
  type Website,
  type WebsiteAction,
} from "@/lib/websites/schema";
import "@/app/globals.css";
import "@/app/dashboard.css";
import "@/app/websites.css";
const scenario = new URLSearchParams(location.search).get("scenario");
const draft: Website = {
  id: "fixture-site",
  name: "The Everyday Edit",
  slug: "the-everyday-edit",
  description: "Thoughtful finds for your everyday.",
  status: "draft",
  created_at: "2026-09-20",
  updated_at: "2026-09-20",
};
function Fixture() {
  const [website, setWebsite] = useState<Website | null>(
    scenario === "existing" ? draft : null,
  );
  const action: WebsiteAction = async (_previous, form) => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    if (scenario === "duplicate")
      return { error: "That address is unavailable. Choose another address." };
    const parsed = websiteSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success)
      return {
        error: "Check the highlighted details and try again.",
        fieldErrors: { slug: parsed.error.issues[0].message },
      };
    const saved = { ...draft, ...parsed.data };
    setWebsite(saved);
    return {
      website: saved,
      success: website
        ? "Your website details have been saved."
        : "Your website has been created as a private draft.",
    };
  };
  return (
    <div className="dashboard-shell">
      <main className="main-content">
        <WebsiteSettings website={website} action={action} />
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
