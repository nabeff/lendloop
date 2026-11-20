"use client";

import { useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { Grid2x2, Inbox, Send, Shield, Wrench } from "lucide-react";
import { Header, SkeletonList } from "@/components/Shell";
import { api } from "@/convex/_generated/api";
import { UserSync } from "@/components/UserSync";
import { AllTools, MyListings } from "@/components/Tools";
import { Incoming, MyRequests } from "@/components/Loans";
import { Admin } from "@/components/Admin";

const NAV = [
  { key: "all", label: "All tools", icon: Grid2x2 },
  { key: "mine", label: "My listings", icon: Wrench },
  { key: "requests", label: "My requests", icon: Send },
  { key: "incoming", label: "Incoming", icon: Inbox },
] as const;

type Tab = (typeof NAV)[number]["key"] | "admin";

export default function Board() {
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const [tab, setTab] = useState<Tab>("all");
  const isAdmin = me?.role === "admin";

  // Requests waiting on this person ride on the nav, so pending work is
  // visible without opening the tab. Everything else is one click away.
  const incoming = useQuery(api.loans.incoming, isAuthenticated ? {} : "skip");
  const waiting = incoming?.filter((l) => l.status === "requested").length ?? 0;

  const items = isAdmin ? [...NAV, { key: "admin" as const, label: "Admin", icon: Shield }] : NAV;

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Behind the auth proxy: everyone here has a session. */}
      <Header signedIn />

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-5 py-7 md:px-8">
        {/* Sidebar on desktop, a scrolling strip on mobile. */}
        <aside className="hidden w-52 shrink-0 md:block">
          <nav className="sticky top-20 flex flex-col gap-0.5">
            {items.map(({ key, label, icon: Icon }) => (
              <button key={key} data-on={tab === key} onClick={() => setTab(key)} className="nav-item">
                <Icon className="size-4 shrink-0" strokeWidth={2.25} />
                {label}
                {key === "incoming" && waiting > 0 && <span className="nav-count">{waiting}</span>}
              </button>
            ))}
            {me && (
              <div className="mt-4 border-t border-line pt-4">
                <p className="px-2.5 text-xs text-muted">Signed in as</p>
                <p className="truncate px-2.5 text-sm font-semibold">{me.name}</p>
              </div>
            )}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-6 flex gap-1.5 overflow-x-auto md:hidden">
            {items.map(({ key, label, icon: Icon }) => (
              <button key={key} data-on={tab === key} onClick={() => setTab(key)} className="nav-item w-auto shrink-0">
                <Icon className="size-4" strokeWidth={2.25} />
                {label}
                {key === "incoming" && waiting > 0 && <span className="nav-count">{waiting}</span>}
              </button>
            ))}
          </div>

          <UserSync />

          {!me ? (
            <SkeletonList />
          ) : (
            <>
              {tab === "all" && <AllTools isAdmin={isAdmin} />}
              {tab === "mine" && <MyListings />}
              {tab === "requests" && <MyRequests />}
              {tab === "incoming" && <Incoming />}
              {tab === "admin" && isAdmin && <Admin />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
