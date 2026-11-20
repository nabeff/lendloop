"use client";

import { SignInButton } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";

/* The only part of the landing page that has to run in the browser: Clerk's
   modal needs a click handler. The server already decided WHICH button to
   render, so this never flickers between signed-in and signed-out states. */
export function SignInCta() {
  return (
    <SignInButton mode="modal" forceRedirectUrl="/app">
      <button className="btn btn-primary">
        Start lending
        <ArrowRight className="size-4" strokeWidth={2.5} />
      </button>
    </SignInButton>
  );
}

/* Same reason as above: the server decides this button should exist, the
   browser only needs the click handler for Clerk's modal. */
export function SignInHeaderButton() {
  return (
    <SignInButton mode="modal" forceRedirectUrl="/app">
      <button className="btn btn-primary btn-sm">Sign in</button>
    </SignInButton>
  );
}
