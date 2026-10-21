import { describe, expect, test } from "bun:test";
import { toResearchEntry } from "../src/lib/research";
import { researchDetailModel } from "../src/lib/research-detail";
import { publishedReferenceRows, referenceFieldValue, setReferenceField } from "../src/lib/research-reference-fields";

const science = [{ heading: "Reported mechanism", body: "Exact **qualified** saved science.\nUnchanged." }];
const row = (content = science, published = true) => toResearchEntry({ id: "fictional", slug: "fictional", published, content });
describe("Optional per-entry persisted research reference fields", () => {
  test("all three start empty with no visible section", () => {
    for (const label of ["Dosing", "Timing", "Cycle"] as const) expect(referenceFieldValue(science, label)).toBe("");
    expect(publishedReferenceRows(row())).toEqual([]);
  });
  for (const label of ["Dosing", "Timing", "Cycle"] as const) test(`${label} save/read round trip and clear`, () => {
    const updated = setReferenceField(science, label, "Fictional editor test text — not a regimen");
    const saved = row(JSON.parse(JSON.stringify(updated)));
    expect(publishedReferenceRows(saved)).toEqual([{ label, value: "Fictional editor test text — not a regimen" }]);
    expect(referenceFieldValue(saved.content, label)).toBe("Fictional editor test text — not a regimen");
    expect(publishedReferenceRows(row(setReferenceField(saved.content, label, " \n\t ")))).toEqual([]);
    expect(saved.content[0]).toEqual(science[0]);
  });
  test("whitespace saved fields never appear", () => {
    expect(publishedReferenceRows(row([...science, { heading: "Dosing", body: " \n " }, { heading: "Timing", body: "\t" }, { heading: "Cycle", body: " " }]))).toEqual([]);
  });
  test("only populated rows show in native order, Cycle never aliases Timeline", () => {
    const content = [...science, { heading: "Timeline", body: "Legacy science remains untouched" }, { heading: "Cycle", body: "Fictional cycle field" }, { heading: "Timing", body: "" }];
    expect(publishedReferenceRows(row(content))).toEqual([{ label: "Cycle", value: "Fictional cycle field" }]);
    expect(publishedReferenceRows(row(content.slice(0, 2)))).toEqual([]);
  });
  test("draft and absent entries fail closed", () => {
    expect(publishedReferenceRows(row(setReferenceField(science, "Timing", "Private fixture"), false))).toEqual([]);
    expect(publishedReferenceRows(undefined)).toEqual([]);
  });
  test("unsaved changes and other entry values cannot inherit into saved entry", () => {
    const saved = row(); const before = JSON.stringify(saved);
    const draft = setReferenceField(saved.content, "Dosing", "Unsaved fixture");
    expect(referenceFieldValue(draft, "Dosing")).toBe("Unsaved fixture");
    expect(publishedReferenceRows(saved)).toEqual([]);
    expect(JSON.stringify(saved)).toBe(before);
    expect(publishedReferenceRows(row())).toEqual([]);
  });
  test("clearing every populated field hides section and preserves science counts", () => {
    let content = science;
    for (const label of ["Dosing", "Timing", "Cycle"] as const) content = setReferenceField(content, label, "Fictional fixture");
    expect(researchDetailModel(row(content)).counts.notes).toBe(1);
    expect(publishedReferenceRows(row(content))).toHaveLength(3);
    for (const label of ["Dosing", "Timing", "Cycle"] as const) content = setReferenceField(content, label, "");
    expect(content).toEqual(science);
    expect(researchDetailModel(row(content)).protocol).toEqual([]);
  });
});