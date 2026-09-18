"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  ChevronRight,
  Globe2,
  Menu,
  Sparkles,
} from "lucide-react";
import { navigation } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function Wordmark() {
  return (
    <Link href="/dashboard" className="wordmark" aria-label="AffiPic overview">
      <span className="brand-mark">
        a<span />
      </span>
      AffiPic<span className="brand-period">.</span>
    </Link>
  );
}
function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main navigation">
      <p className="nav-label">WORKSPACE</p>
      {navigation.map((item, index) => (
        <div key={item.href}>
          {index === 6 && <p className="nav-label nav-divider">MANAGE</p>}
          <Link
            href={item.href}
            className={`nav-item ${pathname === item.href ? "nav-active" : ""}`}
            aria-current={pathname === item.href ? "page" : undefined}
            onClick={onNavigate}
          >
            <item.icon size={19} strokeWidth={1.7} />
            <span>{item.title}</span>
            {pathname === item.href && <span className="active-dot" />}
          </Link>
        </div>
      ))}
    </nav>
  );
}
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const title =
    navigation.find((item) => item.href === pathname)?.title ?? "Workspace";
  return (
    <div className="dashboard-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside className="desktop-sidebar" aria-label="Workspace sidebar">
        <Wordmark />
        <div className="workspace-identity">
          <span className="workspace-avatar">
            <Globe2 size={20} />
          </span>
          <div>
            <strong>Your workspace</strong>
            <span>Let’s get you started</span>
          </div>
        </div>
        <Navigation />
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Sparkles size={19} />
            <strong>Small finds. Big possibilities.</strong>
            <p>Your next chapter starts with what you love.</p>
            <Link href="/dashboard/products">
              Explore your catalog <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="preview-identity">
            <span>AP</span>
            <div>
              <strong>Creator workspace</strong>
              <small>Day 1 · Interface preview</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="dashboard-body">
        <header className="topbar">
          <div className="mobile-navigation">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Open navigation"
                  />
                }
              >
                <Menu size={20} />
              </DialogTrigger>
              <DialogContent className="mobile-nav-dialog">
                <DialogTitle>AffiPic workspace</DialogTitle>
                <DialogDescription>
                  Explore your creator dashboard.
                </DialogDescription>
                <Navigation onNavigate={() => setOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
          <nav aria-label="Breadcrumb" className="breadcrumbs">
            <Link href="/dashboard">Workspace</Link>
            <ChevronRight size={14} />
            <span aria-current="page">{title}</span>
          </nav>
          <span className="preview-badge">
            <span /> Foundation preview
          </span>
        </header>
        <main id="main-content" tabIndex={-1} className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
