"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { CalendarDays, PackageOpen, Plus, Star, Wrench } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge, CATEGORY_LABEL, Empty, SectionHead, SkeletonList, dayLabel } from "./Shell";

const CATEGORIES = Object.keys(CATEGORY_LABEL);
const CONDITIONS = ["new", "good", "worn", "needs care"];

export function errorText(e: unknown): string {
  if (e instanceof ConvexError) return String(e.data);
  return "Something went wrong, try again.";
}

// Must match convex/lib.ts: the board has one calendar, so the earliest day
// the picker offers is the same day the server calls today.
const ZONE = process.env.NEXT_PUBLIC_LENDLOOP_TIMEZONE ?? "Europe/London";
const todayIso = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(),
  );

// Every tool on the board, filterable, with a borrow form per row.
export function AllTools({ isAdmin }: { isAdmin: boolean }) {
  const [category, setCategory] = useState<string>("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const tools = useQuery(api.tools.listAll, category ? { category } : {});
  const remove = useMutation(api.tools.remove);
  const shown = (tools ?? []).filter((t) => !onlyAvailable || t.available);
  const filtered = category !== "" || onlyAvailable;

  return (
    <div>
      <SectionHead
        title="All tools"
        count={tools ? shown.length : undefined}
        hint="Everything your neighbours have put on the board."
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="select"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
        <label className="check">
          <input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} />
          Free today
        </label>
        {filtered && (
          <button
            onClick={() => {
              setCategory("");
              setOnlyAvailable(false);
            }}
            className="btn btn-quiet btn-sm"
          >
            Clear
          </button>
        )}
      </div>

      {!tools ? (
        <SkeletonList />
      ) : shown.length === 0 ? (
        <Empty icon={<PackageOpen className="size-5" />} title={filtered ? "Nothing matches that" : "The board is empty"}>
          {filtered
            ? "Try another category, or clear the filters to see everything."
            : "Be the first to list something. Open My listings and add a tool."}
        </Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {shown.map((t) => (
            <li key={t.id} className="row flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{t.name}</h3>
                  <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
                    <span>{CATEGORY_LABEL[t.category] ?? t.category}</span>
                    <span aria-hidden>·</span>
                    <span>{t.condition}</span>
                    {t.owner && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="inline-flex items-center gap-1">
                          {t.mine ? "yours" : t.owner.name}
                          {t.owner.trustedLender && (
                            <Star className="size-3.5 fill-warn text-warn" aria-label="Trusted lender" />
                          )}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                {t.available ? (
                  <Badge tone="ok">Available</Badge>
                ) : (
                  <Badge tone="warn">Back {t.backOn ? dayLabel(t.backOn) : "soon"}</Badge>
                )}
              </div>

              {t.description && <p className="text-sm leading-relaxed text-ink-soft">{t.description}</p>}

              {(!t.mine || isAdmin) && (
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                  {!t.mine && t.available && <BorrowForm toolId={t.id} />}
                  {isAdmin && (
                    <button
                      onClick={() => {
                        if (confirm(`Remove "${t.name}" from the board? Open requests are declined.`))
                          void remove({ toolId: t.id });
                      }}
                      className="btn btn-quiet btn-sm ml-auto text-bad"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BorrowForm({ toolId }: { toolId: Id<"tools"> }) {
  const request = useMutation(api.loans.request);
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(todayIso());
  const [end, setEnd] = useState(todayIso());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (done) return <Badge tone="accent">Request sent</Badge>;

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="btn btn-primary btn-sm">
        <CalendarDays className="size-4" strokeWidth={2.25} />
        Request to borrow
      </button>
    );

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await request({ toolId, startDate: start, endDate: end });
          setDone(true);
        } catch (err) {
          setError(errorText(err));
        } finally {
          setBusy(false);
        }
      }}
      className="w-full rounded-control border border-line bg-raised p-3"
    >
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="label" htmlFor={`from-${toolId}`}>
            From
          </label>
          <input
            id={`from-${toolId}`}
            type="date"
            value={start}
            min={todayIso()}
            onChange={(e) => {
              setStart(e.target.value);
              if (e.target.value > end) setEnd(e.target.value);
            }}
            className="field w-auto"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor={`until-${toolId}`}>
            Until
          </label>
          <input
            id={`until-${toolId}`}
            type="date"
            value={end}
            min={start}
            onChange={(e) => setEnd(e.target.value)}
            className="field w-auto"
            required
          />
        </div>
        <button type="submit" disabled={busy} className="btn btn-primary btn-sm">
          {busy ? "Sending" : "Send request"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-quiet btn-sm">
          Cancel
        </button>
      </div>
      {error && <p className="mt-2 text-sm font-medium text-bad">{error}</p>}
    </form>
  );
}

// The owner's own listings with create, edit and delete.
export function MyListings() {
  const tools = useQuery(api.tools.mine);
  const create = useMutation(api.tools.create);
  const update = useMutation(api.tools.update);
  const remove = useMutation(api.tools.remove);
  const [editing, setEditing] = useState<Id<"tools"> | "new" | null>(null);

  const blank = { name: "", category: "hand tools", condition: "good", description: "" };

  return (
    <div>
      <SectionHead
        title="My listings"
        count={tools?.length}
        hint="Tools you are lending out."
        action={
          editing !== "new" ? (
            <button onClick={() => setEditing("new")} className="btn btn-primary btn-sm">
              <Plus className="size-4" strokeWidth={2.5} />
              List a tool
            </button>
          ) : undefined
        }
      />

      {editing === "new" && (
        <div className="mb-3">
          <ToolForm
            initial={blank}
            onCancel={() => setEditing(null)}
            onSave={async (f) => {
              await create(f);
              setEditing(null);
            }}
          />
        </div>
      )}

      {!tools ? (
        <SkeletonList rows={2} />
      ) : tools.length === 0 && editing !== "new" ? (
        <Empty icon={<Wrench className="size-5" />} title="You have not listed anything yet">
          Think of the thing in your cupboard you used once. That is the one someone on your street needs
          this weekend.
        </Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {tools.map((t) =>
            editing === t.id ? (
              <li key={t.id} className="sm:col-span-2">
                <ToolForm
                  initial={{
                    name: t.name,
                    category: t.category,
                    condition: t.condition,
                    description: t.description,
                  }}
                  onCancel={() => setEditing(null)}
                  onSave={async (f) => {
                    await update({ toolId: t.id, ...f });
                    setEditing(null);
                  }}
                />
              </li>
            ) : (
              <li key={t.id} className="panel flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{t.name}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {CATEGORY_LABEL[t.category] ?? t.category} · {t.condition}
                    </p>
                  </div>
                  {t.available ? <Badge tone="ok">Available</Badge> : <Badge tone="warn">On loan</Badge>}
                </div>
                {t.description && <p className="text-sm leading-relaxed text-ink-soft">{t.description}</p>}
                <div className="mt-auto flex gap-2 pt-1">
                  <button onClick={() => setEditing(t.id)} className="btn btn-ghost btn-sm">
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${t.name}"? Open requests are declined.`)) void remove({ toolId: t.id });
                    }}
                    className="btn btn-quiet btn-sm text-bad"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

function ToolForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: { name: string; category: string; condition: string; description: string };
  onSave: (f: typeof initial) => Promise<void>;
  onCancel: () => void;
}) {
  const [f, setF] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await onSave(f);
        } catch (err) {
          setError(errorText(err));
        } finally {
          setBusy(false);
        }
      }}
      className="panel grid gap-4 p-5 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <label className="label" htmlFor="tool-name">
          Name
        </label>
        <input
          id="tool-name"
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          className="field"
          placeholder="Cordless drill"
          maxLength={60}
          required
          autoFocus
        />
      </div>

      <div>
        <label className="label" htmlFor="tool-category">
          Category
        </label>
        <select
          id="tool-category"
          value={f.category}
          onChange={(e) => setF({ ...f, category: e.target.value })}
          className="select w-full"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="tool-condition">
          Condition
        </label>
        <select
          id="tool-condition"
          value={f.condition}
          onChange={(e) => setF({ ...f, condition: e.target.value })}
          className="select w-full"
        >
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <label className="label" htmlFor="tool-description">
          Short description
        </label>
        <textarea
          id="tool-description"
          value={f.description}
          onChange={(e) => setF({ ...f, description: e.target.value })}
          className="field-area"
          rows={2}
          maxLength={400}
          placeholder="18V, two batteries, comes with a bit set"
        />
      </div>

      {error && <p className="text-sm font-medium text-bad sm:col-span-2">{error}</p>}

      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" disabled={busy} className="btn btn-primary btn-sm">
          {busy ? "Saving" : "Save"}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-quiet btn-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}
