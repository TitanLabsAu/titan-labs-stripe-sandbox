import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { RichText } from "../src/components/RichText";
import { activeMarker, clearFormatting, countText, historyPush, historyRedo, historyReset, historyUndo, insertText, sanitizePaste, toggleBullets, toggleInline } from "../src/lib/markup-edit";

const sel = (v: string, s: string) => [v.indexOf(s), v.indexOf(s) + s.length] as const;
describe("inline formatting toggles", () => {
  test("bold on then off with exact selection boundaries", () => {
    const v = "Pure research peptides";
    const on = toggleInline(v, ...sel(v, "research"), "**");
    expect(on.value).toBe("Pure **research** peptides");
    expect(on.value.slice(on.start, on.end)).toBe("research");
    const off = toggleInline(on.value, on.start, on.end, "**");
    expect(off.value).toBe(v);
    expect(off.value.slice(off.start, off.end)).toBe("research");
  });
  test("selection including surrounding spaces wraps only the word; repeated toggles are stable", () => {
    let e = toggleInline("a  word  b", 1, 8, "*");
    expect(e.value).toBe("a  *word*  b");
    for (let i = 0; i < 3; i++) e = toggleInline(e.value, e.start, e.end, "*");
    expect(e.value).toBe("a  word  b");
  });
  test("selecting the markers themselves toggles off; caret inside a phrase toggles off", () => {
    expect(toggleInline("x **bold** y", 2, 10, "**").value).toBe("x bold y");
    expect(toggleInline("x __u__ y", 5, 5, "__").value).toBe("x u y");
  });
  test("applying a different style replaces (renderer shows one style per phrase)", () => {
    expect(toggleInline("**hi** there", 2, 4, "__").value).toBe("__hi__ there");
  });
  test("partial overlap merges into one span; caret with no selection inserts placeholder", () => {
    expect(toggleInline("one **two** three", 0, 7, "**").value).toBe("**one two** three");
    const ins = toggleInline("ab", 1, 1, "**");
    expect(ins.value).toBe("a**text**b");
    expect(ins.value.slice(ins.start, ins.end)).toBe("text");
  });
  test("multi-line selection formats each line and skips bullet prefixes", () => {
    const v = "- first\n\n- second";
    expect(toggleInline(v, 0, v.length, "**").value).toBe("- **first**\n\n- **second**");
  });
  test("refuses text the renderer would misread", () => {
    const r = toggleInline("snake_case", 0, 10, "__");
    expect(r.error).toBeTruthy();
    expect(r.value).toBe("snake_case");
  });
  test("every toggle result renders as real formatting via the website renderer", () => {
    const html = renderToStaticMarkup(createElement(RichText, { text: toggleInline("Hello world", 6, 11, "**").value, inline: true }));
    expect(html).toContain("<strong>world</strong>");
  });
  test("active marker reflects caret/selection", () => {
    expect(activeMarker("a *b* c", 3, 3)).toBe("*");
    expect(activeMarker("a *b* c", 0, 0)).toBeNull();
  });
});

describe("clear formatting and bullets", () => {
  test("clears all styles in selection only", () => {
    const v = "**a** *b* __c__ **d**";
    expect(clearFormatting(v, 0, 15).value).toBe("a b c **d**");
    expect(clearFormatting("plain", 0, 5).value).toBe("plain");
  });
  test("bullets toggle on selected lines only, blank lines untouched", () => {
    const v = "Intro line here.\nalpha\n\nbeta\nOutro.";
    const [s] = sel(v, "alpha"); const e = v.indexOf("beta") + 2;
    const on = toggleBullets(v, s, e);
    expect(on.value).toBe("Intro line here.\n- alpha\n\n- beta\nOutro.");
    expect(toggleBullets(on.value, on.start, on.end).value).toBe(v);
    const html = renderToStaticMarkup(createElement(RichText, { text: on.value }));
    expect(html).toContain("<li");
  });
  test("selection ending at start of next line excludes that line", () => {
    expect(toggleBullets("a\nb", 0, 2).value).toBe("- a\nb");
  });
});

describe("history", () => {
  test("bounded undo/redo with typing merge and redo cleared by new edit", () => {
    let h = historyReset("a");
    h = historyPush(h, { value: "ab", start: 2, end: 2 }, { typing: true, now: 1000 });
    h = historyPush(h, { value: "abc", start: 3, end: 3 }, { typing: true, now: 1200 });
    h = historyPush(h, { value: "**abc**", start: 2, end: 5 });
    h = historyUndo(h); expect(h.present.value).toBe("abc");
    h = historyUndo(h); expect(h.present.value).toBe("a");
    h = historyRedo(h); expect(h.present.value).toBe("abc");
    h = historyPush(h, { value: "x", start: 1, end: 1 });
    expect(historyRedo(h)).toBe(h);
    for (let i = 0; i < 250; i++) h = historyPush(h, { value: `v${i}`, start: 0, end: 0 });
    expect(h.past.length).toBe(100);
  });
  test("external reset discards stale undo", () => {
    let h = historyPush(historyReset("old"), { value: "draft", start: 0, end: 0 });
    h = historyReset("server saved");
    expect(historyUndo(h).present.value).toBe("server saved");
  });
});

describe("paste and limits", () => {
  test("malicious/Word paste becomes inert plain text", () => {
    const raw = "<script>alert(1)</script>\r\n\u00a0Tab\there\u200b\u0007\n● item";
    const clean = sanitizePaste(raw);
    expect(clean).toBe("<script>alert(1)</script>\n Tab here\n- item");
    const html = renderToStaticMarkup(createElement(RichText, { text: clean }));
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
  test("paste is truncated to the character limit", () => {
    const r = insertText("12345", 5, 5, "abcdef", 8);
    expect(r.value).toBe("12345abc");
    expect(r.truncated).toBe(true);
  });
  test("counts", () => {
    expect(countText("  two words\n")).toEqual({ words: 2, chars: 12 });
    expect(countText("")).toEqual({ words: 0, chars: 0 });
  });
});
