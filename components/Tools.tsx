"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge, CATEGORY_LABEL } from "./Shell";

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
  new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

// Every tool on the board, filterable, with a borrow form per row.
export function AllTools({ isAdmin }: { isAdmin: boolean }) {
  const [category, setCategory] = useState<string>("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const tools = useQuery(api.tools.listAll, category ? { category } : {});
  const remove = useMutation(api.tools.remove);
  const shown = (tools ?? []).filter((t) => !onlyAvailable || t.available);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="field w-auto">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} className="accent-accent" />
          Available only
        </label>
        <span className="ml-auto text-sm text-muted">{tools ? `${shown.length} tools` : ""}</span>
      </div>

      {!tools ? (
        <p className="text-sm text-muted">Loading</p>
      ) : shown.length === 0 ? (
        <div className="card px-6 py-10 text-center text-sm text-muted">No tools here yet.</div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {shown.map((t) => (
            <li key={t.id} className="card flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">{t.name}</div>
                  <div className="mt-0.5 text-sm text-muted">
                    {CATEGORY_LABEL[t.category] ?? t.category} · {t.condition}
                    {t.owner && <> · {t.mine ? "yours" : t.owner.name}{t.owner.trustedLender && " ★"}</>}
                  </div>
                </div>
                {t.available ? <Badge tone="ok">Available</Badge> : <Badge tone="warn">Back {t.backOn}</Badge>}
              </div>
              {t.description && <p className="text-sm text-muted">{t.description}</p>}
              <div className="flex flex-wrap items-center gap-2">
                {!t.mine && t.available && <BorrowForm toolId={t.id} />}
                {isAdmin && (
                  <button
                    onClick={() => { if (confirm(`Remove "${t.name}" from the board?`)) void remove({ toolId: t.id }); }}
                    className="btn btn-ghost btn-sm ml-auto text-bad"
                  >
                    Remove listing
                  </button>
                )}
              </div>
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
  const [done, setDone] = useState(false);

  if (done) return <Badge tone="accent">Requested</Badge>;
  if (!open) return <button onClick={() => setOpen(true)} className="btn btn-primary btn-sm">Request to borrow</button>;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        try {
          await request({ toolId, startDate: start, endDate: end });
          setDone(true);
        } catch (err) {
          setError(errorText(err));
        }
      }}
      className="flex w-full flex-wrap items-end gap-2"
    >
      <label className="text-xs text-muted">From<input type="date" value={start} min={todayIso()} onChange={(e) => setStart(e.target.value)} className="field mt-1 w-auto" required /></label>
      <label className="text-xs text-muted">Until<input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className="field mt-1 w-auto" required /></label>
      <button type="submit" className="btn btn-primary btn-sm">Send request</button>
      <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-sm">Cancel</button>
      {error && <p className="w-full text-sm text-bad">{error}</p>}
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
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-muted">{tools ? `${tools.length} listed` : ""}</span>
        {editing !== "new" && <button onClick={() => setEditing("new")} className="btn btn-primary btn-sm">List a tool</button>}
      </div>

      {editing === "new" && (
        <ToolForm
          initial={blank}
          onCancel={() => setEditing(null)}
          onSave={async (f) => { await create(f); setEditing(null); }}
        />
      )}

      {!tools ? (
        <p className="text-sm text-muted">Loading</p>
      ) : tools.length === 0 && editing !== "new" ? (
        <div className="card px-6 py-10 text-center text-sm text-muted">You have not listed anything yet.</div>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {tools.map((t) =>
            editing === t.id ? (
              <li key={t.id} className="sm:col-span-2">
                <ToolForm
                  initial={{ name: t.name, category: t.category, condition: t.condition, description: t.description }}
                  onCancel={() => setEditing(null)}
                  onSave={async (f) => { await update({ toolId: t.id, ...f }); setEditing(null); }}
                />
              </li>
            ) : (
              <li key={t.id} className="card flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{t.name}</div>
                    <div className="mt-0.5 text-sm text-muted">{CATEGORY_LABEL[t.category] ?? t.category} · {t.condition}</div>
                  </div>
                  {t.available ? <Badge tone="ok">Available</Badge> : <Badge tone="warn">On loan</Badge>}
                </div>
                {t.description && <p className="text-sm text-muted">{t.description}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setEditing(t.id)} className="btn btn-ghost btn-sm">Edit</button>
                  <button onClick={() => { if (confirm(`Delete "${t.name}"?`)) void remove({ toolId: t.id }); }} className="btn btn-ghost btn-sm text-bad">Delete</button>
                </div>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}

function ToolForm({
  initial, onSave, onCancel,
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
      className="card grid gap-3 p-4 sm:grid-cols-2"
    >
      <label className="text-xs text-muted sm:col-span-2">Name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="field mt-1" placeholder="Cordless drill" maxLength={60} required /></label>
      <label className="text-xs text-muted">Category
        <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className="field mt-1">
          {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
        </select>
      </label>
      <label className="text-xs text-muted">Condition
        <select value={f.condition} onChange={(e) => setF({ ...f, condition: e.target.value })} className="field mt-1">
          {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <label className="text-xs text-muted sm:col-span-2">Short description<textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="field-area mt-1" rows={2} maxLength={400} placeholder="18V, two batteries, comes with a bit set" /></label>
      {error && <p className="text-sm text-bad sm:col-span-2">{error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" disabled={busy} className="btn btn-primary btn-sm">Save</button>
        <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm">Cancel</button>
      </div>
    </form>
  );
}
