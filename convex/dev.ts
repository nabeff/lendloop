import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Demo helper, internal only, never reachable from the browser. Moves a loan's
// return date into the past so the overdue reminder run has something to do:
//   npx convex run dev:backdateLoan '{"loanId":"<id>","endDate":"2026-01-01"}'
export const backdateLoan = internalMutation({
  args: { loanId: v.id("loans"), endDate: v.string() },
  handler: async (ctx, { loanId, endDate }) => {
    await ctx.db.patch(loanId, { endDate });
  },
});

// Demo seed, internal only. Fills the board with a believable street so the
// screens can be judged on a real spread of states rather than one empty row:
//   npx convex run dev:seed
// Running it twice is safe: it skips anything already there.
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const me = await ctx.db.query("users").first();
    if (!me) throw new Error("Sign in once first, so there is an owner to attach demo tools to.");

    const neighbours = [
      { clerkId: "demo_amara", name: "Amara Osei", email: "amara@example.com", trustedLender: true },
      { clerkId: "demo_tomas", name: "Tomas Reyes", email: "tomas@example.com", trustedLender: false },
      { clerkId: "demo_hana", name: "Hana Lindqvist", email: "hana@example.com", trustedLender: true },
    ];
    const ids: Record<string, Id<"users">> = {};
    for (const n of neighbours) {
      const existing = await ctx.db.query("users").withIndex("by_clerkId", (q) => q.eq("clerkId", n.clerkId)).unique();
      ids[n.clerkId] = existing?._id ?? (await ctx.db.insert("users", { ...n, role: "user" }));
    }

    const catalogue = [
      { owner: me._id, name: "Cordless drill", category: "power tools", condition: "good", description: "18V Makita, two batteries, bit set included." },
      { owner: me._id, name: "Extending ladder", category: "other", condition: "worn", description: "Reaches a first-floor gutter. Heavy, bring a car." },
      { owner: ids.demo_amara, name: "Tile cutter", category: "power tools", condition: "good", description: "Wet cutter, good for a small bathroom floor." },
      { owner: ids.demo_amara, name: "Stand mixer", category: "kitchen", condition: "new", description: "5 litre bowl, dough hook and whisk." },
      { owner: ids.demo_tomas, name: "Hedge trimmer", category: "garden", condition: "good", description: "Electric, 20 metre cable on the reel." },
      { owner: ids.demo_tomas, name: "Socket set", category: "hand tools", condition: "good", description: "Metric, 8 to 22mm, in the case." },
      { owner: ids.demo_hana, name: "Four person tent", category: "camping", condition: "good", description: "Two bedrooms, dry since last summer." },
      { owner: ids.demo_hana, name: "Carpet cleaner", category: "cleaning", condition: "needs care", description: "Works, but the handle clip is taped. Bring your own solution." },
    ];

    const toolIds: Record<string, Id<"tools">> = {};
    for (const t of catalogue) {
      const existing = (await ctx.db.query("tools").withIndex("by_owner", (q) => q.eq("ownerId", t.owner)).collect()).find((x) => x.name === t.name);
      toolIds[t.name] = existing?._id ?? (await ctx.db.insert("tools", { ownerId: t.owner, name: t.name, category: t.category, condition: t.condition, description: t.description }));
    }

    const day = (offset: number) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + offset);
      return d.toISOString().slice(0, 10);
    };

    // One of each state, so every badge and every button is on screen.
    const loans = [
      { tool: "Cordless drill", lender: me._id, borrower: ids.demo_tomas, start: day(1), end: day(4), status: "requested" as const },
      { tool: "Extending ladder", lender: me._id, borrower: ids.demo_hana, start: day(-3), end: day(2), status: "approved" as const },
      { tool: "Tile cutter", lender: ids.demo_amara, borrower: me._id, start: day(-9), end: day(-2), status: "approved" as const },
      { tool: "Stand mixer", lender: ids.demo_amara, borrower: me._id, start: day(-20), end: day(-16), status: "returned" as const },
      { tool: "Hedge trimmer", lender: ids.demo_tomas, borrower: me._id, start: day(3), end: day(5), status: "requested" as const },
    ];

    for (const l of loans) {
      const toolId = toolIds[l.tool];
      const existing = (await ctx.db.query("loans").withIndex("by_tool", (q) => q.eq("toolId", toolId)).collect()).find((x) => x.borrowerId === l.borrower);
      if (existing) continue;
      await ctx.db.insert("loans", { toolId, lenderId: l.lender, borrowerId: l.borrower, startDate: l.start, endDate: l.end, status: l.status, updatedAt: Date.now() });
    }

    return { tools: Object.keys(toolIds).length, neighbours: neighbours.length, loans: loans.length };
  },
});
