import { ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type Ctx = QueryCtx | MutationCtx;

// Every access rule starts here. The identity comes from the Clerk JWT that
// Convex verified, the row carries the role, nothing is trusted from the UI.
export async function currentUser(ctx: Ctx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

export async function requireUser(ctx: Ctx): Promise<Doc<"users">> {
  const user = await currentUser(ctx);
  if (!user) throw new ConvexError("Sign in first.");
  return user;
}

export async function requireAdmin(ctx: Ctx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== "admin") throw new ConvexError("Admins only.");
  return user;
}

export async function requireTool(ctx: Ctx, toolId: Id<"tools">): Promise<Doc<"tools">> {
  const tool = await ctx.db.get(toolId);
  if (!tool) throw new ConvexError("That tool no longer exists.");
  return tool;
}

export async function requireLoan(ctx: Ctx, loanId: Id<"loans">): Promise<Doc<"loans">> {
  const loan = await ctx.db.get(loanId);
  if (!loan) throw new ConvexError("That request no longer exists.");
  return loan;
}

// Owner or admin. Everyone else gets the same error, so the check leaks
// nothing about who owns what.
export function assertOwnerOrAdmin(user: Doc<"users">, ownerId: Id<"users">): void {
  if (user._id !== ownerId && user.role !== "admin") throw new ConvexError("Not yours to change.");
}

export const today = (): string => new Date().toISOString().slice(0, 10);

export const isIsoDay = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

// A tool is on loan while one approved loan exists for it.
export async function activeLoan(ctx: Ctx, toolId: Id<"tools">): Promise<Doc<"loans"> | null> {
  const loans = await ctx.db
    .query("loans")
    .withIndex("by_tool", (q) => q.eq("toolId", toolId))
    .collect();
  return loans.find((l) => l.status === "approved") ?? null;
}

// Public view of a user: name only, never the email.
export const publicUser = (u: Doc<"users"> | null) => (u ? { id: u._id, name: u.name, trustedLender: u.trustedLender } : null);
