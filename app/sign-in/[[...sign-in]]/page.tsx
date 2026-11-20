import { Suspense } from "react";
import { Header } from "@/components/Shell";
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
    <div className="flex min-h-dvh flex-col">
      {/* The header stays: without it this page is a bare card with no logo
          and no way back to the site except the browser button. */}
      <Header signedIn={false} />
      <main className="grid flex-1 place-items-center px-5 py-16">
        <Suspense
          fallback={
            <span
              className="skeleton h-[488px] w-[400px] max-w-full rounded-card"
              aria-label="Loading"
            />
          }
        >
          <SignIn />
        </Suspense>
      </main>
    </div>
  );
}
