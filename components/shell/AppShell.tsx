"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogIn, Menu, PanelLeftClose, PanelLeftOpen, User, X } from "lucide-react";
import { NAV } from "@/lib/nav";
import { Monogram, Wordmark } from "@/components/brand/Monogram";
import { useData } from "@/lib/data/DataProvider";
import { StudyMeter } from "./StudyMeter";

const COLLAPSE_KEY = "atai.sidebar.collapsed";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

function AccountLink({ collapsed }: { collapsed: boolean }) {
  const { user } = useData();
  const name = user ? ((user.user_metadata?.full_name as string | undefined) ?? user.email?.split("@")[0] ?? "Student") : "Sign in";
  return (
    <Link
      href={user ? "/settings" : "/login"}
      title={collapsed ? name : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-text ${collapsed ? "justify-center px-0" : ""}`}
    >
      {user ? <User className="h-[18px] w-[18px] shrink-0" /> : <LogIn className="h-[18px] w-[18px] shrink-0" />}
      {!collapsed && <span className="truncate">{name}</span>}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => setMoreOpen(false), [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMoreOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !c;
    });
  };

  const mobileItems = NAV.filter((n) => n.mobile);

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>

      <aside
        className={`no-print sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 md:flex ${
          collapsed ? "w-[76px]" : "w-64"
        }`}
      >
        <Link href="/" className={`flex h-16 items-center border-b border-line ${collapsed ? "justify-center" : "px-4"}`} aria-label="Algebra Teacher Billy home">
          {collapsed ? <Monogram size={34} /> : <Wordmark />}
        </Link>

        <div className="p-3 pb-1">{collapsed ? <StudyMeter variant="icon" /> : <StudyMeter variant="full" />}</div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 pt-2" aria-label="Main">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                aria-current={active ? "page" : undefined}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                  active ? "bg-accent/12 text-text" : "text-muted hover:bg-surface-2 hover:text-text"
                } ${collapsed ? "justify-center px-0" : ""}`}
              >
                {active && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-accent" aria-hidden="true" />}
                <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-accent" : ""}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-line p-3">
          <AccountLink collapsed={collapsed} />
          <button
            type="button"
            onClick={toggle}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-text ${collapsed ? "justify-center px-0" : ""}`}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-surface/95 px-3 backdrop-blur md:hidden">
          <Link href="/" aria-label="Algebra Teacher Billy home">
            <Wordmark compact />
          </Link>
          <div className="ml-auto">
            <StudyMeter variant="bar" />
          </div>
        </header>

        <main id="main" className="flex-1 px-4 pb-28 pt-5 sm:px-6 md:px-10 md:pb-12 md:pt-9">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>

      <nav
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Main"
      >
        <div className="grid grid-cols-6">
          {mobileItems.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-w-0 flex-col items-center gap-1 pb-2 pt-2.5 text-[10.5px] font-bold ${active ? "text-accent" : "text-muted"}`}
              >
                {active && <span className="absolute inset-x-3 top-0 h-[3px] rounded-b-full bg-accent" aria-hidden="true" />}
                <Icon className="h-5 w-5" />
                <span className="w-full truncate px-0.5 text-center">{item.short}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-1 pb-2 pt-2.5 text-[10.5px] font-bold text-muted"
            aria-haspopup="dialog"
          >
            <Menu className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="no-print fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="All tools">
          <button type="button" className="absolute inset-0 bg-black/45" onClick={() => setMoreOpen(false)} aria-label="Close menu" />
          <div className="step-in absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-line bg-surface p-4 pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-elev-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="display-tight text-lg font-extrabold">All tools</span>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label="Close" className="rounded-lg p-1.5 hover:bg-surface-2">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-3">
              <StudyMeter variant="full" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold ${
                      active ? "border-accent bg-accent/10" : "border-line hover:bg-surface-2"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${active ? "text-accent" : "text-muted"}`} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
