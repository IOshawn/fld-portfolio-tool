/** Date and label formatting helpers. Dates are date-only ISO strings (YYYY-MM-DD). */

/** Parse a date-only ISO string into a local Date at midnight (avoids UTC shift). */
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Today at local midnight — single source of "now" for the prototype. */
export function today(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

/** Current date as ISO YYYY-MM-DD (used to pre-fill update forms). */
export function todayISO(): string {
  const t = today();
  const mm = String(t.getMonth() + 1).padStart(2, "0");
  const dd = String(t.getDate()).padStart(2, "0");
  return `${t.getFullYear()}-${mm}-${dd}`;
}

const dayMonthYear = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const monthYear = new Intl.DateTimeFormat("en-AU", {
  month: "short",
  year: "numeric",
});

/** e.g. "15 Jun 2026". Returns "—" for empty input. */
export function formatDate(iso: string | undefined | null): string {
  if (!iso) return "—";
  return dayMonthYear.format(parseISO(iso));
}

/** e.g. "Jun 2026". */
export function formatMonthYear(iso: string): string {
  return monthYear.format(parseISO(iso));
}

/** Whole days from today to the given date (negative = in the past). */
export function daysFromToday(iso: string): number {
  const ms = parseISO(iso).getTime() - today().getTime();
  return Math.round(ms / 86_400_000);
}

/** Human relative label, e.g. "in 5 days", "today", "12 days ago". */
export function relativeDay(iso: string): string {
  const d = daysFromToday(iso);
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d === -1) return "yesterday";
  if (d > 0) return `in ${d} days`;
  return `${Math.abs(d)} days ago`;
}

/** Initials for an avatar fallback, e.g. "Phillip Rickson" -> "PR". */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
