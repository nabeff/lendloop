"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Shell } from "@/components/Shell";
import { UserSync } from "@/components/UserSync";
import { AllTools, MyListings } from "@/components/Tools";
import { Incoming, MyRequests } from "@/components/Loans";
import { Admin } from "@/components/Admin";

const TABS = [
  { key: "all", label: "All tools" },
  { key: "mine", label: "My listings" },
  { key: "requests", label: "My requests" },
  { key: "incoming", label: "Incoming requests" },
] as const;

type Tab = (typeof TABS)[number]["key"] | "admin";

export default function Board() {
  const me = useQuery(api.users.me);
  const [tab, setTab] = useState<Tab>("all");
  const isAdmin = me?.role === "admin";
  const incoming = useQuery(api.loans.incoming);
  const waiting = incoming?.filter((l) => l.status === "requested").length ?? 0;

  return (
    <Shell>
      <UserSync />
      <div className="mb-6 flex flex-wrap items-center gap-1">
        {TABS.map((t) => (
          <button key={t.key} data-on={tab === t.key} onClick={() => setTab(t.key)} className="tab">
            {t.label}{t.key === "incoming" && waiting > 0 && <span className="ml-1.5 rounded-full bg-accent px-1.5 text-xs text-white">{waiting}</span>}
          </button>
        ))}
        {isAdmin && <button data-on={tab === "admin"} onClick={() => setTab("admin")} className="tab">Admin</button>}
      </div>

      {me === undefined ? (
        <p className="text-sm text-muted">Loading</p>
      ) : (
        <>
          {tab === "all" && <AllTools isAdmin={isAdmin} />}
          {tab === "mine" && <MyListings />}
          {tab === "requests" && <MyRequests />}
          {tab === "incoming" && <Incoming />}
          {tab === "admin" && isAdmin && <Admin />}
        </>
      )}
    </Shell>
  );
}
