import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { ArrowRight, CalendarCheck, PackageOpen, ShieldCheck, Zap } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Header, Badge } from "@/components/Shell";
import { categoryLabel } from "@/lib/labels";
import { SignInCta } from "@/components/SignInCta";

/* The public page.
 *
 * It was a client component: the session and the tool list both resolved
 * after the first paint, so the hero visibly assembled itself, no button,
 * then a button, then a count. Reserving the height only hid that.
 *
 * Now the structure matches what is actually known when. The shell, the
 * headline and the three feature cards are fixed text, so they render
 * immediately and never move. Only the two things that depend on the request,
 * the call to action and the live board, sit inside their own Suspense
 * boundaries. Each one streams in already complete.
 *
 * Nothing renders a placeholder for something the server could have answered
 * outright, which is why there is no skeleton under the header button. */

export default function Page() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* The signed-out header is the safe default: it is what most visitors
          get, and the signed-in version replaces it in the same paint. */}
      <Suspense fallback={<Header signedIn={false} />}>
        <LiveHeader />
      </Suspense>

      <section className="relative overflow-hidden border-b border-line">
        <div className="bloom pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto w-full max-w-6xl px-5 pb-16 pt-20 md:px-8 md:pb-20 md:pt-28">
          <p className="eyebrow mb-5">
            <span className="size-1.5 rounded-full bg-spark" aria-hidden />A tool board for your street
          </p>
          <h1 className="display max-w-3xl">
            Borrow what you need.
            <br />
            Lend what you don&apos;t.
          </h1>
          <p className="lede mt-5 max-w-lg">
            Your neighbours already own most of what you are about to buy. List the drill you use twice a
            year, borrow the ladder you need once.
          </p>

          {/* The button is rendered immediately, never streamed. A fallback of
              null meant the hero had no button for a beat and then one appeared
              out of nowhere, which is worse than the flicker it replaced.
              The signed-out call to action is identical for every visitor, so
              it ships in the first byte and the signed-in variant swaps in
              behind it without moving anything. */}
          <div className="mt-8 flex min-h-9 flex-wrap items-center gap-3">
            <Suspense fallback={<SignInCta />}>
              <HeroCta />
            </Suspense>
          </div>

          <ul className="mt-14 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3">
            {[
              { icon: CalendarCheck, title: "Ask for exact dates", body: "Pick the days you need it. Overlapping bookings are refused by the server, not the form." },
              { icon: Zap, title: "The owner gets told", body: "Every request, approval and return fires a webhook into an automation that notifies the other side." },
              { icon: ShieldCheck, title: "Late tools chase themselves", body: "A scheduled run finds overdue loans each morning and reminds the borrower once a day." },
            ].map(({ icon: Icon, title, body }) => (
              <li key={title} className="bg-panel p-5">
                <Icon className="mb-3 size-[18px] text-accent" strokeWidth={2.25} />
                <h3 className="h2">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl flex-1 px-5 py-14 md:px-8">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Available right now</h2>
            <p className="mt-1 text-sm text-muted">Live from the board. No account needed to look.</p>
          </div>
        </div>
        <Suspense fallback={<BoardSkeleton />}>
          <LiveBoard />
        </Suspense>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-muted md:px-8">
          <span>LendLoop</span>
          <span>Next.js, Clerk, Convex and n8n.</span>
        </div>
      </footer>
    </div>
  );
}

/* connection() marks each of these as request-time work before any network
   call. Without it, cacheComponents tries to prerender the subtree and the
   Convex client generating a request id trips its stability guard. */

async function LiveHeader() {
  await connection();
  const { userId } = await auth();
  return <Header signedIn={Boolean(userId)} />;
}

async function HeroCta() {
  await connection();
  const [{ userId }, tools] = await Promise.all([auth(), fetchQuery(api.tools.listPublic)]);
  const count = tools.length;
  return (
    <>
      {userId ? (
        <Link href="/app" className="btn btn-primary">
          Open the board
          <ArrowRight className="size-4" strokeWidth={2.5} />
        </Link>
      ) : (
        <SignInCta />
      )}
      {count > 0 && (
        <span className="text-sm text-muted">
          <span className="font-semibold text-ink tabular">{count}</span>{" "}
          {count === 1 ? "tool is" : "tools are"} free on the board right now
        </span>
      )}
    </>
  );
}

async function LiveBoard() {
  await connection();
  const tools = await fetchQuery(api.tools.listPublic);

  if (tools.length === 0)
    return (
      <div className="panel flex flex-col items-center gap-2 px-6 py-16 text-center">
        <div className="mb-1 grid size-11 place-items-center rounded-xl bg-raised text-muted">
          <PackageOpen className="size-5" />
        </div>
        <p className="font-semibold">Nothing listed yet</p>
        <p className="max-w-sm text-sm text-muted">
          Sign in and put the first tool on the board. One listing is enough to start a loop.
        </p>
      </div>
    );

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((t) => (
        <li key={t.id} className="row flex items-center justify-between gap-3 px-4 py-3.5">
          <span className="truncate font-semibold" title={t.name}>
            {t.name}
          </span>
          <Badge>{categoryLabel(t.category)}</Badge>
        </li>
      ))}
    </ul>
  );
}

/* The board is the one place a skeleton earns its keep: the row count is
   genuinely unknown until the query returns. */
function BoardSkeleton() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="row flex items-center justify-between gap-3 px-4 py-3.5" aria-hidden>
          <span className="skeleton h-4 w-28" />
          <span className="skeleton h-5 w-20 rounded-md" />
        </li>
      ))}
    </ul>
  );
}
