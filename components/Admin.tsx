"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "./Shell";
import { AllLoans } from "./Loans";

export function Admin() {
  const users = useQuery(api.users.list);
  const setTrusted = useMutation(api.users.setTrustedLender);
  return (
    <div className="grid gap-8">
      <section>
        <h2 className="mb-3 text-base font-semibold">Neighbours</h2>
        {!users ? (
          <p className="text-sm text-muted">Loading</p>
        ) : (
          <ul className="card divide-y divide-line">
            {users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{u.name} {u.role === "admin" && <Badge tone="accent">admin</Badge>}</div>
                  <div className="text-sm text-muted">{u.email}</div>
                </div>
                {u.trustedLender && <Badge tone="ok">Trusted Lender</Badge>}
                <button onClick={() => void setTrusted({ userId: u.id, trusted: !u.trustedLender })} className="btn btn-ghost btn-sm">
                  {u.trustedLender ? "Remove trust" : "Mark as Trusted Lender"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-base font-semibold">All loans</h2>
        <AllLoans />
      </section>
    </div>
  );
}
