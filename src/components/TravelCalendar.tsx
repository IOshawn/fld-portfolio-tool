/**
 * TravelCalendar — month grid calendar showing travel entries as coloured bars.
 * One row per person who has travel in the visible month range.
 * Clicking a bar opens the TravelEntryForm for editing.
 */
import { useState, useMemo } from "react";
import { makeStyles, shorthands, tokens, Text, Button, Badge, Tooltip } from "@fluentui/react-components";
import type { TravelEntry, Project } from "../types/models";
import { personName, toPersonRef } from "../types/models";
import { projectsForPerson } from "../hooks/usePersonTravelAlerts";
import { Icon } from "./Icon";

// ── Palette — one colour per unique person (cycles) ──────────────────────────
const PERSON_PALETTE = [
  "#2f5e9e",
  "#2f9e8f",
  "#9e4f2f",
  "#5e7a2f",
  "#7e3d8a",
  "#3d6a8a",
  "#8a6a3d",
  "#4f3d8a",
];

const STATUS_ALPHA: Record<TravelEntry["status"], string> = {
  Planned: "99",
  Booked:  "ff",
};

const useStyles = makeStyles({
  root: {
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
    ...shorthands.borderRadius("12px"),
    boxShadow: tokens.shadow2,
    ...shorthands.overflow("hidden"),
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    ...shorthands.padding("14px", "20px"),
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke2),
    backgroundColor: tokens.colorNeutralBackground1,
  },
  headerTitle: {
    fontWeight: 700,
    fontSize: "15px",
  },
  headerNav: {
    display: "flex",
    alignItems: "center",
    columnGap: "6px",
  },
  grid: {
    overflowX: "auto",
  },
  table: {
    minWidth: "700px",
    width: "100%",
    borderCollapse: "collapse" as const,
  },
  dayHeader: {
    ...shorthands.padding("6px", "2px"),
    textAlign: "center" as const,
    fontSize: "11px",
    fontWeight: 600,
    color: tokens.colorNeutralForeground3,
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke2),
    backgroundColor: tokens.colorNeutralBackground2,
    whiteSpace: "nowrap" as const,
    minWidth: "30px",
  },
  dayHeaderToday: {
    color: tokens.colorBrandForeground1,
    fontWeight: 700,
  },
  personLabel: {
    ...shorthands.padding("6px", "12px"),
    fontSize: "12px",
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
    whiteSpace: "nowrap" as const,
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke3),
    backgroundColor: tokens.colorNeutralBackground1,
    position: "sticky" as const,
    left: 0,
    zIndex: 1,
    minWidth: "120px",
    maxWidth: "160px",
    ...shorthands.overflow("hidden"),
    textOverflow: "ellipsis",
  },
  cell: {
    position: "relative" as const,
    height: "36px",
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke3),
    ...shorthands.borderLeft("1px", "solid", tokens.colorNeutralStroke3),
    cursor: "default",
  },
  cellToday: {
    backgroundColor: tokens.colorBrandBackground2,
  },
  cellWeekend: {
    backgroundColor: tokens.colorNeutralBackground2,
  },
  bar: {
    position: "absolute" as const,
    top: "6px",
    bottom: "6px",
    left: "1px",
    right: "1px",
    ...shorthands.borderRadius("4px"),
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    ...shorthands.padding("0", "5px"),
    ...shorthands.overflow("hidden"),
    transitionProperty: "transform, box-shadow",
    transitionDuration: tokens.durationFast,
    ":hover": {
      transform: "scaleY(1.1)",
      boxShadow: tokens.shadow4,
    },
  },
  barLinked: {
    // Inset white border signals that this trip is grouped with others
    boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.65)",
  },
  barLabel: {
    fontSize: "10px",
    fontWeight: 600,
    color: "#fff",
    whiteSpace: "nowrap" as const,
    textOverflow: "ellipsis",
    ...shorthands.overflow("hidden"),
  },
  linkDot: {
    width: "6px",
    height: "6px",
    ...shorthands.borderRadius("50%"),
    backgroundColor: "rgba(255,255,255,0.8)",
    flexShrink: 0,
    marginLeft: "auto",
  },
  empty: {
    ...shorthands.padding("40px"),
    textAlign: "center" as const,
    color: tokens.colorNeutralForeground3,
  },
  legend: {
    display: "flex",
    flexWrap: "wrap" as const,
    columnGap: "16px",
    rowGap: "6px",
    ...shorthands.padding("12px", "20px"),
    ...shorthands.borderTop("1px", "solid", tokens.colorNeutralStroke2),
    backgroundColor: tokens.colorNeutralBackground2,
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    columnGap: "6px",
    fontSize: "11px",
    color: tokens.colorNeutralForeground2,
  },
  legendDot: {
    width: "10px",
    height: "10px",
    ...shorthands.borderRadius("50%"),
    flexShrink: 0,
  },
});

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

interface Props {
  entries: TravelEntry[];
  projects: Project[];
  onEdit: (entry: TravelEntry) => void;
}

export function TravelCalendar({ entries, projects, onEdit }: Props): JSX.Element {
  const s = useStyles();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const todayISO = isoDate(now.getFullYear(), now.getMonth(), now.getDate());
  const numDays = daysInMonth(year, month);
  const days = Array.from({ length: numDays }, (_, i) => i + 1);

  // Build a colour map per person (keyed across ALL entries so colours stay consistent)
  const personColorMap = useMemo(() => {
    const people = [...new Set(entries.map((e) => personName(e.person)))].sort();
    const map = new Map<string, string>();
    people.forEach((p, i) => map.set(p, PERSON_PALETTE[i % PERSON_PALETTE.length]));
    return map;
  }, [entries]);

  // Active projects for cross-reference
  const activeProjects = useMemo(
    () => projects.filter((p) => p.status !== "Complete"),
    [projects]
  );

  // Build a map from person name → impacted projects (owner/sponsor on active projects)
  // Uses the first entry per person to get a full PersonRef
  const personImpactMap = useMemo(() => {
    const map = new Map<string, Array<{ id: string; title: string; role: string }>>();
    for (const entry of entries) {
      const name = personName(entry.person);
      if (!map.has(name)) {
        const ref = toPersonRef(entry.person);
        map.set(name, projectsForPerson(ref, activeProjects));
      }
    }
    return map;
  }, [entries, activeProjects]);

  // Filter entries visible in this month
  const monthStart = isoDate(year, month, 1);
  const monthEnd = isoDate(year, month, numDays);

  const visibleEntries = useMemo(
    () => entries.filter((e) => e.departureDate <= monthEnd && e.returnDate >= monthStart),
    [entries, monthStart, monthEnd]
  );

  // Group by person — only show people with trips this month
  const people = useMemo(
    () => [...new Set(visibleEntries.map((e) => personName(e.person)))].sort(),
    [visibleEntries]
  );

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  return (
    <div className={s.root}>
      <div className={s.header}>
        <Text className={s.headerTitle}>
          {MONTH_NAMES[month]} {year}
        </Text>
        <div className={s.headerNav}>
          <Button appearance="subtle" size="small" icon={<Icon name="chevronRight" size={16} />}
            style={{ transform: "rotate(180deg)" }} onClick={prevMonth} title="Previous month" />
          <Button appearance="subtle" size="small" onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); }}>
            Today
          </Button>
          <Button appearance="subtle" size="small" icon={<Icon name="chevronRight" size={16} />}
            onClick={nextMonth} title="Next month" />
        </div>
      </div>

      <div className={s.grid}>
        <table className={s.table}>
          <thead>
            <tr>
              {/* sticky person column header */}
              <th className={s.personLabel} style={{ fontSize: "11px", color: tokens.colorNeutralForeground3 }}>
                Person
              </th>
              {days.map((d) => {
                const dayIso = isoDate(year, month, d);
                const isToday = dayIso === todayISO;
                return (
                  <th
                    key={d}
                    className={`${s.dayHeader} ${isToday ? s.dayHeaderToday : ""}`}
                    title={dayIso}
                  >
                    {d}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {people.length === 0 ? (
              <tr>
                <td colSpan={numDays + 1} className={s.empty}>
                  <Text size={200}>No travel entries this month.</Text>
                </td>
              </tr>
            ) : (
              people.map((person) => {
                const personEntries = visibleEntries.filter((e) => personName(e.person) === person);
                const color = personColorMap.get(person) ?? PERSON_PALETTE[0];
                const impactedProjects = personImpactMap.get(person) ?? [];
                return (
                  <tr key={person}>
                    <td className={s.personLabel} title={person}>
                      <div style={{ display: "flex", alignItems: "center", columnGap: "4px", flexWrap: "wrap" }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{person}</span>
                        {impactedProjects.length > 0 && (
                          <Tooltip
                            content={
                              <div>
                                <strong>Project impact:</strong>
                                <ul style={{ margin: "4px 0 0 0", paddingLeft: "16px" }}>
                                  {impactedProjects.map((p) => (
                                    <li key={p.id}>{p.title} ({p.role})</li>
                                  ))}
                                </ul>
                              </div>
                            }
                            relationship="label"
                          >
                            <Badge
                              appearance="tint"
                              color="warning"
                              size="small"
                              shape="rounded"
                            >
                              {impactedProjects.length} project{impactedProjects.length > 1 ? "s" : ""}
                            </Badge>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                    {days.map((d) => {
                      const dayIso = isoDate(year, month, d);
                      const dow = new Date(year, month, d).getDay();
                      const isToday = dayIso === todayISO;
                      const isWeekend = dow === 0 || dow === 6;

                      // Find an entry that covers this day (take first if multiple)
                      const entry = personEntries.find(
                        (e) => e.departureDate <= dayIso && e.returnDate >= dayIso
                      );

                      // Is this the first day of the entry in this month?
                      const isStart = entry
                        ? entry.departureDate === dayIso ||
                          (entry.departureDate < monthStart && d === 1)
                        : false;

                      const statusAlpha = entry ? STATUS_ALPHA[entry.status] : "ff";
                      const barColor = color + statusAlpha;

                      const isLinked = (entry?.associatedWith?.length ?? 0) > 0;
                      const linkedTip = isLinked
                        ? ` · travelling with ${entry!.associatedWith.length} other${entry!.associatedWith.length > 1 ? "s" : ""}`
                        : "";

                      return (
                        <td
                          key={d}
                          className={`${s.cell} ${isToday ? s.cellToday : isWeekend ? s.cellWeekend : ""}`}
                        >
                          {entry ? (
                            <div
                              className={`${s.bar} ${isLinked ? s.barLinked : ""}`}
                              style={{ backgroundColor: barColor }}
                              onClick={() => onEdit(entry)}
                              title={`${personName(entry.person)} — ${entry.site} (${entry.status})${entry.flightNumber ? " · " + entry.flightNumber : ""}${linkedTip}`}
                            >
                              {isStart ? (
                                <span className={s.barLabel}>
                                  {entry.site}
                                  {entry.flightNumber ? ` · ${entry.flightNumber}` : ""}
                                </span>
                              ) : null}
                              {isLinked ? <span className={s.linkDot} /> : null}
                            </div>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      {people.length > 0 ? (
        <div className={s.legend}>
          {people.map((person) => (
            <div key={person} className={s.legendItem}>
              <div
                className={s.legendDot}
                style={{ backgroundColor: personColorMap.get(person) ?? "#888" }}
              />
              {person}
            </div>
          ))}
          {/* Grouping cue explanation */}
          <div className={s.legendItem} style={{ marginLeft: "auto", opacity: 0.75 }}>
            <div
              style={{
                width: "24px",
                height: "10px",
                borderRadius: "3px",
                backgroundColor: "#2f5e9e",
                boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.65)",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                paddingRight: "2px",
              }}
            >
              <span
                style={{
                  width: "4px",
                  height: "4px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(255,255,255,0.8)",
                }}
              />
            </div>
            <span style={{ fontSize: "10px" }}>Linked trip</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
