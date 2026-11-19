import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// The two endpoints n8n talks to. Both check a secret before touching data:
// the overdue feed takes a bearer token, the write-backs take the HMAC
// signature described in automation.ts. Secrets come from the deployment
// environment, never from code.

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Reads the raw body once, verifies the signature over it, then parses.
async function verifiedBody(request: Request): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; status: number; error: string }> {
  const secret = process.env.LENDLOOP_WEBHOOK_SECRET;
  if (!secret) return { ok: false, status: 500, error: "LENDLOOP_WEBHOOK_SECRET is not set" };
  const timestamp = request.headers.get("x-lendloop-timestamp") ?? "";
  const given = (request.headers.get("x-lendloop-signature") ?? "").replace(/^sha256=/, "");
  const raw = await request.text();
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return { ok: false, status: 401, error: "stale or missing timestamp" };
  const expected = await hmacHex(secret, `${timestamp}.${raw}`);
  if (!constantTimeEqual(expected, given)) return { ok: false, status: 401, error: "bad signature" };
  try {
    return { ok: true, body: JSON.parse(raw) as Record<string, unknown> };
  } catch {
    return { ok: false, status: 400, error: "body is not JSON" };
  }
}

const http = httpRouter();

http.route({
  path: "/automation/overdue",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const token = process.env.N8N_READ_TOKEN;
    const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token || !given || !constantTimeEqual(token, given)) return json(401, { error: "unauthorized" });
    const loans = await ctx.runQuery(internal.automationData.overdue, {});
    return json(200, { generatedAt: new Date().toISOString(), loans });
  }),
});

// n8n reports a reminder it sent. reminderId is the idempotency key, the
// workflow builds it from the loan id and the day, so one reminder per day.
http.route({
  path: "/automation/reminder-sent",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const v = await verifiedBody(request);
    if (!v.ok) return json(v.status, { error: v.error });
    const { loanId, reminderId, channel } = v.body as { loanId?: string; reminderId?: string; channel?: string };
    if (!loanId || !reminderId) return json(400, { error: "loanId and reminderId are required" });
    const result = await ctx.runMutation(internal.automationData.record, {
      loanId: loanId as Id<"loans">,
      kind: "reminder",
      externalId: reminderId,
      message: `Reminder sent${channel ? ` by ${channel}` : ""}`,
    });
    return json(200, result);
  }),
});

// n8n acknowledges a loan event it notified. eventId came from Convex, so a
// retried workflow run acknowledges the same event and is stored once.
http.route({
  path: "/automation/ack",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const v = await verifiedBody(request);
    if (!v.ok) return json(v.status, { error: v.error });
    const { loanId, eventId, channel, status } = v.body as { loanId?: string; eventId?: string; channel?: string; status?: string };
    if (!loanId || !eventId) return json(400, { error: "loanId and eventId are required" });
    const result = await ctx.runMutation(internal.automationData.record, {
      loanId: loanId as Id<"loans">,
      kind: "notification",
      externalId: eventId,
      message: `${status ?? "update"} notification sent${channel ? ` by ${channel}` : ""}`,
    });
    return json(200, result);
  }),
});

export default http;
