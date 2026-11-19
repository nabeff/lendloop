import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const CATEGORIES = ["power tools", "hand tools", "garden", "kitchen", "camping", "cleaning", "other"] as const;
export const CONDITIONS = ["new", "good", "worn", "needs care"] as const;

export const loanStatus = v.union(v.literal("requested"), v.literal("approved"), v.literal("declined"), v.literal("returned"));

export default defineSchema({
  // One row per Clerk account. Role and trust live here, never in the client.
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
    trustedLender: v.boolean(),
  }).index("by_clerkId", ["clerkId"]),

  tools: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category: v.string(),
    condition: v.string(),
    description: v.string(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_category", ["category"]),

  // A borrow request and, once approved, the loan itself. Dates are ISO
  // calendar days (YYYY-MM-DD) so they compare as strings.
  loans: defineTable({
    toolId: v.id("tools"),
    lenderId: v.id("users"),
    borrowerId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
    status: loanStatus,
    updatedAt: v.number(),
  })
    .index("by_tool", ["toolId"])
    .index("by_borrower", ["borrowerId"])
    .index("by_lender", ["lenderId"])
    .index("by_status", ["status"]),

  // What the automation did for a loan. externalId makes every write-back
  // idempotent: a retried n8n run with the same id is a no-op.
  activity: defineTable({
    loanId: v.id("loans"),
    kind: v.union(v.literal("notification"), v.literal("reminder"), v.literal("failure")),
    externalId: v.string(),
    message: v.string(),
  })
    .index("by_loan", ["loanId"])
    .index("by_externalId", ["externalId"]),
});
