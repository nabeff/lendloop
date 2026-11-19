# LendLoop

Borrow what you need. Lend what you don't.

A neighbourhood tool-lending board. Neighbours list tools, ask to borrow them for a date range, approve or decline requests on their own tools, and mark loans as returned. n8n handles the notifications and the daily overdue reminders.

Stack: Next.js 16 (App Router, TypeScript), Clerk for authentication, Convex for data and backend logic, n8n (self-hosted with Docker) for automation.

## Local setup

### 1. Clerk

1. Create an application at clerk.com, copy the publishable and secret keys.
2. In the Clerk dashboard open JWT Templates, create one from the Convex preset and keep the name `convex`.
3. Note the issuer domain shown on that template (looks like `https://xxx.clerk.accounts.dev`).

### 2. Convex

```bash
npm install
npx convex dev
```

The first run signs you in, creates a deployment, writes `NEXT_PUBLIC_CONVEX_URL` into `.env.local` and generates `convex/_generated`. Keep it running while you develop. Then set the deployment environment:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://xxx.clerk.accounts.dev
npx convex env set ADMIN_EMAILS you@example.com
npx convex env set LENDLOOP_WEBHOOK_SECRET $(openssl rand -hex 32)
npx convex env set N8N_READ_TOKEN $(openssl rand -hex 32)
npx convex env set N8N_LOAN_WEBHOOK_URL http://localhost:5678/webhook/lendloop-loan-event
```

Accounts whose email is in `ADMIN_EMAILS` get the admin role on their first sign in.

### 3. Next.js

Copy `.env.example` to `.env.local` and fill in the two Clerk keys. `NEXT_PUBLIC_CONVEX_URL` was written by `npx convex dev`.

```bash
npm run dev
```

Open http://localhost:3000.

### 4. n8n

Copy `.env.example` to `.env` next to `docker-compose.yml` and fill in the n8n block. `LENDLOOP_WEBHOOK_SECRET` and `N8N_READ_TOKEN` must be the same values you gave Convex. `CONVEX_SITE_URL` is your deployment's `.convex.site` URL (shown by `npx convex dev`, it is the `.convex.cloud` URL with `site` instead of `cloud`).

```bash
docker compose up -d
```

Open http://localhost:5678, create the owner account, then import the three files in `n8n/` (Workflows, Import from file):

1. `error-workflow.json`, activate it, then open Settings on each of the other two workflows after import and pick it as the Error workflow.
2. `loan-event-notification.json`, activate it. Its webhook path is `/webhook/lendloop-loan-event`, matching `N8N_LOAN_WEBHOOK_URL`.
3. `overdue-reminders.json`, activate it. It runs every day at 09:00 in the container timezone.

When Convex runs in the cloud and n8n runs on your laptop, Convex cannot reach `localhost`. Expose n8n with a tunnel (for example `npx localtunnel --port 5678`) and point `N8N_LOAN_WEBHOOK_URL` and `N8N_PUBLIC_URL` at it. n8n Cloud works too: import the same files, set the three values as environment variables in the workflow settings or replace `$env.X` with credentials.

## Environment variables

| Where | Name | Purpose |
| --- | --- | --- |
| Next.js | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk session |
| Next.js | `NEXT_PUBLIC_CONVEX_URL` | Convex client |
| Convex | `CLERK_JWT_ISSUER_DOMAIN` | Validates Clerk JWTs |
| Convex | `ADMIN_EMAILS` | Who is admin, comma separated |
| Convex | `LENDLOOP_WEBHOOK_SECRET` | HMAC secret shared with n8n, both directions |
| Convex | `N8N_READ_TOKEN` | Bearer token n8n uses to read the overdue feed |
| Convex | `N8N_LOAN_WEBHOOK_URL` | Where loan events are posted |
| n8n | `LENDLOOP_WEBHOOK_SECRET`, `N8N_READ_TOKEN`, `CONVEX_SITE_URL`, `N8N_ENCRYPTION_KEY` | Same secrets, plus n8n's own key |

No secret is in the repository. The exported workflow JSON reads them through `$env`.

## Architecture

```
Browser ──Clerk session──> Next.js (App Router)
   │                            │
   │  Convex JWT ("convex")     │ proxy.ts: /app needs a session
   ▼                            ▼
Convex functions (queries, mutations)  <── all role checks live here
   │ scheduler.runAfter(0)
   ▼
Convex action: notify ──signed POST──> n8n webhook "loan event"
                                           │ verify HMAC, notify, sign
                                           ▼
Convex HTTP: POST /automation/ack  <──signed POST── n8n
Convex HTTP: GET  /automation/overdue ──bearer──> n8n daily schedule
Convex HTTP: POST /automation/reminder-sent <──signed POST── n8n
```

Data model (`convex/schema.ts`): `users` (role, trust flag, Clerk id), `tools`, `loans` (requested, approved, declined, returned, with a date range), `activity` (what the automation did per loan, keyed by an external id).

Availability is derived: a tool is on loan while an approved loan exists for it. No flag can drift.

### Access control

Every rule is enforced in Convex functions, the UI only hides buttons.

- Public query `tools.listPublic` returns name and category of available tools. No owner, no description, no condition.
- `requireUser` resolves the Clerk identity to a `users` row. `requireAdmin` checks the stored role. The role is set server side from `ADMIN_EMAILS`, never from the client.
- Tools: create for any signed-in user, edit for the owner only, remove for the owner or an admin. Removing a tool declines its open requests.
- Loans: request on someone else's tool only, with validated dates and no double booking. Approve and decline for the lender only. Mark returned for either party. Admins read the whole ledger but do not act on other people's loans.
- Admin: `users.list` and `users.setTrustedLender` are admin only.

### Automation

Two workflows, both in `n8n/`:

1. Loan event notification. Every status change schedules `automation.notify`, a Convex action that signs a minimal payload (recipient, tool name, dates, status, counterpart first name) and posts it to the n8n webhook. The workflow verifies the signature and timestamp, sends the notification (a logged mock by default, swap the Code node for Email, Slack or Discord), then posts a signed acknowledgement back. Convex records it under the event id, so a retried run is stored once.
2. Overdue reminders. A daily schedule fetches `/automation/overdue` with the bearer token, sends one reminder per overdue loan, and records it with `reminderId = loanId:day`, so one reminder per loan per day whatever the retries.

Reliability: HTTP Request nodes retry three times with a three second wait. The Convex action retries three times with backoff and, if n8n stays unreachable, writes a `failure` row to the loan's activity so the app shows "Notification not delivered" instead of failing silently. The error workflow receives every failed execution.

Each loan shows its recent automation activity in the app ("Reminder sent, 2 days ago").

## Security and data minimisation

- Signed in both directions. Convex signs outgoing events and verifies incoming write-backs with HMAC-SHA256 over `${timestamp}.${body}` and a five minute replay window, compared in constant time. The overdue feed is read only and bearer protected.
- Minimal payloads. The notification receives only the recipient's name and email, the tool name, the dates and the counterpart's first name. The overdue feed includes the borrower only. Public pages never carry owner details or emails.
- Idempotent write-backs. `activity.externalId` is the dedupe key for notifications (`eventId`) and reminders (`loanId:day`).
- Secrets live in Convex environment variables, the n8n container environment and `.env.local`. Nothing is committed, and the exported workflows reference `$env` only.
- Authorisation in the data layer. Convex functions re-derive the caller from the verified JWT and check ownership on the stored row, so a tampered client cannot act on another person's tool or loan.
- Input is validated server side (categories, conditions, lengths, date order, past dates, double booking).

## What I would change for production

- Replace the logged mock with real channels (Resend or SES for email, Slack) and keep the signing and acknowledgement path as is.
- Move the overdue poll to a Convex cron that pushes to n8n, so n8n never needs a read token, and add a dead letter table for events that failed three times with an admin view to replay them.
- Rate limit the public query and the request mutation per user, and add Convex `rateLimiter` on the HTTP endpoints.
- Rotate the shared secret with a key id in the signature header so both sides can roll keys without downtime.
- Add an audit log table written from every mutation (who, what, when) and an admin export, plus Sentry on the Next.js app and Convex function logs shipped to a log drain.
- Tests: Convex function tests with `convex-test` for every access rule, and a Playwright flow for list, request, approve, return.
- A Clerk webhook to delete a user's rows when the account is deleted, and a short retention policy on `activity`.
