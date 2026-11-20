import { CATEGORIES, CONDITIONS } from "@/convex/schema";

/* Display labels and formatters, in a module with NO "use client".
 *
 * These used to live in components/Shell.tsx, which is a client module. A
 * server component importing a plain object from a client module does not get
 * the object, it gets a client reference proxy, so every lookup came back
 * undefined and the public board rendered raw values: "power tools" instead
 * of "Power tools". The signed-in board, being a client component, read the
 * real object and showed the right thing, so the two pages disagreed.
 *
 * Anything both sides need lives here. */

/* The category list comes from the schema, which is what the server actually
   validates against, rather than from this presentation map. Adding a category
   in one place then has to be labelled here, instead of silently never being
   offered in the picker. */
export { CATEGORIES, CONDITIONS };

const CATEGORY_LABELS: Record<(typeof CATEGORIES)[number], string> = {
  "power tools": "Power tools",
  "hand tools": "Hand tools",
  garden: "Garden",
  kitchen: "Kitchen",
  camping: "Camping",
  cleaning: "Cleaning",
  other: "Other",
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category as (typeof CATEGORIES)[number]] ?? category;
}

export type Tone = "neutral" | "ok" | "warn" | "bad" | "accent";

export const STATUS_TONE: Record<string, Tone> = {
  requested: "warn",
  approved: "ok",
  declined: "bad",
  returned: "neutral",
};

export const STATUS_LABEL: Record<string, string> = {
  requested: "Awaiting reply",
  approved: "Out on loan",
  declined: "Declined",
  returned: "Returned",
};

/* Dates in the UI are the plain calendar days the board runs on, so they are
   formatted from the string and never parsed into a local instant. The year
   is shown only when it is not the current one, so a loan from last December
   is not confused with this one. */
export function dayLabel(iso: string, today = new Date()): string {
  const parts = iso.split("-").map(Number);
  const [y, m, d] = parts;
  if (parts.length !== 3 || !Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return iso;
  if (m < 1 || m > 12 || d < 1 || d > 31) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(y === today.getUTCFullYear() ? {} : { year: "numeric" }),
    timeZone: "UTC",
  });
}

export function dateRange(start: string, end: string): string {
  return start === end ? dayLabel(start) : `${dayLabel(start)} to ${dayLabel(end)}`;
}

export function relative(ms: number, now = Date.now()): string {
  const days = Math.floor((now - ms) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 31) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "last week" : `${weeks} weeks ago`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return months === 1 ? "last month" : `${months} months ago`;
  }
  const years = Math.floor(days / 365);
  return years === 1 ? "last year" : `${years} years ago`;
}

/* The first character of a name, for an avatar. Uses the string iterator so an
   emoji or any astral-plane character is taken whole rather than split into a
   broken surrogate half, and falls back when the name is empty. */
export function initial(name: string): string {
  const first = [...(name ?? "").trim()][0];
  return (first ?? "?").toUpperCase();
}
