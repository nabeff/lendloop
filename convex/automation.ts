"use node";
import { v } from "convex/values";
import { createHmac } from "node:crypto";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { loanStatus } from "./schema";

// Shared secret in both directions. Convex signs what it sends to n8n and
// verifies what n8n sends back. Signature = HMAC-SHA256 over
// `${timestamp}.${body}`, hex, in x-lendloop-signature, with the unix
// timestamp in x-lendloop-timestamp. Replays older than five minutes are
// rejected on the receiving side.
export function sign(secret: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Tell n8n a loan was created or changed. Sends only what the notification
// needs: the recipient, the tool name, the dates and the status. No ids of
// other people, no emails of the other party.
export const notify = internalAction({
  args: { loanId: v.id("loans"), status: loanStatus, updatedAt: v.number(), actorId: v.optional(v.id("users")) },
  handler: async (ctx, { loanId, status, updatedAt, actorId }) => {
    const url = process.env.N8N_LOAN_WEBHOOK_URL;
    const secret = process.env.LENDLOOP_WEBHOOK_SECRET;
    const eventId = `${loanId}:${status}:${updatedAt}`;
    if (!url || !secret) {
      console.log(`[automation] n8n not configured, skipped ${eventId}`);
      return;
    }
    const payload = await ctx.runQuery(internal.automationData.loanEvent, { loanId, status, eventId, actorId });
    if (!payload) return;
    const body = JSON.stringify(payload);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const headers = {
      "content-type": "application/json",
      "x-lendloop-timestamp": timestamp,
      "x-lendloop-signature": `sha256=${sign(secret, timestamp, body)}`,
    };

    // Three attempts with backoff. A final failure is written to the loan's
    // activity so it shows in the app instead of vanishing in a log.
    let lastError = "";
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(url, { method: "POST", headers, body });
        if (res.ok) {
          // Accepted, not yet delivered. Check back for the ack.
          await ctx.scheduler.runAfter(ACK_GRACE_MS, internal.automation.confirmDelivery, { loanId, eventId });
          return;
        }
        lastError = `n8n answered ${res.status}`;
      } catch (e) {
        lastError = (e as Error).message;
      }
      if (attempt < 3) await sleep(500 * 2 ** attempt);
    }
    await ctx.runMutation(internal.automationData.recordFailure, { loanId, externalId: `${eventId}:failed`, message: `Notification not delivered: ${lastError}` });
  },
});

// How long n8n gets to acknowledge before we call the notification lost.
const ACK_GRACE_MS = 5 * 60 * 1000;

// The webhook answers 200 as soon as it has checked the signature, BEFORE it
// sends anything, so a 200 is not evidence of delivery. The ack written back
// from the end of the workflow is. This runs once after the grace period: if
// no ack landed, the loan gets a failure row, so a send that died after the
// 200 is visible in the app instead of disappearing.
export const confirmDelivery = internalAction({
  args: { loanId: v.id("loans"), eventId: v.string() },
  handler: async (ctx, { loanId, eventId }) => {
    if (await ctx.runQuery(internal.automationData.ackLanded, { eventId })) return;
    await ctx.runMutation(internal.automationData.recordFailure, {
      loanId,
      externalId: `${eventId}:unconfirmed`,
      message: "Notification accepted by the automation but never confirmed as sent.",
    });
  },
});
