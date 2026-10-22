import React from "react";
import { createRoot } from "react-dom/client";
import { PaymentDetails } from "../src/components/PaymentDetails";

/** Isolated, dummy-only browser fixture; never reads or saves payment settings. */
export function mountBankCopyFixture() {
  const host = document.createElement("div");
  document.body.replaceChildren(host);
  const root = createRoot(host);
  let submissions = 0;
  const render = (blank = false, amount = 145) => root.render(
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto max-w-xl">
        <h1 className="font-display text-3xl font-bold">Bank transfer</h1>
        <p className="mt-2 text-sm text-muted-foreground">Dummy payment details · review fixture</p>
        <form className="mt-6" onSubmit={(event) => { event.preventDefault(); submissions += 1; }}>
          <PaymentDetails method="payid" amountAud={amount} reference={blank ? "  " : "TL-DEMO-0001"} content={{
            payment_payid_id: blank ? "" : "payments@example.invalid",
            payment_payid_account: blank ? "  " : "Demo Research Supplies",
            payment_payid_bsb: blank ? "" : "012-034",
            payment_payid_account_number: blank ? "" : "000123456",
            payment_payid_instructions: "Use the payment reference shown above.",
          }} />
        </form>
      </div>
    </main>,
  );
  render();
  return { render, submissions: () => submissions };
}