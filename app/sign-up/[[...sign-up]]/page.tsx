import { SignUp } from "@clerk/nextjs";

/* The sign-up twin of the route above: same reason, same shape. */
export default function Page() {
  return (
    <main className="grid min-h-dvh place-items-center px-5 py-16">
      <SignUp />
    </main>
  );
}
