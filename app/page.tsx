import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { ArrowRight, CalendarCheck, PackageOpen, ShieldCheck, Zap } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Header, Badge, CATEGORY_LABEL } from "@/components/Shell";
import { Wrench } from "lucide-react";
import { SignInCta } from "@/components/SignInCta";

/* The public page is rendered on the SERVER.
 *
 * It was a client component that called useQuery and read the Clerk session in
 * the browser. Both resolve after the first paint, so the first frame had no
 * button and no count, and the hero assembled itself in front of the visitor.
 * Reserving the height hid the jump, but the page was still arriving in parts.
 *
 * Here the tool list is fetched server side and the session is read from the
 * request, so the HTML that leaves the server is already the finished page.
 * Nothing fades in, because nothing was missing.
 *
 * This component reads the request, so under Next 16 cacheComponents it is
 * uncacheable by definition and must sit inside a Suspense boundary. The
 * boundary lives in page.tsx below, not here, so the shell around it can
 * still be prerendered. */
async function HeroAndBoard() {
  // Declare this as request-time work BEFORE touching the network. Under
  // cacheComponents Next otherwise tries to prerender this subtree, and the
  // Convex client generating a request id trips its "unstable value" guard.
  await connection();

  // In parallel: neither depends on the other, so awaiting them in sequence
  // would add a round trip for nothing.
  const [tools, { userId }] = await Promise.all([fetchQuery(api.tools.listPublic), auth()]);
  const count = tools.length;

  return (
    <div className="flex min-h-dvh flex-col">
      <Header signedIn={Boolean(userId)} />

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

          <div className="mt-8 flex flex-wrap items-center gap-3">
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
          <span className="text-sm text-muted tabular">{count} listed</span>
        </div>

        {count === 0 ? (
          <div className="panel flex flex-col items-center gap-2 px-6 py-16 text-center">
            <div className="mb-1 grid size-11 place-items-center rounded-xl bg-raised text-muted">
              <PackageOpen className="size-5" />
            </div>
            <p className="font-semibold">Nothing listed yet</p>
            <p className="max-w-sm text-sm text-muted">
              Sign in and put the first tool on the board. One listing is enough to start a loop.
            </p>
          </div>
        ) : (
          <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((t) => (
              <li key={t.id} className="row flex items-center justify-between gap-3 px-4 py-3.5">
                <span className="truncate font-semibold">{t.name}</span>
                <Badge>{CATEGORY_LABEL[t.category] ?? t.category}</Badge>
              </li>
            ))}
          </ul>
        )}
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

/* The page shell prerenders. Everything that reads the request (the session
   and the live board) streams into this boundary, so the visitor gets real
   HTML immediately and the dynamic part arrives already complete rather than
   assembling itself in the browser. */
export default function Page() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HeroAndBoard />
    </Suspense>
  );
}

/* The fallback is the same layout with the text in place and only the live
   numbers missing, so the frame that streams in replaces it without moving
   anything. */
function HomeSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-base/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-5 md:px-8">
          <span className="flex items-center gap-2.5 font-bold tracking-tight">
            <span className="grid size-7 place-items-center rounded-lg bg-accent text-accent-ink">
              <Wrench className="size-[15px]" strokeWidth={2.5} />
            </span>
            LendLoop
          </span>
          <span className="skeleton h-8 w-20 rounded-control" />
        </div>
      </header>
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
          <div className="mt-8 flex items-center gap-3">
            <span className="skeleton h-9 w-36 rounded-control" />
          </div>
        </div>
      </section>
    </div>
  );
}
