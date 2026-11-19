import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { CATEGORIES, CONDITIONS } from "./schema";
import { activeLoan, assertOwnerOrAdmin, currentUser, publicUser, requireTool, requireUser } from "./lib";
import { setStatus } from "./loans";

const clean = (s: string, max: number) => s.trim().slice(0, max);

function validate(fields: { name: string; category: string; condition: string; description: string }) {
  const name = clean(fields.name, 60);
  const description = clean(fields.description, 400);
  if (name.length < 2) throw new ConvexError("Give the tool a name.");
  if (!(CATEGORIES as readonly string[]).includes(fields.category)) throw new ConvexError("Pick a category from the list.");
  if (!(CONDITIONS as readonly string[]).includes(fields.condition)) throw new ConvexError("Pick a condition from the list.");
  return { name, category: fields.category, condition: fields.condition, description };
}

// The public board: name and category of tools that are free right now.
// No owner, no condition, no description. Anyone can call this.
export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const tools = await ctx.db.query("tools").collect();
    const out: { id: string; name: string; category: string }[] = [];
    for (const t of tools) {
      if (await activeLoan(ctx, t._id)) continue;
      out.push({ id: t._id, name: t.name, category: t.category });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  },
});

// Signed-in board: everything, with availability and the owner's first name.
export const listAll = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, { category }) => {
    const me = await currentUser(ctx);
    if (!me) return null;
    const tools = category
      ? await ctx.db.query("tools").withIndex("by_category", (q) => q.eq("category", category)).collect()
      : await ctx.db.query("tools").collect();
    const out = [];
    for (const t of tools) {
      const owner = await ctx.db.get(t.ownerId);
      const loan = await activeLoan(ctx, t._id);
      out.push({
        id: t._id,
        name: t.name,
        category: t.category,
        condition: t.condition,
        description: t.description,
        owner: publicUser(owner),
        mine: t.ownerId === me._id,
        available: !loan,
        backOn: loan?.endDate ?? null,
      });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await currentUser(ctx);
    if (!me) return null;
    const tools = await ctx.db.query("tools").withIndex("by_owner", (q) => q.eq("ownerId", me._id)).collect();
    const out = [];
    for (const t of tools) {
      const loan = await activeLoan(ctx, t._id);
      out.push({ id: t._id, name: t.name, category: t.category, condition: t.condition, description: t.description, available: !loan });
    }
    return out;
  },
});

export const create = mutation({
  args: { name: v.string(), category: v.string(), condition: v.string(), description: v.string() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    return ctx.db.insert("tools", { ownerId: me._id, ...validate(args) });
  },
});

export const update = mutation({
  args: { toolId: v.id("tools"), name: v.string(), category: v.string(), condition: v.string(), description: v.string() },
  handler: async (ctx, { toolId, ...fields }) => {
    const me = await requireUser(ctx);
    const tool = await requireTool(ctx, toolId);
    // Editing is for the owner only. Admins remove, they do not rewrite.
    if (tool.ownerId !== me._id) throw new ConvexError("Not yours to change.");
    await ctx.db.patch(toolId, validate(fields));
  },
});

// Owner deletes their own listing, admin can remove any. Open requests on it
// are declined so borrowers are not left waiting on a tool that is gone.
export const remove = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, { toolId }) => {
    const me = await requireUser(ctx);
    const tool = await requireTool(ctx, toolId);
    assertOwnerOrAdmin(me, tool.ownerId);
    const loans = await ctx.db.query("loans").withIndex("by_tool", (q) => q.eq("toolId", toolId)).collect();
    // Through setStatus, not a bare patch, so the borrower is actually told the
    // tool is gone instead of watching their request turn to declined in silence.
    for (const l of loans) {
      if (l.status === "requested") await setStatus(ctx, l, "declined", me._id);
    }
    await ctx.db.delete(toolId);
  },
});
