import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Globe2,
  Sparkles,
  MousePointer2,
  Link2,
  Check,
} from "lucide-react";
import { PageHeading } from "@/components/dashboard/page-heading";
import { getWebsite } from "@/lib/server/websites";
import { getCatalog } from "@/lib/server/catalog";
import { hasProducts } from "@/lib/server/products";
import { getOwnedDesign } from "@/lib/server/designs";
import { getBranding } from "@/lib/server/branding";
export const metadata: Metadata = { title: "Overview" };
const steps = [
  {
    title: "Make it yours",
    description: "Start with your website name and a few details.",
    label: "Website details",
    href: "/dashboard/settings#details",
  },
  {
    title: "Give everything a place",
    description: "Organize your recommendations into categories.",
    label: "Categories",
    href: "/dashboard/categories",
  },
  {
    title: "Share your first great find",
    description: "Add a product, a photo, and your affiliate link.",
    label: "First product",
    href: "/dashboard/products",
  },
  {
    title: "Add your personal touch",
    description: "Choose the colors and branding that feel like you.",
    label: "Branding",
    href: "/dashboard/settings#branding",
  },
  {
    title: "Put your picks out into the world",
    description: "Review your website and get ready to publish.",
    label: "Publish",
    href: "/dashboard/settings#publishing",
  },
];
export default async function Overview() {
  const website = await getWebsite();
  const categories = website ? await getCatalog("categories") : [];
  const productsReady = website ? await hasProducts() : false;
  const brandingReady = website
    ? ((await getOwnedDesign())?.record.revision ?? 1) > 1 ||
      (await getBranding()).revision > 0
    : false;
  const published = website?.status === "published";
  const isComplete = (index: number) =>
    (index === 0 && !!website) ||
    (index === 1 && categories.length > 0) ||
    (index === 2 && productsReady) ||
    (index === 4 && published) ||
    (index === 3 && brandingReady);
  const completed =
    Number(!!website) +
    Number(categories.length > 0) +
    Number(productsReady) +
    Number(published) +
    Number(brandingReady);
  return (
    <>
      <PageHeading
        eyebrow="YOUR CREATOR WORKSPACE"
        title="Good things start here."
        description="A little curation. A lot of possibility. Let’s build something that’s yours."
      />
      <section className="welcome-banner" aria-labelledby="setup-title">
        <div className="welcome-copy">
          <span className="welcome-kicker">
            <span className="small-dot" /> YOUR NEXT CHAPTER
          </span>
          <h2 id="setup-title">
            Your taste.
            <br />
            Your very own corner of the internet.
          </h2>
          <p>
            Bring your favorite finds together in a website your audience will
            love.
          </p>
          <Link
            className="button button-white"
            href="/dashboard/settings#details"
          >
            {website ? "Manage your website" : "Set up your website"}{" "}
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="site-illustration" aria-hidden="true">
          <div className="illustration-label">
            <Sparkles size={14} /> Made for your kind of creator
          </div>
          <div className="mock-browser">
            <div className="mock-toolbar">
              <i />
              <i />
              <i />
              <span>YOUR SPACE, YOUR STYLE</span>
            </div>
            <div className="mock-body">
              <div className="mock-brand">The things you love.</div>
              <div className="mock-line" />
              <div className="mock-products">
                <div>
                  <div className="mock-art art-one">
                    <div className="vase" />
                  </div>
                  <span>Everyday favorites</span>
                </div>
                <div>
                  <div className="mock-art art-two">
                    <div className="lamp" />
                  </div>
                  <span>Little discoveries</span>
                </div>
                <div>
                  <div className="mock-art art-three">
                    <div className="book" />
                  </div>
                  <span>Worth sharing</span>
                </div>
              </div>
            </div>
          </div>
          <div className="floating-cursor">
            <MousePointer2 size={22} fill="currentColor" />
            <span>You, but a website</span>
          </div>
        </div>
      </section>
      <div className="overview-grid">
        <section className="panel checklist" aria-labelledby="checklist-title">
          <div className="panel-heading">
            <div>
              <h2 id="checklist-title">Set up your website</h2>
              <p>Five steps from an idea to your own space.</p>
            </div>
            <span className="count-badge">{completed} of 5</span>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="Website setup"
            aria-valuenow={completed}
            aria-valuemin={0}
            aria-valuemax={5}
          >
            <div
              className="setup-progress-fill"
              style={{ width: `${completed * 20}%` }}
            />
          </div>
          <ol className="setup-list">
            {steps.map((step, index) => (
              <li key={step.label}>
                <Link href={step.href}>
                  <span
                    className={`step-number ${isComplete(index) ? "step-complete" : ""}`}
                  >
                    {isComplete(index) ? (
                      <>
                        <Check size={15} />
                        <span className="sr-only">Completed</span>
                      </>
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className="step-copy">
                    <span className="step-label">{step.label}</span>
                    <strong>
                      {isComplete(index)
                        ? index === 0
                          ? "Your website details are ready"
                          : index === 1
                            ? "Your categories are ready"
                            : index === 2
                              ? "Your first product is saved"
                              : index === 3
                                ? "Your branding is saved"
                                : "Your website is published"
                        : step.title}
                    </strong>
                    <span>
                      {isComplete(index)
                        ? index === 0
                          ? "Your website details are saved. You can edit them anytime."
                          : "Keep organizing your picks as your catalog grows."
                        : step.description}
                    </span>
                  </span>
                  <ArrowUpRight size={18} className="step-arrow" />
                </Link>
              </li>
            ))}
          </ol>
          <div className="panel-footnote">
            {website
              ? "Keep growing your product catalog. Manage publishing in Website Settings."
              : "Start by creating your website. It stays private while you set things up."}
          </div>
        </section>
        <aside
          className="overview-aside"
          aria-label="Website setup information"
        >
          <section className="panel website-card">
            <span className="icon-tile">
              <Globe2 size={23} />
            </span>
            <h2>{website?.name ?? "A home for your recommendations"}</h2>
            <p>
              {website
                ? published
                  ? "Your website is public. Saved changes appear live."
                  : "Your draft is saved to your account. Keep making it yours; it isn’t published yet."
                : "Your website hasn’t been created yet. Start with the details, then make it your own."}
            </p>
            <span className="status-pill">
              <span />{" "}
              {website
                ? published
                  ? "Published"
                  : "Draft · Not published"
                : "Not created"}
            </span>
            {website && (
              <p className="saved-site-address">
                {published ? (
                  <a
                    href={"/s/" + website.slug}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open /s/{website.slug}
                  </a>
                ) : (
                  <>/s/{website.slug}</>
                )}
              </p>
            )}
            <Link className="text-link" href="/dashboard/settings">
              Explore website settings <ArrowRight size={15} />
            </Link>
          </section>
          <section className="creator-note">
            <span className="eyebrow">
              <Link2 size={14} /> CURATE. SHARE. CONNECT.
            </span>
            <h2>
              You bring the good taste.
              <br />
              We’ll bring the tools.
            </h2>
            <p>
              Add your own affiliate links. Your audience discovers your picks
              and shops directly with the merchant.
            </p>
            <div className="note-rule" />
            <span>Your website. Your recommendations.</span>
          </section>
        </aside>
      </div>
      <footer className="workspace-footer">
        <span>A little inspiration goes a long way.</span>
        <span>
          Let’s make it yours <Sparkles size={14} />
        </span>
      </footer>
    </>
  );
}
