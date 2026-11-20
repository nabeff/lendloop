import { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";

/* Sign in lives on LendLoop's own domain.
 *
 * Without this route Clerk sends anyone hitting a protected page to its
 * hosted accounts domain, so the visitor leaves the site mid-flow and lands
 * on a URL that is not ours. Mounting the component here keeps the whole
 * journey on one origin.
 *
 * Clerk reads the request to decide what to render, so under cacheComponents
 * it cannot be prerendered and needs its own boundary. The fallback holds the
 * card's height, so the page does not jump when it lands. */
export default function Page() {
  return (
    <main className="grid min-h-dvh place-items-center px-5 py-16">
      <Suspense
        fallback={<span className="skeleton h-[420px] w-[400px] max-w-full rounded-card" aria-label="Loading" />}
      >
        <SignIn />
      </Suspense>
    </main>
  );
}
