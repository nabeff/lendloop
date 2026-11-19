"use client";

import { useQuery } from "convex/react";
import { Show, SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { Shell, Badge, CATEGORY_LABEL } from "@/components/Shell";

// The public page. Names and categories only, straight from Convex, no
// owner details anywhere in this payload.
export default function Home() {
  const tools = useQuery(api.tools.listPublic);
  return (
    <Shell>
      <section className="mb-10 max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight text-balance md:text-5xl">Borrow what you need. Lend what you don&apos;t.</h1>
        <p className="mt-3 text-lg text-muted">A tool board for the street. List the drill you use twice a year, borrow the ladder you need once.</p>
        <div className="mt-6 flex gap-2">
          <Show when="signed-out">
            <SignInButton mode="modal" forceRedirectUrl="/app">
              <button className="btn btn-primary">Sign in to lend or borrow</button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <Link href="/app" className="btn btn-primary">Open the board</Link>
          </Show>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Available right now</h2>
          <span className="text-sm text-muted">{tools ? `${tools.length} tools` : ""}</span>
        </div>
        {tools === undefined ? (
          <p className="text-sm text-muted">Loading</p>
        ) : tools.length === 0 ? (
          <div className="card px-6 py-10 text-center text-sm text-muted">Nothing listed yet. Sign in and be the first.</div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((t) => (
              <li key={t.id} className="card flex items-center justify-between gap-3 px-4 py-3">
                <span className="font-medium">{t.name}</span>
                <Badge>{CATEGORY_LABEL[t.category] ?? t.category}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Shell>
  );
}
