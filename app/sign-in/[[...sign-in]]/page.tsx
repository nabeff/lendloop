import { SignIn } from "@clerk/nextjs";

/* Sign in lives on LendLoop's own domain.
 *
 * Without this route Clerk sends anyone hitting a protected page to its
 * hosted accounts domain, so the visitor leaves the site mid-flow and lands
 * on a URL that is not ours. Mounting the component here keeps the whole
 * journey on one origin. */
export default function Page() {
  return (
    <main className="grid min-h-dvh place-items-center px-5 py-16">
      <SignIn />
    </main>
  );
}
