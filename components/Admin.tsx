"use client";

import { useMutation, useQuery } from "convex/react";
import { Star } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Badge, SectionHead } from "./Shell";
import { AllLoans } from "./Loans";

export function Admin() {
  const users = useQuery(api.users.list);
  const setTrusted = useMutation(api.users.setTrustedLender);

  return (
    <div className="grid gap-10">
      <section>
        <SectionHead
          title="Neighbours"
          count={users?.length}
          hint="Mark someone as a trusted lender and a star shows next to their listings."
        />
        {!users ? (
          <div className="panel divide-y divide-line" aria-hidden>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-4">
                <div className="flex-1">
                  <div className="skeleton h-4 w-32" />
                  <div className="skeleton mt-2 h-3 w-48" />
                </div>
                <div className="skeleton h-8 w-36" />
              </div>
            ))}
          </div>
        ) : (
          <ul className="panel divide-y divide-line overflow-hidden">
            {users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-raised text-sm font-bold text-ink-soft">
                  {u.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{u.name}</span>
                    {u.role === "admin" && <Badge tone="accent">Admin</Badge>}
                    {u.trustedLender && (
                      <Badge tone="ok">
                        <Star className="size-3 fill-current" />
                        Trusted
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-sm text-muted">{u.email}</p>
                </div>
                <button
                  onClick={() => void setTrusted({ userId: u.id, trusted: !u.trustedLender })}
                  className="btn btn-ghost btn-sm"
                >
                  {u.trustedLender ? "Remove trust" : "Mark as trusted"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionHead title="All loans" hint="Every request across the board, oldest activity last." />
        <AllLoans />
      </section>
    </div>
  );
}
