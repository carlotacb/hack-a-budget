import { useEffect, useState } from "react";

/**
 * True for `ms` after `state` changes to a new result, then false — so a
 * "Saved." / error message can disappear on its own. Each action result is
 * a new object, so a repeat of the same message shows (and expires) again.
 * Empty results (the initial `{}`) never show.
 */
export function useAutoDismiss(
  state: { error?: string; success?: boolean },
  ms = 5000,
) {
  const [dismissed, setDismissed] = useState<typeof state | null>(null);
  const hasMessage = Boolean(state.error || state.success);

  useEffect(() => {
    if (!hasMessage) return;

    const timer = setTimeout(() => setDismissed(state), ms);
    return () => clearTimeout(timer);
  }, [state, hasMessage, ms]);

  return hasMessage && dismissed !== state;
}
