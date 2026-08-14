/**
 * Shared helpers for persisting travel-alert dismissals in sessionStorage.
 *
 * Dismissals are keyed by travel entry ID so that a new trip for the same
 * person correctly re-appears, while the dismissed one stays hidden for the
 * duration of the browser session (tab lifetime).
 */

const DISMISSED_KEY = "travel-alerts-dismissed";

export function readDismissed(): Set<string> {
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    return new Set<string>(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function writeDismissed(ids: Set<string>): void {
  try {
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
  } catch {
    // sessionStorage unavailable (e.g. private-browsing restriction); ignore
  }
}
