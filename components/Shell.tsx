"use client";

import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { Wrench } from "lucide-react";
import type { ReactNode } from "react";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-20 pt-6 md:px-8">
      <header className="mb-8 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-white"><Wrench className="size-4" /></span>
          LendLoop
        </Link>
        <nav className="flex items-center gap-2">
          <Show when="signed-in">
            <Link href="/app" className="btn btn-ghost btn-sm">Board</Link>
            <UserButton />
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal" forceRedirectUrl="/app">
              <button className="btn btn-primary btn-sm">Sign in to lend or borrow</button>
            </SignInButton>
          </Show>
        </nav>
      </header>
      {children}
    </div>
  );
}

export const CATEGORY_LABEL: Record<string, string> = {
  "power tools": "Power tools",
  "hand tools": "Hand tools",
  garden: "Garden",
  kitchen: "Kitchen",
  camping: "Camping",
  cleaning: "Cleaning",
  other: "Other",
};

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "ok" | "warn" | "bad" | "accent"; children: ReactNode }) {
  const cls = {
    neutral: "bg-paper text-muted",
    ok: "bg-ok-soft text-ok",
    warn: "bg-warn-soft text-warn",
    bad: "bg-bad-soft text-bad",
    accent: "bg-accent-soft text-accent",
  }[tone];
  return <span className={`pill ${cls}`}>{children}</span>;
}

export const STATUS_TONE: Record<string, "neutral" | "ok" | "warn" | "bad" | "accent"> = {
  requested: "warn",
  approved: "ok",
  declined: "bad",
  returned: "neutral",
};

export function relative(ms: number): string {
  const days = Math.floor((Date.now() - ms) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}
