/**
 * usePersonTravelAlerts — returns upcoming travel entries (within 14 days) for a PersonRef.
 *
 * Matches by corpId first (if available), then by normalised name. Returns entries
 * that depart within the next 14 days. Both "Planned" and "Booked" entries are active.
 */
import { useMemo } from "react";
import type { PersonRef, TravelEntry } from "../types/models";
import { personName } from "../types/models";
import { parseISO, today } from "../lib/format";

const ALERT_WINDOW_DAYS = 14;

function matchesPerson(entry: TravelEntry, person: PersonRef): boolean {
  if (!person.name) return false;
  const entryPerson = typeof entry.person === "object" ? entry.person : { name: String(entry.person), email: "", corpId: "" };

  // Prefer corpId match
  if (person.corpId && entryPerson.corpId) {
    return person.corpId.toLowerCase() === entryPerson.corpId.toLowerCase();
  }
  // Fall back to name match
  return personName(entryPerson).toLowerCase() === person.name.toLowerCase();
}

export interface TravelAlert {
  entry: TravelEntry;
  /** The PersonRef that triggered this alert */
  person: PersonRef;
  /** 'owner' | 'sponsor' | 'traveller' */
  role: string;
}

/**
 * Returns upcoming travel entries for the given persons within the next 14 days.
 * @param persons  Map of role → PersonRef to check (e.g. { owner: project.owner, sponsor: project.sponsor })
 * @param travelEntries  All travel entries from the portfolio store
 */
export function usePersonTravelAlerts(
  persons: Record<string, PersonRef>,
  travelEntries: TravelEntry[]
): TravelAlert[] {
  return useMemo(() => {
    const now = today();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() + ALERT_WINDOW_DAYS);
    const nowTime = now.getTime();
    const cutoffTime = cutoff.getTime();

    const alerts: TravelAlert[] = [];

    for (const [role, person] of Object.entries(persons)) {
      if (!person?.name) continue;
      for (const entry of travelEntries) {
        // Both "Planned" and "Booked" entries are active — no status filtering needed.
        const dep = parseISO(entry.departureDate).getTime();
        const ret = parseISO(entry.returnDate).getTime();
        // Show if the trip overlaps the next 14-day window (starts before cutoff and ends after now)
        if (dep <= cutoffTime && ret >= nowTime) {
          if (matchesPerson(entry, person)) {
            alerts.push({ entry, person, role });
          }
        }
      }
    }

    return alerts;
  }, [persons, travelEntries]);
}

/**
 * Find all active projects where a person is owner or sponsor, by name or corpId.
 */
export function projectsForPerson(
  person: PersonRef,
  projects: Array<{ id: string; title: string; status: string; owner: PersonRef; sponsor: PersonRef }>
): Array<{ id: string; title: string; role: string }> {
  if (!person?.name) return [];
  const result: Array<{ id: string; title: string; role: string }> = [];
  for (const p of projects) {
    if (p.status === "Complete") continue;
    const ownerRef = typeof p.owner === "object" ? p.owner : { name: String(p.owner), email: "", corpId: "" };
    const sponsorRef = typeof p.sponsor === "object" ? p.sponsor : { name: String(p.sponsor), email: "", corpId: "" };

    const matches = (ref: PersonRef) => {
      if (person.corpId && ref.corpId) return person.corpId.toLowerCase() === ref.corpId.toLowerCase();
      return personName(ref).toLowerCase() === person.name.toLowerCase();
    };

    if (matches(ownerRef)) result.push({ id: p.id, title: p.title, role: "owner" });
    else if (matches(sponsorRef)) result.push({ id: p.id, title: p.title, role: "sponsor" });
  }
  return result;
}
