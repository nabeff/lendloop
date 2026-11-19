import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { activeLoan, currentUser, isIsoDay, publicUser, requireLoan, requireTool, requireUser, today } from "./lib";

// Every status change ends here: write, then hand the event to n8n through
// the scheduler so the mutation itself never does network work.
async function setStatus(ctx: MutationCtx, loan: Doc<"loans">, status: Doc<"loans">["status"]) {
  const updatedAt = Date.now();
  await ctx.db.patch(loan._id, { status, updatedAt });
  await ctx.scheduler.runAfter(0, internal.automation.notify, { loanId: loan._id, status, updatedAt });
}

async function shape(ctx: QueryCtx, loan: Doc<"loans">, meId: Id<"users">) {
  const [tool, lender, borrower, activity] = await Promise.all([
    ctx.db.get(loan.toolId),
    ctx.db.get(loan.lenderId),
    ctx.db.get(loan.borrowerId),
    ctx.db.query("activity").withIndex("by_loan", (q) => q.eq("loanId", loan._id)).order("desc").take(5),
  ]);
  return {
    id: loan._id,
    tool: tool ? { id: tool._id, name: tool.name, category: tool.category } : null,
    lender: publicUser(lender),
    borrower: publicUser(borrower),
    startDate: loan.startDate,
    endDate: loan.endDate,
    status: loan.status,
    updatedAt: loan.updatedAt,
    overdue: loan.status === "approved" && loan.endDate < today(),
    iAmLender: loan.lenderId === meId,
    iAmBorrower: loan.borrowerId === meId,
    activity: activity.map((a) => ({ id: a._id, kind: a.kind, message: a.message, at: a._creationTime })),
  };
}

export const request = mutation({
  args: { toolId: v.id("tools"), startDate: v.string(), endDate: v.string() },
  handler: async (ctx, { toolId, startDate, endDate }) => {
    const me = await requireUser(ctx);
    const tool = await requireTool(ctx, toolId);
    if (tool.ownerId === me._id) throw new ConvexError("That one is already yours.");
    if (!isIsoDay(startDate) || !isIsoDay(endDate)) throw new ConvexError("Pick both dates.");
    if (startDate < today()) throw new ConvexError("The start date is in the past.");
    if (endDate < startDate) throw new ConvexError("The return date is before the start date.");
    if (await activeLoan(ctx, toolId)) throw new ConvexError("That tool is out on loan right now.");
    const open = await ctx.db.query("loans").withIndex("by_borrower", (q) => q.eq("borrowerId", me._id)).collect();
    if (open.some((l) => l.toolId === toolId && l.status === "requested")) throw new ConvexError("You already asked for this one.");
    const updatedAt = Date.now();
    const loanId = await ctx.db.insert("loans", { toolId, lenderId: tool.ownerId, borrowerId: me._id, startDate, endDate, status: "requested", updatedAt });
    await ctx.scheduler.runAfter(0, internal.automation.notify, { loanId, status: "requested", updatedAt });
    return loanId;
  },
});

// Only the lender decides. The check is on the loan row, not on anything
// the client sent.
export const approve = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => {
    const me = await requireUser(ctx);
    const loan = await requireLoan(ctx, loanId);
    if (loan.lenderId !== me._id) throw new ConvexError("Only the owner can approve.");
    if (loan.status !== "requested") throw new ConvexError("This request was already handled.");
    if (await activeLoan(ctx, loan.toolId)) throw new ConvexError("The tool is already out on another loan.");
    await setStatus(ctx, loan, "approved");
  },
});

export const decline = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => {
    const me = await requireUser(ctx);
    const loan = await requireLoan(ctx, loanId);
    if (loan.lenderId !== me._id) throw new ConvexError("Only the owner can decline.");
    if (loan.status !== "requested") throw new ConvexError("This request was already handled.");
    await setStatus(ctx, loan, "declined");
  },
});

// Either side of the loan can close it.
export const markReturned = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => {
    const me = await requireUser(ctx);
    const loan = await requireLoan(ctx, loanId);
    if (loan.lenderId !== me._id && loan.borrowerId !== me._id) throw new ConvexError("Not your loan.");
    if (loan.status !== "approved") throw new ConvexError("Only an approved loan can be returned.");
    await setStatus(ctx, loan, "returned");
  },
});

export const myRequests = query({
  args: {},
  handler: async (ctx) => {
    const me = await currentUser(ctx);
    if (!me) return null;
    const loans = await ctx.db.query("loans").withIndex("by_borrower", (q) => q.eq("borrowerId", me._id)).order("desc").collect();
    return Promise.all(loans.map((l) => shape(ctx, l, me._id)));
  },
});

export const incoming = query({
  args: {},
  handler: async (ctx) => {
    const me = await currentUser(ctx);
    if (!me) return null;
    const loans = await ctx.db.query("loans").withIndex("by_lender", (q) => q.eq("lenderId", me._id)).order("desc").collect();
    return Promise.all(loans.map((l) => shape(ctx, l, me._id)));
  },
});

// Admin only: the whole ledger.
export const all = query({
  args: {},
  handler: async (ctx) => {
    const me = await currentUser(ctx);
    if (!me || me.role !== "admin") return null;
    const loans = await ctx.db.query("loans").order("desc").collect();
    return Promise.all(loans.map((l) => shape(ctx, l, me._id)));
  },
});
