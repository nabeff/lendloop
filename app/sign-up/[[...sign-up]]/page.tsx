import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";

/* The sign-up twin of the sign-in route: same reason, same shape. Keeping
   both on our own domain means a new neighbour never leaves the site to
   create an account. */
export default function Page() {
  return (
    <main className="grid min-h-dvh place-items-center px-5 py-16">
      <Suspense
        fallback={<span className="skeleton h-[460px] w-[400px] max-w-full rounded-card" aria-label="Loading" />}
      >
        <SignUp />
      </Suspense>
    </main>
  );
}
