import "@/app/dashboard.css";
import Link from "next/link";
import { Heart, Link2, Sparkles } from "lucide-react";
import "@/app/auth.css";
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-layout">
      <aside className="auth-story" aria-label="About AffiPic">
        <Link
          href="/login"
          className="wordmark auth-wordmark"
          aria-label="AffiPic sign in"
        >
          <span className="brand-mark">
            a<span />
          </span>
          AffiPic<span className="brand-period">.</span>
        </Link>
        <div className="auth-story-copy">
          <span className="auth-story-kicker">
            <Sparkles size={17} /> FOR YOUR KIND OF CREATOR
          </span>
          <h2>
            Your taste.
            <br />
            Your voice.
            <br />
            Your own space.
          </h2>
          <p>
            Bring the things you love together.
            <br />
            Build something that feels like you.
          </p>
          <div className="auth-story-art" aria-hidden="true">
            <span>
              <Heart size={29} />
            </span>
            <span>
              <Link2 size={35} />
            </span>
            <span>
              <Sparkles size={30} />
            </span>
          </div>
        </div>
        <p className="auth-story-footer">Small finds. Big possibilities.</p>
      </aside>
      <main className="auth-main">
        <Link
          href="/login"
          className="wordmark auth-mobile-wordmark"
          aria-label="AffiPic sign in"
        >
          <span className="brand-mark">
            a<span />
          </span>
          AffiPic<span className="brand-period">.</span>
        </Link>
        <div className="auth-card">{children}</div>
        <p className="auth-footer">A home for your recommendations.</p>
      </main>
    </div>
  );
}
