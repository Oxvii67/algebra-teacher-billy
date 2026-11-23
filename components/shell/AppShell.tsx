"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogIn, Menu, User, X } from "lucide-react";
import { NAV } from "@/lib/nav";
import { Wordmark } from "@/components/brand/Monogram";
import { ThemeQuick } from "@/components/theme/ThemeQuick";
import { useData } from "@/lib/data/DataProvider";
import { StudyMeter } from "./StudyMeter";

/** Shown inline in the desktop header; everything else lives under More. */
const TOP = ["/studio", "/tutor", "/practice-test", "/calculator", "/videos"];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

function AccountLink() {
  const { user } = useData();
  const name = user ? ((user.user_metadata?.full_name as string | undefined) ?? user.email?.split("@")[0] ?? "Student") : "Sign in";
  return (
    <Link
      href={user ? "/settings" : "/login"}
      className="flex h-9 items-center gap-2 rounded-full px-3 text-sm font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-text"
    >
      {user ? <User className="h-4 w-4 shrink-0" /> : <LogIn className="h-4 w-4 shrink-0" />}
      <span className="hidden max-w-[9rem] truncate xl:inline">{name}</span>
    </Link>
  );
}

function MoreMenu({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const items = NAV.filter((n) => n.href !== "/" && !TOP.includes(n.href));
  const active = items.some((n) => isActive(pathname, n.href));

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`nav-link ${active ? "text-text" : ""}`}
        data-active={active}
      >
        More <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="menu" className="step-in absolute left-0 top-11 z-50 w-60 rounded-[14px] border border-line bg-surface p-1.5 shadow-elev-3">
          {items.map((item) => {
            const Icon = item.icon;
            const on = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                aria-current={on ? "page" : undefined}
                className={`flex items-center gap-3 rounded-[10px] px-2.5 py-2 text-sm font-medium transition-colors hover:bg-surface-2 ${on ? "text-accent" : ""}`}
              >
                <Icon className="h-4 w-4 shrink-0 text-muted" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => setSheetOpen(false), [pathname]);
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheetOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  const top = TOP.map((h) => NAV.find((n) => n.href === h)!).filter(Boolean);
  const mobileItems = NAV.filter((n) => n.mobile);

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>

      <header className="no-print sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md backdrop-saturate-150">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4 sm:px-6 md:px-8">
          <Link href="/" className="mr-3 shrink-0 rounded-lg" aria-label="Algebra Teacher Billy home">
            <Wordmark />
          </Link>

          <nav className="hidden h-full items-center gap-0.5 md:flex" aria-label="Main">
            {top.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} data-active={active} className="nav-link">
                  {item.short}
                </Link>
              );
            })}
            <MoreMenu pathname={pathname} />
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <StudyMeter variant="pill" />
            <ThemeQuick />
            <span className="hidden md:block">
              <AccountLink />
            </span>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1 px-4 pb-28 pt-6 sm:px-6 md:px-8 md:pb-16 md:pt-10">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>

      <nav
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
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
                className={`relative flex min-w-0 flex-col items-center gap-1 pb-2 pt-2.5 text-[10.5px] font-semibold transition-colors ${active ? "text-text" : "text-muted"}`}
              >
                <span className={`flex h-7 w-11 items-center justify-center rounded-full transition-colors duration-200 ${active ? "bg-accent text-accent-fg" : ""}`}>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="w-full truncate px-0.5 text-center">{item.short}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex flex-col items-center gap-1 pb-2 pt-2.5 text-[10.5px] font-semibold text-muted"
            aria-haspopup="dialog"
          >
            <span className="flex h-7 w-11 items-center justify-center">
              <Menu className="h-[18px] w-[18px]" />
            </span>
            More
          </button>
        </div>
      </nav>

      {sheetOpen && (
        <div className="no-print fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="All tools">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setSheetOpen(false)} aria-label="Close menu" />
          <div className="step-in absolute inset-x-0 bottom-0 rounded-t-[22px] border-t border-line bg-surface p-4 pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-elev-3">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" aria-hidden="true" />
            <div className="mb-3 flex items-center justify-between">
              <span className="eyebrow">All tools</span>
              <button type="button" onClick={() => setSheetOpen(false)} aria-label="Close" className="rounded-full p-1.5 hover:bg-surface-2">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-3">
              <StudyMeter variant="full" />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex min-w-0 items-center gap-2 rounded-[11px] border px-3 py-2.5 text-sm font-medium ${
                      active ? "border-accent text-accent" : "border-line hover:bg-surface-2"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
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
