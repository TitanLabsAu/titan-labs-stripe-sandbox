import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { Bold, Columns2, Eraser, Eye, Italic, List, Maximize2, PencilLine, Redo2, Underline, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RichText } from "@/components/RichText";
import { TEXT_ALIGN_CLASS, type TextAlign } from "@/lib/homeContent";
import {
  activeMarker, clearFormatting, countText, historyPush, historyRedo, historyReset, historyUndo, insertText, toggleBullets, toggleInline,
  type Edit, type History, type Marker,
} from "@/lib/markup-edit";
import { cn } from "@/lib/utils";

/**
 * Markup-assisted text editor (not a full word processor).
 * - "block": bold/italic/underline + bullet lists, preview via the website's block RichText.
 * - "inline": bold/italic/underline only, preview via inline RichText.
 * - "plain": no formatting controls; counts, undo/redo and expanded editing only.
 * Never writes on mount; the parent's saved value stays untouched until the owner edits.
 */
export type MarkupMode = "block" | "inline" | "plain";
type View = "write" | "preview" | "split";

export function MarkupTextEditor({
  id, label, value, onChange, mode, max, rows = 4, align = "left", placeholder, previewClassName, invalid,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void; mode: MarkupMode; max?: number | undefined;
  rows?: number; align?: TextAlign; placeholder?: string | undefined; previewClassName?: string | undefined; invalid?: boolean | undefined;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const [hist, setHist] = useState<History>(() => historyReset(value));
  const [sel, setSel] = useState<[number, number]>([0, 0]);
  const [view, setView] = useState<View>("write");
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState("");
  const rich = mode !== "plain";

  // A saved value refreshed or reset from outside (Discard, Save, another admin) starts a fresh history,
  // so Undo can never bring back stale text over it.
  useEffect(() => {
    if (value !== hist.present.value) setHist(historyReset(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function restore(start: number, end: number) {
    window.requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(start, end);
      setSel([start, end]);
    });
  }
  function commit(ed: Edit, typing = false) {
    if (ed.error) { setNote(ed.error); return; }
    if (max != null && ed.value.length > max && ed.value.length > value.length) { setNote(`That would go over the ${max}-character limit.`); return; }
    setNote("");
    setHist((h) => historyPush(h, { value: ed.value, start: ed.start, end: ed.end }, { typing }));
    if (ed.value !== value) onChange(ed.value);
    if (!typing) restore(ed.start, ed.end);
  }
  const range = (): [number, number] => {
    const el = ref.current;
    return el ? [el.selectionStart, el.selectionEnd] : sel;
  };
  const fmt = (m: Marker) => { const [s, e] = range(); commit(toggleInline(value, s, e, m)); };
  const bullets = () => { const [s, e] = range(); commit(toggleBullets(value, s, e)); };
  const clear = () => { const [s, e] = range(); commit(clearFormatting(value, s, e)); };
  function step(dir: "undo" | "redo") {
    const next = dir === "undo" ? historyUndo(hist) : historyRedo(hist);
    if (next === hist) return;
    setHist(next);
    onChange(next.present.value);
    restore(next.present.start, next.present.end);
  }
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const k = e.key.toLowerCase();
    const run = (f: () => void) => { e.preventDefault(); f(); };
    if (k === "z" && e.shiftKey) return run(() => step("redo"));
    if (k === "z") return run(() => step("undo"));
    if (k === "y") return run(() => step("redo"));
    if (!rich || e.shiftKey) return;
    if (k === "b") return run(() => fmt("**"));
    if (k === "i") return run(() => fmt("*"));
    if (k === "u") return run(() => fmt("__"));
  }

  const active = rich ? activeMarker(value, sel[0], sel[1]) : null;
  const { words, chars } = countText(value);
  const near = max != null && chars >= max * 0.9;
  const keep = (e: React.MouseEvent) => e.preventDefault(); // toolbar clicks keep the textarea selection

  const toolbar = (
    <div role="toolbar" aria-label={`${label} text tools`} aria-controls={id} className="markup-toolbar flex flex-wrap items-center gap-1 rounded-md border border-border bg-background/40 p-1">
      {rich ? (
        <Group label="Text style">
          <Tool label="Bold (Ctrl+B)" pressed={active === "**"} onMouseDown={keep} onClick={() => fmt("**")}><Bold /></Tool>
          <Tool label="Italic (Ctrl+I)" pressed={active === "*"} onMouseDown={keep} onClick={() => fmt("*")}><Italic /></Tool>
          <Tool label="Underline (Ctrl+U)" pressed={active === "__"} onMouseDown={keep} onClick={() => fmt("__")}><Underline /></Tool>
        </Group>
      ) : null}
      {mode === "block" ? (
        <Group label="Lists"><Tool label="Bullet list" onMouseDown={keep} onClick={bullets}><List /></Tool></Group>
      ) : null}
      {rich ? <Group label="Clear"><Tool label="Remove formatting" onMouseDown={keep} onClick={clear}><Eraser /></Tool></Group> : null}
      <Group label="History">
        <Tool label="Undo (Ctrl+Z)" disabled={!hist.past.length} onMouseDown={keep} onClick={() => step("undo")}><Undo2 /></Tool>
        <Tool label="Redo (Ctrl+Shift+Z)" disabled={!hist.future.length} onMouseDown={keep} onClick={() => step("redo")}><Redo2 /></Tool>
      </Group>
      <div className="ml-auto flex items-center gap-1">
        {rich ? (
          <Group label="View">
            <Tool label="Write" pressed={view === "write"} onClick={() => setView("write")}><PencilLine /></Tool>
            <Tool label="Preview" pressed={view === "preview"} onClick={() => setView("preview")}><Eye /></Tool>
            <Tool label="Side by side" className="hidden lg:inline-flex" pressed={view === "split"} onClick={() => setView("split")}><Columns2 /></Tool>
          </Group>
        ) : null}
        {!expanded ? <Tool label="Expand editor" onClick={() => setExpanded(true)}><Maximize2 /></Tool> : null}
      </div>
    </div>
  );

  const area = (big: boolean) => (
    <Textarea
      ref={ref}
      id={id}
      rows={big ? 18 : rows}
      spellCheck
      value={value}
      maxLength={max}
      placeholder={placeholder}
      aria-invalid={invalid}
      aria-describedby={`${id}-count`}
      className={cn("markup-input whitespace-pre-wrap", TEXT_ALIGN_CLASS[align])}
      onChange={(e) => { setSel([e.target.selectionStart, e.target.selectionEnd]); commit({ value: e.target.value, start: e.target.selectionStart, end: e.target.selectionEnd }, true); }}
      onSelect={(e) => setSel([e.currentTarget.selectionStart, e.currentTarget.selectionEnd])}
      onKeyDown={onKeyDown}
      onPaste={(e) => {
        const text = e.clipboardData.getData("text/plain");
        e.preventDefault();
        const ed = insertText(value, e.currentTarget.selectionStart, e.currentTarget.selectionEnd, text, max);
        commit(ed);
        if (ed.truncated) setNote(`Pasted text was shortened to fit the ${max}-character limit.`);
      }}
    />
  );
  const preview = (
    <div aria-label={`${label} website preview`} className="markup-preview min-h-24 rounded-md border border-dashed border-border bg-card/60 p-3 text-sm text-muted-foreground">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-accent">Website preview</p>
      {value.trim() ? (
        mode === "block"
          ? <div className={cn("whitespace-pre-wrap", TEXT_ALIGN_CLASS[align], previewClassName)}><RichText text={value} /></div>
          : <p className={cn(TEXT_ALIGN_CLASS[align], previewClassName)}><RichText inline text={value} /></p>
      ) : <p className="italic">Nothing will show.</p>}
    </div>
  );
  const body = (big: boolean) => {
    const v: View = !rich ? "write" : view;
    return (
      <div className="grid gap-2">
        {toolbar}
        <div className={cn("grid gap-3", v === "split" && "lg:grid-cols-2")}>
          <div hidden={v === "preview"}>{area(big)}</div>
          {v !== "write" ? preview : null}
        </div>
        <div className="flex flex-wrap justify-between gap-2 text-xs">
          <p aria-live="polite" className={cn(note ? "text-destructive" : "text-muted-foreground")}>
            {note || (rich ? (mode === "block" ? "Select text, then use the buttons. One style per phrase; short lines show as sub-headings." : "Select text, then use the buttons. One style per phrase.") : "")}
          </p>
          <p id={`${id}-count`} className={cn(near ? "font-bold text-destructive" : "text-muted-foreground")}>
            {words} {words === 1 ? "word" : "words"} · {chars}{max != null ? ` / ${max}` : ""} characters{max != null && chars >= max ? " · limit reached" : ""}
          </p>
        </div>
      </div>
    );
  };

  return (
    <>
      {expanded ? (
        <div className="grid gap-2">
          <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">Editing in the expanded window — changes stay in this unsaved draft.</p>
        </div>
      ) : body(false)}
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-h-[92vh] w-[96vw] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>Same unsaved draft — nothing is saved until you press Save on the page.</DialogDescription>
          </DialogHeader>
          {expanded ? body(true) : null}
          <div className="flex justify-end"><Button type="button" onClick={() => setExpanded(false)}>Done</Button></div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return <div role="group" aria-label={label} className="flex items-center gap-0.5 border-r border-border pr-1 last:border-r-0">{children}</div>;
}
function Tool({ label, pressed, className, children, ...rest }: { label: string; pressed?: boolean; className?: string; children: ReactNode; disabled?: boolean; onClick: () => void; onMouseDown?: (e: React.MouseEvent) => void }) {
  return (
    <Button type="button" size="icon" variant={pressed ? "default" : "ghost"} className={cn("h-9 w-9 [&_svg]:h-4 [&_svg]:w-4", className)} aria-label={label} title={label} aria-pressed={pressed} {...rest}>
      {children}
    </Button>
  );
}
