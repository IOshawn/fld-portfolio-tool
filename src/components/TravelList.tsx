/**
 * TravelList — sortable, filterable list of travel entries.
 * Shows associated travel as small badges. Includes an "Add entry" button.
 */
import { useState, useMemo } from "react";
import {
  makeStyles,
  shorthands,
  tokens,
  Text,
  Button,
  Badge,
} from "@fluentui/react-components";
import { FilterBar, SelectFilter, SelectFilterKV, ResultCount } from "./FilterBar";
import type { TravelEntry, Project } from "../types/models";
import { SITES, TRAVEL_STATUSES } from "../types/models";
import { formatDate } from "../lib/format";
import { Icon } from "./Icon";

const STATUS_COLORS: Record<TravelEntry["status"], string> = {
  Planned: tokens.colorBrandBackground,
  Travelling: "#3d8a4f",
  Returned: tokens.colorNeutralStroke1,
  Cancelled: tokens.colorStatusDangerBackground3,
};

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    rowGap: "0px",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "12px",
    flexWrap: "wrap" as const,
    rowGap: "8px",
  },
  table: {
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
    ...shorthands.borderRadius("12px"),
    ...shorthands.overflow("hidden"),
    boxShadow: tokens.shadow2,
    width: "100%",
    borderCollapse: "collapse" as const,
  },
  thead: {
    backgroundColor: tokens.colorNeutralBackground2,
  },
  th: {
    ...shorthands.padding("10px", "16px"),
    textAlign: "left" as const,
    fontSize: "11px",
    fontWeight: 700,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke2),
    cursor: "pointer",
    userSelect: "none" as const,
    whiteSpace: "nowrap" as const,
    ":hover": {
      color: tokens.colorNeutralForeground1,
    },
  },
  td: {
    ...shorthands.padding("10px", "16px"),
    fontSize: "13px",
    color: tokens.colorNeutralForeground1,
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke3),
    verticalAlign: "top" as const,
  },
  tr: {
    ":hover": { backgroundColor: tokens.colorNeutralBackground2 },
    cursor: "pointer",
  },
  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    ...shorthands.padding("2px", "8px"),
    ...shorthands.borderRadius("999px"),
    fontSize: "11px",
    fontWeight: 600,
    color: "#fff",
    whiteSpace: "nowrap" as const,
  },
  assocList: {
    display: "flex",
    flexWrap: "wrap" as const,
    ...shorthands.gap("4px"),
    marginTop: "4px",
  },
  description: {
    color: tokens.colorNeutralForeground3,
    fontSize: "12px",
    marginTop: "2px",
    display: "-webkit-box",
    WebkitLineClamp: "2",
    WebkitBoxOrient: "vertical" as const,
    ...shorthands.overflow("hidden"),
  },
  empty: {
    ...shorthands.padding("40px"),
    textAlign: "center" as const,
    color: tokens.colorNeutralForeground3,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
    ...shorthands.borderRadius("12px"),
  },
  flightBadge: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: "4px",
    fontSize: "11px",
    color: tokens.colorNeutralForeground3,
    marginTop: "2px",
  },
});

type SortKey = "person" | "departureDate" | "returnDate" | "site" | "status";

interface Filters {
  person: string;
  site: string;
  status: string;
  initiativeId: string;
}

const EMPTY: Filters = { person: "", site: "", status: "", initiativeId: "" };

interface Props {
  entries: TravelEntry[];
  projects: Project[];
  onAdd: () => void;
  onEdit: (entry: TravelEntry) => void;
}

export function TravelList({ entries, projects, onAdd, onEdit }: Props): JSX.Element {
  const s = useStyles();
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({
    key: "departureDate",
    dir: 1,
  });

  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const entryMap = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);

  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));
  const clear = () => setFilters(EMPTY);

  const personOptions = useMemo(
    () => [...new Set(entries.map((e) => e.person))].sort(),
    [entries]
  );
  const projectOptions = useMemo(
    () => projects
      .filter((p) => entries.some((e) => e.initiativeId === p.id))
      .map((p) => ({ value: p.id, label: p.title }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [projects, entries]
  );

  const filtered = useMemo(() => {
    let result = entries;
    if (filters.person) result = result.filter((e) => e.person === filters.person);
    if (filters.site) result = result.filter((e) => e.site === filters.site);
    if (filters.status) result = result.filter((e) => e.status === filters.status);
    if (filters.initiativeId) result = result.filter((e) => e.initiativeId === filters.initiativeId);
    return result;
  }, [entries, filters]);

  const sorted = useMemo(() => {
    const { key, dir } = sort;
    return [...filtered].sort((a, b) => {
      const av = a[key] ?? "";
      const bv = b[key] ?? "";
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  }, [filtered, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 });

  const sortIndicator = (key: SortKey) =>
    sort.key === key ? (sort.dir === 1 ? " ↑" : " ↓") : "";

  const anyActive = Object.values(filters).some(Boolean);

  return (
    <div className={s.root}>
      <div className={s.toolbar}>
        <FilterBar>
          <SelectFilter
            label="Person"
            value={filters.person}
            options={personOptions}
            onChange={(v) => set({ person: v })}
            allLabel="All people"
          />
          <SelectFilter
            label="Site"
            value={filters.site}
            options={[...SITES]}
            onChange={(v) => set({ site: v })}
            allLabel="All sites"
          />
          <SelectFilterKV
            label="Project"
            value={filters.initiativeId}
            options={projectOptions}
            onChange={(v) => set({ initiativeId: v })}
            allLabel="All projects"
          />
          <SelectFilter
            label="Status"
            value={filters.status}
            options={[...TRAVEL_STATUSES]}
            onChange={(v) => set({ status: v })}
            allLabel="All statuses"
          />
          <ResultCount count={sorted.length} noun="entry" />
          {anyActive ? (
            <Button appearance="subtle" size="small" onClick={clear}>
              Clear
            </Button>
          ) : null}
        </FilterBar>
        <Button appearance="primary" size="small" icon={<Icon name="add" size={16} />} onClick={onAdd}>
          Log travel
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className={s.empty}>
          <Text size={200}>No travel entries match these filters.</Text>
        </div>
      ) : (
        <table className={s.table}>
          <thead className={s.thead}>
            <tr>
              <th className={s.th} onClick={() => toggleSort("person")}>
                Person{sortIndicator("person")}
              </th>
              <th className={s.th} onClick={() => toggleSort("site")}>
                Site{sortIndicator("site")}
              </th>
              <th className={s.th}>Project</th>
              <th className={s.th} onClick={() => toggleSort("departureDate")}>
                Departure{sortIndicator("departureDate")}
              </th>
              <th className={s.th} onClick={() => toggleSort("returnDate")}>
                Return{sortIndicator("returnDate")}
              </th>
              <th className={s.th} onClick={() => toggleSort("status")}>
                Status{sortIndicator("status")}
              </th>
              <th className={s.th}>Details</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry) => {
              const project = projectMap.get(entry.initiativeId);
              const associated = entry.associatedWith
                .map((id) => entryMap.get(id))
                .filter(Boolean) as TravelEntry[];
              return (
                <tr key={entry.id} className={s.tr} onClick={() => onEdit(entry)}>
                  <td className={s.td}>
                    <Text size={300} weight="semibold">{entry.person}</Text>
                    {associated.length > 0 ? (
                      <div className={s.assocList}>
                        {associated.map((a) => (
                          <Badge
                            key={a.id}
                            appearance="tint"
                            size="small"
                            shape="rounded"
                          >
                            {a.person}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </td>
                  <td className={s.td}>
                    <Text size={300}>{entry.site}</Text>
                    <div style={{ fontSize: "11px", color: tokens.colorNeutralForeground3 }}>
                      {entry.workArea}
                    </div>
                  </td>
                  <td className={s.td}>
                    {project ? (
                      <Text size={300}>{project.title}</Text>
                    ) : (
                      <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>—</Text>
                    )}
                  </td>
                  <td className={s.td} style={{ whiteSpace: "nowrap" }}>
                    {formatDate(entry.departureDate)}
                  </td>
                  <td className={s.td} style={{ whiteSpace: "nowrap" }}>
                    {formatDate(entry.returnDate)}
                  </td>
                  <td className={s.td}>
                    <span
                      className={s.statusPill}
                      style={{
                        backgroundColor: STATUS_COLORS[entry.status] ?? tokens.colorNeutralBackground3,
                      }}
                    >
                      {entry.status}
                    </span>
                  </td>
                  <td className={s.td}>
                    {entry.flightNumber ? (
                      <div className={s.flightBadge}>
                        <Icon name="plane" size={12} />
                        {entry.flightNumber}
                      </div>
                    ) : null}
                    {entry.description ? (
                      <div className={s.description}>{entry.description}</div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
