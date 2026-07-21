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

// ---------------------------------------------------------------------------
// Quarter helpers
// ---------------------------------------------------------------------------

const QUARTER_MONTHS: Record<number, { months: string; startMD: string; endMD: string }> = {
  1: { months: "January – March",   startMD: "01-01", endMD: "03-31" },
  2: { months: "April – June",      startMD: "04-01", endMD: "06-30" },
  3: { months: "July – September",  startMD: "07-01", endMD: "09-30" },
  4: { months: "October – December",startMD: "10-01", endMD: "12-31" },
};

export interface QuarterInfo {
  /** e.g. 3 */
  number: number;
  /** e.g. 2026 */
  year: number;
  /** e.g. "Q3 2026" */
  label: string;
  /** e.g. "July – September" */
  monthRange: string;
  /** ISO YYYY-MM-DD first day of quarter */
  start: string;
  /** ISO YYYY-MM-DD last day of quarter */
  end: string;
}

/** Returns quarter metadata derived from today's local date. */
export function currentQuarter(): QuarterInfo {
  const t = today();
  const year = t.getFullYear();
  const q = Math.floor(t.getMonth() / 3) + 1;
  const meta = QUARTER_MONTHS[q]!;
  return {
    number: q,
    year,
    label: `Q${q} ${year}`,
    monthRange: meta.months,
    start: `${year}-${meta.startMD}`,
    end: `${year}-${meta.endMD}`,
  };
}

/** e.g. "1 July 2026" from an ISO date string. */
export function formatDateLong(iso: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseISO(iso));
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
