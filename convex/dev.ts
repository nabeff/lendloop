import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

// Demo helper, internal only, never reachable from the browser. Moves a loan's
// return date into the past so the overdue reminder run has something to do:
//   npx convex run dev:backdateLoan '{"loanId":"<id>","endDate":"2026-01-01"}'
export const backdateLoan = internalMutation({
  args: { loanId: v.id("loans"), endDate: v.string() },
  handler: async (ctx, { loanId, endDate }) => {
    await ctx.db.patch(loanId, { endDate });
  },
});
