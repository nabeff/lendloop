import { Suspense } from "react";
import { Header } from "@/components/Shell";
import { SignUp } from "@clerk/nextjs";

/* The sign-up twin of the sign-in route: same reason, same shape. Keeping
   both on our own domain means a new neighbour never leaves the site to
   create an account. */
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
              className="skeleton h-[520px] w-[400px] max-w-full rounded-card"
              aria-label="Loading"
            />
          }
        >
          <SignUp />
        </Suspense>
      </main>
    </div>
  );
}
