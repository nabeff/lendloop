"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = url ? new ConvexReactClient(url) : null;

// Clerk owns the session, Convex receives Clerk's "convex" JWT on every call.
export function Providers({ children }: { children: ReactNode }) {
  if (!convex) {
    return (
      <main className="mx-auto max-w-md px-6 py-20 text-sm text-muted">
        Set NEXT_PUBLIC_CONVEX_URL in .env.local, then restart. See the README.
      </main>
    );
  }
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
