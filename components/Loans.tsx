"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge, STATUS_TONE, relative } from "./Shell";
import { errorText } from "./Tools";

type Loan = NonNullable<ReturnType<typeof useQuery<typeof api.loans.incoming>>>[number];
type Loans = Loan[] | null | undefined;

export function MyRequests() {
  const loans = useQuery(api.loans.myRequests);
  return <LoanList loans={loans} empty="You have not asked to borrow anything yet." side="borrower" />;
}

export function Incoming() {
  const loans = useQuery(api.loans.incoming);
  return <LoanList loans={loans} empty="No one has asked for your tools yet." side="lender" />;
}

export function AllLoans() {
  const loans = useQuery(api.loans.all);
  return <LoanList loans={loans} empty="No loans on the board." side="admin" />;
}

function LoanList({ loans, empty, side }: { loans: Loans; empty: string; side: "borrower" | "lender" | "admin" }) {
  if (!loans) return <p className="text-sm text-muted">Loading</p>;
  if (loans.length === 0) return <div className="card px-6 py-10 text-center text-sm text-muted">{empty}</div>;
  return (
    <ul className="grid gap-3">
      {loans.map((l) => <LoanRow key={l.id} loan={l} side={side} />)}
    </ul>
  );
}

function LoanRow({ loan, side }: { loan: Loan; side: "borrower" | "lender" | "admin" }) {
  const approve = useMutation(api.loans.approve);
  const decline = useMutation(api.loans.decline);
  const markReturned = useMutation(api.loans.markReturned);
  const [error, setError] = useState("");
  const act = async (fn: (a: { loanId: Id<"loans"> }) => Promise<unknown>) => {
    setError("");
    try {
      await fn({ loanId: loan.id });
    } catch (e) {
      setError(errorText(e));
    }
  };
  const who = side === "borrower" ? `from ${loan.lender?.name ?? "a neighbour"}` : side === "lender" ? `for ${loan.borrower?.name ?? "a neighbour"}` : `${loan.borrower?.name ?? "?"} from ${loan.lender?.name ?? "?"}`;

  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{loan.tool?.name ?? "Removed tool"} <span className="font-normal text-muted">{who}</span></div>
          <div className="mt-0.5 text-sm text-muted">{loan.startDate} to {loan.endDate}</div>
        </div>
        <div className="flex items-center gap-2">
          {loan.overdue && <Badge tone="bad">Overdue</Badge>}
          <Badge tone={STATUS_TONE[loan.status]}>{loan.status}</Badge>
        </div>
      </div>

      {side !== "admin" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {loan.iAmLender && loan.status === "requested" && (
            <>
              <button onClick={() => act(approve)} className="btn btn-primary btn-sm">Approve</button>
              <button onClick={() => act(decline)} className="btn btn-ghost btn-sm">Decline</button>
            </>
          )}
          {loan.status === "approved" && (loan.iAmLender || loan.iAmBorrower) && (
            <button onClick={() => act(markReturned)} className="btn btn-ghost btn-sm">Mark as returned</button>
          )}
        </div>
      )}
      {error && <p className="mt-2 text-sm text-bad">{error}</p>}

      {loan.activity.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 border-t border-line pt-3 text-xs text-muted">
          {loan.activity.map((a) => (
            <li key={a.id} className={a.kind === "failure" ? "text-bad" : ""}>{a.message}, {relative(a.at)}</li>
          ))}
        </ul>
      )}
    </li>
  );
}
