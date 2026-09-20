import { Globe2, LockKeyhole, Palette, Check } from "lucide-react";
import { PageHeading } from "@/components/dashboard/page-heading";
import { WebsiteForm } from "@/components/websites/website-form";
import type { Website, WebsiteAction } from "@/lib/websites/schema";
export function WebsiteSettings({
  website,
  action,
}: {
  website: Website | null;
  action: WebsiteAction;
}) {
  return (
    <>
      <PageHeading
        eyebrow="MAKE YOURSELF AT HOME"
        title="Website Settings"
        description="Your website starts with a name, a little personality, and a space of its own."
        action={
          <span className="status-pill website-status">
            <span />
            {website
              ? website.status === "published"
                ? "Published"
                : "Draft · Not published"
              : "Not created"}
          </span>
        }
      />
      <div className="website-settings-grid">
        <section id="details" className="panel website-details">
          <div className="website-details-heading">
            <span className="icon-tile">
              <Globe2 size={23} />
            </span>
            <div>
              <h2>
                {website
                  ? "Your website details"
                  : "Let’s give your website a home."}
              </h2>
              <p>
                {website
                  ? "Keep the details behind your recommendations up to date."
                  : "Start with the basics. You can change these details later."}
              </p>
            </div>
          </div>
          <WebsiteForm website={website} action={action} />
        </section>
        <aside
          className="website-settings-aside"
          aria-label="Website status and next steps"
        >
          <section className="panel website-ownership">
            <span className="icon-tile">
              <LockKeyhole size={22} />
            </span>
            <h2>
              {website
                ? "Your website. Your space."
                : "A space that belongs to you."}
            </h2>
            <p>
              {website
                ? website.status === "published"
                  ? "Your website is public. Only you can edit its details."
                  : "Your draft is saved to your account. Only you can view and edit its details."
                : "Your website will be saved to your account, ready for your ideas to take shape."}
            </p>
            <div className="website-ownership-note">
              <Check size={16} />
              <span>
                {website?.status === "published"
                  ? "Published and available to visitors"
                  : "Private until you publish"}
              </span>
            </div>
          </section>
          <section className="creator-note">
            <p className="eyebrow">ONE STEP AT A TIME</p>
            <h2>The beginning of something good.</h2>
            <p>
              {website
                ? "Keep curating your products, categories, and merchants."
                : "Choose a name that feels like you. Your address can be simple, memorable, and easy to share."}
            </p>
          </section>
        </aside>
      </div>
      <div className="website-future-grid">
        {[
          {
            id: "branding",
            title: "Make it look like you",
            description:
              "Your colors and visual identity will come together here.",
            label: "Branding · Day 7",
            icon: Palette,
          },
        ].map((item) => (
          <section
            id={item.id}
            key={item.id}
            className="panel website-future-card"
          >
            <item.icon size={22} />
            <div>
              <span className="eyebrow">{item.label}</span>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
            </div>
            <span className="coming-badge">Coming soon</span>
          </section>
        ))}
      </div>
    </>
  );
}
