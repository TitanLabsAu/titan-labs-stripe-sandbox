/**
 * Pure editing helpers for the markup-assisted text editor.
 * The token and bullet patterns are the SAME ones the storefront RichText renderer uses,
 * so whatever the toolbar writes is exactly what the website can show.
 */
export const RICH_TOKEN = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*)/g;
export const RICH_BULLET = /^\s*[-•]\s+/;

export type Marker = "**" | "*" | "__";
export type Edit = { value: string; start: number; end: number; error?: string };
type Tok = { start: number; end: number; marker: Marker };

export function markerOf(part: string): Marker | null {
  if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return "**";
  if (part.startsWith("__") && part.endsWith("__") && part.length > 4) return "__";
  if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return "*";
  return null;
}

type Line = { start: number; end: number; text: string };
function lines(v: string): Line[] {
  const out: Line[] = [];
  let pos = 0;
  for (const text of v.split("\n")) {
    out.push({ start: pos, end: pos + text.length, text });
    pos += text.length + 1;
  }
  return out;
}

/** Formatting spans exactly as the renderer splits them (per line). */
export function tokens(v: string): Tok[] {
  const out: Tok[] = [];
  for (const l of lines(v)) {
    for (const m of l.text.matchAll(new RegExp(RICH_TOKEN.source, "g"))) {
      const marker = markerOf(m[0]);
      if (marker) out.push({ start: l.start + m.index!, end: l.start + m.index! + m[0].length, marker });
    }
  }
  return out;
}

const inner = (v: string, t: Tok) => v.slice(t.start + t.marker.length, t.end - t.marker.length);

/** Which style the selection/caret currently sits inside, for toolbar pressed states. */
export function activeMarker(v: string, s: number, e: number): Marker | null {
  const t = tokens(v).find((t) => (s === e ? s > t.start && s < t.end : s >= t.start && e <= t.end));
  return t?.marker ?? null;
}

function badInner(text: string, m: Marker) {
  return m === "__" ? text.includes("_") : text.includes("*");
}

/** Bold / italic / underline on-off for the selection. The website shows one style per phrase, so applying a style replaces another. */
export function toggleInline(v: string, s0: number, e0: number, m: Marker): Edit {
  let s = Math.min(s0, e0), e = Math.max(s0, e0);
  const toks = tokens(v);
  if (s === e) {
    const t = toks.find((t) => s > t.start && s < t.end);
    if (!t) {
      const word = "text";
      return { value: `${v.slice(0, s)}${m}${word}${m}${v.slice(s)}`, start: s + m.length, end: s + m.length + word.length };
    }
    s = t.start + t.marker.length;
    e = t.end - t.marker.length;
  }
  type Seg = { a: number; b: number; toks: Tok[] };
  const segs: Seg[] = [];
  for (const l of lines(v)) {
    let a = Math.max(s, l.start), b = Math.min(e, l.end);
    if (a >= b && !(a === b && s === e)) continue;
    const prefix = l.text.match(RICH_BULLET)?.[0].length ?? 0;
    a = Math.max(a, l.start + prefix);
    while (a < b && /\s/.test(v[a]!)) a++;
    while (b > a && /\s/.test(v[b - 1]!)) b--;
    if (a >= b) continue;
    segs.push({ a, b, toks: toks.filter((t) => t.start < b && t.end > a) });
  }
  if (!segs.length) return { value: v, start: s0, end: e0 };
  const covered = (g: Seg) => g.toks.length === 1 && g.toks[0]!.marker === m && g.toks[0]!.start <= g.a && g.toks[0]!.end >= g.b;
  const remove = segs.every(covered);
  const edits: { from: number; to: number; text: string; selFrom: number; selTo: number }[] = [];
  for (const g of segs) {
    if (remove) {
      const t = g.toks[0]!;
      const text = inner(v, t);
      edits.push({ from: t.start, to: t.end, text, selFrom: 0, selTo: text.length });
      continue;
    }
    const from = Math.min(g.a, ...g.toks.map((t) => t.start));
    const to = Math.max(g.b, ...g.toks.map((t) => t.end));
    let text = "";
    let pos = from;
    for (const t of g.toks) {
      text += v.slice(pos, t.start) + inner(v, t);
      pos = t.end;
    }
    text += v.slice(pos, to);
    if (badInner(text, m))
      return { value: v, start: s0, end: e0, error: m === "__" ? "Underline can't include _ characters — the website would misread them." : "Bold and italic can't include * characters — the website would misread them." };
    edits.push({ from, to, text: `${m}${text}${m}`, selFrom: m.length, selTo: m.length + text.length });
  }
  return apply(v, edits);
}

function apply(v: string, edits: { from: number; to: number; text: string; selFrom: number; selTo: number }[]): Edit {
  let out = "", pos = 0, start = 0, end = 0;
  edits.forEach((ed, i) => {
    out += v.slice(pos, ed.from);
    if (i === 0) start = out.length + ed.selFrom;
    if (i === edits.length - 1) end = out.length + ed.selTo;
    out += ed.text;
    pos = ed.to;
  });
  return { value: out + v.slice(pos), start, end };
}

/** Remove bold/italic/underline from every phrase the selection touches (or the phrase under the caret). */
export function clearFormatting(v: string, s0: number, e0: number): Edit {
  const s = Math.min(s0, e0), e = Math.max(s0, e0);
  const hit = tokens(v).filter((t) => (s === e ? s > t.start && s < t.end : t.start < e && t.end > s));
  if (!hit.length) return { value: v, start: s0, end: e0 };
  const res = apply(v, hit.map((t) => { const text = inner(v, t); return { from: t.start, to: t.end, text, selFrom: 0, selTo: text.length }; }));
  if (s === e) return res;
  // Keep any unformatted text at the edges inside the selection.
  const lead = Math.max(0, hit[0]!.start - s);
  const lastHit = hit[hit.length - 1]!;
  const tail = Math.max(0, e - lastHit.end);
  return { ...res, start: res.start - lead, end: res.end + tail };
}

/** Bullet list on/off for the lines the selection touches. Blank lines are left alone. */
export function toggleBullets(v: string, s0: number, e0: number): Edit {
  const s = Math.min(s0, e0);
  let e = Math.max(s0, e0);
  const all = lines(v);
  if (e > s && all.some((l) => l.start === e)) e -= 1; // selection ending at the start of a line excludes it
  const touched = all.filter((l) => l.end >= s && l.start <= e);
  const filled = touched.filter((l) => l.text.trim());
  if (!filled.length) return { value: v, start: s0, end: e0 };
  const removing = filled.every((l) => RICH_BULLET.test(l.text));
  const edits = touched.map((l) => {
    const text = !l.text.trim() ? l.text : removing ? l.text.replace(RICH_BULLET, "") : RICH_BULLET.test(l.text) ? l.text : `- ${l.text.trimStart()}`;
    return { from: l.start, to: l.end, text, selFrom: 0, selTo: text.length };
  });
  return apply(v, edits);
}

export function countText(v: string) {
  const t = v.trim();
  return { words: t ? t.split(/\s+/).length : 0, chars: v.length };
}

/** Plain text only from a paste (Word, web pages): no HTML, invisible characters or stray control codes. */
export function sanitizePaste(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[\u00a0\u2007\u202f]/g, " ")
    .replace(/[\u200b-\u200d\u2060\ufeff\u00ad]/g, "")
    .replace(/\t/g, " ")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "")
    .replace(/^[ ]*[◦▪·●][ ]+/gm, "- ");
}

/** Insert pasted text in place of the selection, shortened to the limit when needed. */
export function insertText(v: string, s: number, e: number, raw: string, max?: number): Edit & { truncated: boolean } {
  let text = sanitizePaste(raw);
  let truncated = false;
  if (max != null) {
    const room = Math.max(0, max - (v.length - (e - s)));
    if (text.length > room) { text = text.slice(0, room); truncated = true; }
  }
  const at = s + text.length;
  return { value: v.slice(0, s) + text + v.slice(e), start: at, end: at, truncated };
}

/* ---------- Bounded undo/redo history ---------- */
export type Snap = { value: string; start: number; end: number };
export type History = { past: Snap[]; present: Snap; future: Snap[]; lastTyped: number };
export const HISTORY_LIMIT = 100;

export const historyReset = (value: string): History => ({ past: [], present: { value, start: value.length, end: value.length }, future: [], lastTyped: 0 });

/** Record a change. Typing within `mergeMs` of the previous keystroke merges into one undo step. */
export function historyPush(h: History, next: Snap, opts: { typing?: boolean; now?: number; mergeMs?: number } = {}): History {
  if (next.value === h.present.value) return { ...h, present: next };
  const now = opts.now ?? Date.now();
  const merge = opts.typing && h.lastTyped && now - h.lastTyped < (opts.mergeMs ?? 800);
  const past = merge ? h.past : [...h.past, h.present].slice(-HISTORY_LIMIT);
  return { past, present: next, future: [], lastTyped: opts.typing ? now : 0 };
}
export function historyUndo(h: History): History {
  const prev = h.past[h.past.length - 1];
  return prev ? { past: h.past.slice(0, -1), present: prev, future: [h.present, ...h.future], lastTyped: 0 } : h;
}
export function historyRedo(h: History): History {
  const [next, ...rest] = h.future;
  return next ? { past: [...h.past, h.present], present: next, future: rest, lastTyped: 0 } : h;
}
