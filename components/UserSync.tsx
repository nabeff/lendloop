"use client";

import { useEffect } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// Creates the user row on first sign in and keeps name and role current.
export function UserSync() {
  const { isAuthenticated } = useConvexAuth();
  const ensure = useMutation(api.users.ensure);
  useEffect(() => {
    if (isAuthenticated) void ensure({});
  }, [isAuthenticated, ensure]);
  return null;
}
