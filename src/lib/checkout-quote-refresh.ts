/** A cancelled form is not proof of a cancelled payable intent. */
export async function cancelAndRefreshQuote(deps: {
  cancel: () => Promise<{ ok: boolean }>;
  refresh: () => Promise<unknown>;
  clear: () => void;
}) {
  const result = await deps.cancel();
  if (!result.ok) throw new Error('Payment cancellation could not be confirmed. Your offer remains reserved.');
  deps.clear();
  await deps.refresh();
}

export function isVerifiedQuote(state: { data?: unknown; isFetching: boolean; isPlaceholderData: boolean; isError: boolean }) {
  return Boolean(state.data) && !state.isFetching && !state.isPlaceholderData && !state.isError;
}