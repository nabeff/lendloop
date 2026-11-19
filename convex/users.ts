import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { currentUser, requireAdmin } from "./lib";

// Called once after sign in. Creates the row on first visit. Admins are the
// addresses listed in ADMIN_EMAILS on the deployment, so the role can never
// be self-assigned from the client.
export const ensure = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    const email = (identity.email ?? "").toLowerCase();
    const admins = (process.env.ADMIN_EMAILS ?? "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
    const role = admins.includes(email) ? "admin" : "user";
    const name = identity.name ?? identity.nickname ?? email.split("@")[0] ?? "Neighbour";
    if (existing) {
      if (existing.role !== role || existing.name !== name || existing.email !== email) {
        await ctx.db.patch(existing._id, { role, name, email });
      }
      return existing._id;
    }
    return ctx.db.insert("users", { clerkId: identity.subject, name, email, role, trustedLender: false });
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    const u = await currentUser(ctx);
    return u ? { id: u._id, name: u.name, email: u.email, role: u.role, trustedLender: u.trustedLender } : null;
  },
});

// Admin screen: everyone, with the trust flag. Emails are included here
// because admins moderate the board; users never see this list.
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, trustedLender: u.trustedLender }));
  },
});

export const setTrustedLender = mutation({
  args: { userId: v.id("users"), trusted: v.boolean() },
  handler: async (ctx, { userId, trusted }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(userId, { trustedLender: trusted });
  },
});
