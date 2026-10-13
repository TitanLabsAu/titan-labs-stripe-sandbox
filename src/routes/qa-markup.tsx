import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MarkupTextEditor } from "@/components/MarkupTextEditor";
export const Route = createFileRoute("/qa-markup")({ component: Q });
function Q() {
  const [v, setV] = useState("QA DEMO — Terms body (not saved)\nOrders are processed on **business days** only.\nAll products are supplied *for research use* and __not for human consumption__.\nWhat you receive\n- Sealed vial\n- Batch label\n- Certificate where available");
  const [p, setP] = useState("QA DEMO plain field: free shipping on orders over $200.");
  return <div className="mx-auto max-w-4xl space-y-8 p-4"><MarkupTextEditor id="qa1" label="Demo legal body" mode="block" rows={8} value={v} onChange={setV} /><MarkupTextEditor id="qa2" label="Demo plain field" mode="plain" max={120} value={p} onChange={setP} /></div>;
}
