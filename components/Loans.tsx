"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, Check, Inbox, Send, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge, Empty, SectionHead, SkeletonRows, StatusBadge, dateRange, relative } from "./Shell";
import { errorText } from "./Tools";

type Loan = NonNullable<ReturnType<typeof useQuery<typeof api.loans.incoming>>>[number];
type Loans = Loan[] | null | undefined;

export function MyRequests() {
  const loans = useQuery(api.loans.myRequests);
  return (
    <div>
      <SectionHead title="My requests" count={loans?.length} hint="Tools you have asked to borrow." />
      <LoanList
        loans={loans}
        side="borrower"
        emptyIcon={<Send className="size-5" />}
        emptyTitle="You have not asked for anything yet"
        emptyBody="Open All tools and request the one you need. The owner gets a notification straight away."
      />
    </div>
  );
}

export function Incoming() {
  const loans = useQuery(api.loans.incoming);
  const waiting = loans?.filter((l) => l.status === "requested").length ?? 0;
  return (
    <div>
      <SectionHead
        title="Incoming requests"
        count={loans?.length}
        hint={waiting > 0 ? `${waiting} waiting on you.` : "Neighbours asking to borrow your tools."}
      />
      <LoanList
        loans={loans}
        side="lender"
        emptyIcon={<Inbox className="size-5" />}
        emptyTitle="No one has asked yet"
        emptyBody="When a neighbour requests one of your tools it lands here, and you approve or decline in one click."
      />
    </div>
  );
}

export function AllLoans() {
  const loans = useQuery(api.loans.all);
  return (
    <LoanList
      loans={loans}
      side="admin"
      emptyIcon={<Inbox className="size-5" />}
      emptyTitle="No loans on the board"
      emptyBody="Every request across the street will appear here."
    />
  );
}

function LoanList({
  loans,
  side,
  emptyIcon,
  emptyTitle,
  emptyBody,
}: {
  loans: Loans;
  side: "borrower" | "lender" | "admin";
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptyBody: string;
}) {
  if (!loans) return <SkeletonRows />;

  if (loans.length === 0)
    return (
      <Empty icon={emptyIcon} title={emptyTitle}>
        {emptyBody}
      </Empty>
    );

  return (
    <ul className="grid gap-3">
      {loans.map((l) => (
        <LoanRow key={l.id} loan={l} side={side} />
      ))}
    </ul>
  );
}

function LoanRow({ loan, side }: { loan: Loan; side: "borrower" | "lender" | "admin" }) {
  const approve = useMutation(api.loans.approve);
  const decline = useMutation(api.loans.decline);
  const markReturned = useMutation(api.loans.markReturned);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const act = async (fn: (a: { loanId: Id<"loans"> }) => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn({ loanId: loan.id });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const who =
    side === "borrower"
      ? `from ${loan.lender?.name ?? "a neighbour"}`
      : side === "lender"
        ? `for ${loan.borrower?.name ?? "a neighbour"}`
        : `${loan.borrower?.name ?? "?"} from ${loan.lender?.name ?? "?"}`;

  const canAct =
    side !== "admin" &&
    ((loan.iAmLender && loan.status === "requested") ||
      (loan.status === "approved" && (loan.iAmLender || loan.iAmBorrower)));

  return (
    <li className={`panel p-5 ${loan.overdue ? "border-bad-line" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold">
            {loan.tool?.name ?? "Removed tool"} <span className="font-normal text-muted">{who}</span>
          </h3>
          <p className="mt-1 text-sm text-muted tabular">{dateRange(loan.startDate, loan.endDate)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {loan.overdue && (
            <Badge tone="bad">
              <AlertTriangle className="size-3.5" strokeWidth={2.5} />
              Overdue
            </Badge>
          )}
          <StatusBadge status={loan.status} />
        </div>
      </div>

      {canAct && (
        <div className="mt-4 flex flex-wrap gap-2">
          {loan.iAmLender && loan.status === "requested" && (
            <>
              <button onClick={() => act(approve)} disabled={busy} className="btn btn-primary btn-sm">
                <Check className="size-4" strokeWidth={2.5} />
                Approve
              </button>
              <button onClick={() => act(decline)} disabled={busy} className="btn btn-ghost btn-sm">
                <X className="size-4" strokeWidth={2.5} />
                Decline
              </button>
            </>
          )}
          {loan.status === "approved" && (loan.iAmLender || loan.iAmBorrower) && (
            <button onClick={() => act(markReturned)} disabled={busy} className="btn btn-ghost btn-sm">
              <Check className="size-4" strokeWidth={2.5} />
              Mark as returned
            </button>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-sm font-medium text-bad">{error}</p>}

      {loan.activity.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5 border-t border-line pt-3 text-xs">
          {loan.activity.map((a) => (
            <li key={a.id} className={a.kind === "failure" ? "font-medium text-bad" : "text-muted"}>
              {a.kind === "failure" && <AlertTriangle className="mr-1 inline size-3" strokeWidth={2.5} />}
              {a.message}, {relative(a.at)}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
