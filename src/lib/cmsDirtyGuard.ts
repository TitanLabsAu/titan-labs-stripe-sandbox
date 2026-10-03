/** One shared record of Storefront content blocks with unsaved edits, so every exit path asks once. */
const dirty = new Set<string>();
const listeners = new Set<() => void>();

export function setCmsDirty(id: string, isDirty: boolean) {
  const had = dirty.has(id);
  if (isDirty) dirty.add(id);
  else dirty.delete(id);
  if (had !== isDirty) listeners.forEach((l) => l());
}
export const cmsDirtyIds = () => [...dirty];
export const cmsHasUnsavedChanges = () => dirty.size > 0;
export function subscribeCmsDirty(l: () => void) {
  listeners.add(l);
  return () => void listeners.delete(l);
}
export function clearCmsDirty() {
  dirty.clear();
  listeners.forEach((l) => l());
}

/** Ask once before discarding drafts. Returns true when it is OK to leave; clears the record so later guards don't ask again. */
export function confirmDiscardCmsDrafts(): boolean {
  if (dirty.size === 0) return true;
  const ok = window.confirm("You have unsaved Storefront content changes. Leave without saving?");
  if (ok) clearCmsDirty();
  return ok;
}
