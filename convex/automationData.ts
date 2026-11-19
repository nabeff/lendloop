import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { loanStatus } from "./schema";
import { today } from "./lib";

// Convex side of the n8n integration: the queries and writes the HTTP
// endpoints and the notify action call. Nothing here is reachable from the
// browser, every function is internal.

// The minimum a notification needs. The recipient is whoever has to act or
// know: the lender for a new request, the borrower for a decision.
export const loanEvent = internalQuery({
  args: { loanId: v.id("loans"), status: loanStatus, eventId: v.string() },
  handler: async (ctx, { loanId, status, eventId }) => {
    const loan = await ctx.db.get(loanId);
    if (!loan) return null;
    const tool = await ctx.db.get(loan.toolId);
    const recipientId = status === "requested" ? loan.lenderId : loan.borrowerId;
    const recipient = await ctx.db.get(recipientId);
    const other = await ctx.db.get(status === "requested" ? loan.borrowerId : loan.lenderId);
    if (!recipient) return null;
    return {
      eventId,
      loanId,
      status,
      tool: tool?.name ?? "a tool",
      startDate: loan.startDate,
      endDate: loan.endDate,
      recipient: { name: recipient.name, email: recipient.email },
      counterpart: other?.name ?? "a neighbour",
    };
  },
});

// Approved loans whose return date has passed. Returned to n8n for the daily
// reminder run. Borrower email is included because that is who gets the
// reminder, nothing about the lender travels.
export const overdue = internalQuery({
  args: {},
  handler: async (ctx) => {
    const day = today();
    const loans = await ctx.db.query("loans").withIndex("by_status", (q) => q.eq("status", "approved")).collect();
    const out = [];
    for (const l of loans) {
      if (l.endDate >= day) continue;
      const [tool, borrower, reminders] = await Promise.all([
        ctx.db.get(l.toolId),
        ctx.db.get(l.borrowerId),
        ctx.db.query("activity").withIndex("by_loan", (q) => q.eq("loanId", l._id)).collect(),
      ]);
      if (!borrower) continue;
      const sent = reminders.filter((a) => a.kind === "reminder");
      out.push({
        loanId: l._id,
        tool: tool?.name ?? "a tool",
        endDate: l.endDate,
        daysOverdue: Math.round((Date.parse(day) - Date.parse(l.endDate)) / 86_400_000),
        borrower: { name: borrower.name, email: borrower.email },
        remindersSent: sent.length,
        lastReminderAt: sent.length ? Math.max(...sent.map((a) => a._creationTime)) : null,
      });
    }
    return out;
  },
});

// Idempotent write-back. The externalId is the dedupe key: the same reminder
// or notification acknowledged twice is stored once.
// The loan id arrives from n8n as a plain string, so it is normalised here
// and an unknown id is a clean "not found", never a thrown validation error.
export const record = internalMutation({
  args: {
    loanId: v.string(),
    kind: v.union(v.literal("notification"), v.literal("reminder")),
    externalId: v.string(),
    message: v.string(),
  },
  handler: async (ctx, { loanId, kind, externalId, message }) => {
    const existing = await ctx.db.query("activity").withIndex("by_externalId", (q) => q.eq("externalId", externalId)).unique();
    if (existing) return { duplicate: true as const, id: existing._id, found: true as const };
    const id = ctx.db.normalizeId("loans", loanId);
    const loan = id ? await ctx.db.get(id) : null;
    if (!id || !loan) return { duplicate: false as const, id: null, found: false as const };
    const activityId = await ctx.db.insert("activity", { loanId: id, kind, externalId, message: message.slice(0, 200) });
    return { duplicate: false as const, id: activityId, found: true as const };
  },
});

export const recordFailure = internalMutation({
  args: { loanId: v.id("loans"), externalId: v.string(), message: v.string() },
  handler: async (ctx, { loanId, externalId, message }) => {
    const existing = await ctx.db.query("activity").withIndex("by_externalId", (q) => q.eq("externalId", externalId)).unique();
    if (existing) return;
    await ctx.db.insert("activity", { loanId, kind: "failure", externalId, message: message.slice(0, 200) });
  },
});
