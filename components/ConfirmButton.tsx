"use client";

import { useEffect, useRef, useState } from "react";
import { errorText } from "./Tools";

/* A destructive action that confirms in place.
 *
 * This replaces window.confirm, which was wrong twice over: it drops an
 * unstyled operating system dialog into an otherwise art-directed product,
 * and the call behind it was fire and forget, so a failed delete was
 * swallowed with no message and the row simply stayed put.
 *
 * Here the button turns into its own confirmation, the action is awaited, the
 * button is disabled while it runs, and a failure is shown next to it. */
export function ConfirmButton({
  label,
  confirmLabel,
  title,
  onConfirm,
  className = "btn btn-quiet btn-sm text-bad",
}: {
  label: string;
  confirmLabel: string;
  title: string;
  onConfirm: () => Promise<unknown>;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Armed is a trap if the only way out is the mouse, so Escape disarms it.
  useEffect(() => {
    if (!armed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setArmed(false);
    };
    window.addEventListener("keydown", onKey);
    cancelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [armed]);

  if (!armed)
    return (
      <div className="ml-auto flex flex-col items-end gap-1">
        <button onClick={() => setArmed(true)} className={className} title={title}>
          {label}
        </button>
        {error && (
          <p role="alert" className="text-xs font-medium text-bad">
            {error}
          </p>
        )}
      </div>
    );

  return (
    <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
      <span className="text-xs text-muted">{title}</span>
      <button
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await onConfirm();
            // The row disappears on success, so no state reset is needed.
          } catch (e) {
            setError(errorText(e));
            setArmed(false);
          } finally {
            setBusy(false);
          }
        }}
        disabled={busy}
        className="btn btn-danger btn-sm"
      >
        {busy ? "Removing" : confirmLabel}
      </button>
      <button ref={cancelRef} onClick={() => setArmed(false)} disabled={busy} className="btn btn-quiet btn-sm">
        Cancel
      </button>
    </div>
  );
}
