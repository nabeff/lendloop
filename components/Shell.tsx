"use client";

import Link from "next/link";
import { AvatarSlot, SignInHeaderButton } from "./SignInCta";
import { Wrench } from "lucide-react";
import type { ReactNode } from "react";
import { STATUS_LABEL, STATUS_TONE, type Tone } from "@/lib/labels";

/* Labels and formatters live in lib/labels.ts, which has no "use client", so
   server components get the real objects rather than a client proxy. */
export { categoryLabel, dateRange, dayLabel, initial, relative, STATUS_LABEL, STATUS_TONE } from "@/lib/labels";

/* The header takes the session as a PROP, decided on the server, instead of
   asking Clerk in the browser. That is what keeps the first painted frame
   identical to the final one: the right button is already in the HTML.
   UserButton still mounts client side, so it gets a reserved box. */
export function Header({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-base/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-5 md:px-8">
        <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight">
          <span className="grid size-7 place-items-center rounded-lg bg-accent text-accent-ink">
            <Wrench className="size-[15px]" strokeWidth={2.5} />
          </span>
          LendLoop
        </Link>
        <nav className="flex items-center gap-2.5">
          {signedIn ? (
            <>
              <Link href="/app" className="btn btn-ghost btn-sm">
                Open board
              </Link>
              <AvatarSlot />
            </>
          ) : (
            <SignInHeaderButton />
          )}
        </nav>
      </div>
    </header>
  );
}

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-raised text-muted border-line",
  ok: "bg-ok-soft text-ok border-ok-line",
  warn: "bg-warn-soft text-warn border-warn-line",
  bad: "bg-bad-soft text-bad border-bad-line",
  accent: "bg-accent-soft text-accent border-accent-line",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`pill ${TONE_CLASS[tone]}`}>{children}</span>;
}

/* A status badge carries a dot as well as a colour, so the state survives a
   greyscale screenshot and reads for colour-blind users. */
export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? "neutral";
  return (
    <span className={`pill ${TONE_CLASS[tone]}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

/* Every tab opens with one of these, so the pages share a rhythm. */
export function SectionHead({
  title,
  count,
  hint,
  action,
}: {
  title: string;
  count?: number;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
          {title}
          {count !== undefined && (
            <span className="rounded-md bg-raised px-1.5 py-0.5 text-sm font-semibold text-muted tabular">
              {count}
            </span>
          )}
        </h1>
        {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

/* An empty state says what goes here and how to put it there. */
export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="panel flex flex-col items-center gap-2 px-6 py-16 text-center">
      {icon && <div className="mb-1 grid size-11 place-items-center rounded-xl bg-raised text-muted">{icon}</div>}
      <p className="font-semibold">{title}</p>
      {children && <p className="max-w-sm text-sm leading-relaxed text-muted">{children}</p>}
    </div>
  );
}

/* Loading is a shape, not the word "Loading". The skeleton mirrors the real
   row it replaces (title, meta line, action) so nothing jumps when the data
   lands. Widths vary per row because a column of identical bars reads as a
   broken page rather than as content arriving. */
export function SkeletonList({ rows = 4 }: { rows?: number }) {
  const widths = ["w-32", "w-44", "w-28", "w-40", "w-36", "w-24"];
  return (
    <ul className="grid gap-3 sm:grid-cols-2" aria-busy="true" aria-live="polite">
      <li className="sr-only">Loading</li>
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="panel flex flex-col gap-3.5 p-4" aria-hidden>
          <div className="flex items-start justify-between gap-3">
            <div className={`skeleton h-4 ${widths[i % widths.length]}`} />
            <div className="skeleton h-5 w-20 rounded-md" />
          </div>
          <div className="skeleton h-3 w-3/5" />
          <div className="skeleton h-3 w-4/5" />
          <div className="skeleton mt-1 h-[31px] w-36 rounded-control" />
        </li>
      ))}
    </ul>
  );
}

/* The same idea for the loan list, which is one column of wider rows. */
export function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <ul className="grid gap-3" aria-busy="true" aria-live="polite">
      <li className="sr-only">Loading</li>
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="panel flex flex-col gap-3 p-4" aria-hidden>
          <div className="flex items-start justify-between gap-3">
            <div className="skeleton h-4 w-56" />
            <div className="skeleton h-5 w-28 rounded-md" />
          </div>
          <div className="skeleton h-3 w-36" />
        </li>
      ))}
    </ul>
  );
}



