/**
 * DependencyPicker — multi-select picker for choosing project dependencies.
 *
 * Renders a searchable dropdown of portfolio projects. Selected projects
 * appear as dismissible tag chips above the input. The currently-edited
 * project is excluded from the option list.
 *
 * Cycle detection: a soft warning is shown when the current selection would
 * create a circular dependency chain. Saving is still allowed.
 */
import { useState, useRef, useEffect, useMemo } from "react";
import { PORTFOLIO_SHORT_NAMES } from "../types/models";
import {
  makeStyles,
  shorthands,
  tokens,
  Text,
} from "@fluentui/react-components";
import type { Project } from "../types/models";
import { Icon } from "./Icon";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    rowGap: "6px",
  },
  control: {
    position: "relative",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    ...shorthands.padding("6px", "10px"),
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke1),
    ...shorthands.borderRadius("4px"),
    fontSize: "14px",
    fontFamily: "inherit",
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    outline: "none",
    ":focus": {
      borderTopColor: tokens.colorBrandStroke1,
      borderRightColor: tokens.colorBrandStroke1,
      borderBottomColor: tokens.colorBrandStroke1,
      borderLeftColor: tokens.colorBrandStroke1,
      boxShadow: `0 0 0 1px ${tokens.colorBrandStroke1}`,
    },
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
    ...shorthands.borderRadius("6px"),
    boxShadow: tokens.shadow8,
    zIndex: 100,
    maxHeight: "220px",
    overflowY: "auto",
  },
  option: {
    display: "flex",
    flexDirection: "column",
    rowGap: "1px",
    ...shorthands.padding("8px", "12px"),
    cursor: "pointer",
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground2,
    },
  },
  optionSelected: {
    backgroundColor: tokens.colorBrandBackground2,
    ":hover": {
      backgroundColor: tokens.colorBrandBackground2Hover,
    },
  },
  optionTitle: {
    fontSize: "13px",
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
  },
  optionAbbrev: {
    fontSize: "11px",
    color: tokens.colorNeutralForeground3,
  },
  noResults: {
    ...shorthands.padding("10px", "12px"),
    color: tokens.colorNeutralForeground3,
    fontSize: "13px",
  },
  chips: {
    display: "flex",
    flexWrap: "wrap",
    ...shorthands.gap("6px"),
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: "4px",
    ...shorthands.padding("3px", "8px", "3px", "10px"),
    ...shorthands.borderRadius("99px"),
    ...shorthands.border("1px", "solid", tokens.colorBrandStroke2),
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground2,
    fontSize: "12px",
    fontWeight: 500,
    maxWidth: "220px",
  },
  chipCyclic: {
    ...shorthands.border("1px", "solid", tokens.colorStatusWarningBorder1),
    backgroundColor: tokens.colorStatusWarningBackground1,
    color: tokens.colorStatusWarningForeground1,
  },
  chipLabel: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  chipRemove: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: tokens.colorBrandForeground2,
    ":hover": { color: tokens.colorStatusDangerForeground1 },
    flexShrink: 0,
    background: "none",
    border: "none",
    padding: 0,
    lineHeight: 1,
  },
  chipRemoveCyclic: {
    color: tokens.colorStatusWarningForeground1,
    ":hover": { color: tokens.colorStatusDangerForeground1 },
  },
  cycleWarning: {
    display: "flex",
    alignItems: "flex-start",
    columnGap: "6px",
    ...shorthands.padding("8px", "10px"),
    ...shorthands.borderRadius("6px"),
    ...shorthands.border("1px", "solid", tokens.colorStatusWarningBorder1),
    backgroundColor: tokens.colorStatusWarningBackground1,
    color: tokens.colorStatusWarningForeground1,
    fontSize: "12px",
    lineHeight: "1.4",
  },
  cycleWarningIcon: {
    flexShrink: 0,
    marginTop: "1px",
  },
});

// ─── Cycle detection ─────────────────────────────────────────────────────────

/**
 * Returns the set of selected dependency IDs that would create a circular
 * dependency if the current project depended on them.
 *
 * A cycle is detected when following a dependency's own dependency chain
 * eventually reaches the current project being edited.
 *
 * Dependencies in project data may be stored as IDs or legacy titles, so
 * resolution tries both.
 */
function findCyclicDeps(
  currentProjectId: string,
  selected: string[],
  projects: Project[]
): Set<string> {
  if (!currentProjectId) return new Set();

  const byId = new Map(projects.map((p) => [p.id, p]));
  const byTitle = new Map(projects.map((p) => [p.title.toLowerCase(), p]));

  function resolve(dep: string): Project | undefined {
    return byId.get(dep) ?? byTitle.get(dep.toLowerCase());
  }

  function canReach(fromId: string, targetId: string, visited: Set<string>): boolean {
    if (fromId === targetId) return true;
    if (visited.has(fromId)) return false;
    visited.add(fromId);
    const proj = byId.get(fromId);
    if (!proj) return false;
    for (const dep of proj.dependencies) {
      const resolved = resolve(dep);
      if (resolved && canReach(resolved.id, targetId, visited)) return true;
    }
    return false;
  }

  const cyclic = new Set<string>();
  for (const depId of selected) {
    if (canReach(depId, currentProjectId, new Set())) {
      cyclic.add(depId);
    }
  }
  return cyclic;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  /** All portfolio projects to pick from. */
  projects: Project[];
  /** The project being edited — excluded from the picker list. */
  currentProjectId: string;
  /** Currently selected dependency IDs. */
  selected: string[];
  /** Called when the selection changes. */
  onChange: (ids: string[]) => void;
}

export function DependencyPicker({ projects, currentProjectId, selected, onChange }: Props): JSX.Element {
  const s = useStyles();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Detect which selected deps form a cycle
  const cyclicIds = useMemo(
    () => findCyclicDeps(currentProjectId, selected, projects),
    [currentProjectId, selected, projects]
  );

  const options = projects.filter(
    (p) =>
      p.id !== currentProjectId &&
      !selected.includes(p.id) &&
      (query === "" ||
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.abbrev.toLowerCase().includes(query.toLowerCase()))
  );

  function addProject(id: string) {
    onChange([...selected, id]);
    setQuery("");
  }

  function removeProject(id: string) {
    onChange(selected.filter((s) => s !== id));
  }

  // Resolve selected IDs to project objects (with fallback for any stale entries)
  const selectedProjects = selected
    .map((id) => projects.find((p) => p.id === id))
    .filter((p): p is Project => p !== undefined);

  const cyclicProjects = selectedProjects.filter((p) => cyclicIds.has(p.id));

  return (
    <div className={s.root}>
      {selectedProjects.length > 0 && (
        <div className={s.chips}>
          {selectedProjects.map((p) => {
            const isCyclic = cyclicIds.has(p.id);
            return (
              <span
                key={p.id}
                className={`${s.chip}${isCyclic ? ` ${s.chipCyclic}` : ""}`}
                title={isCyclic ? `⚠ Circular dependency: ${p.title} already depends on this project` : p.title}
              >
                <span className={s.chipLabel}>
                  {isCyclic && "⚠ "}
                  {p.abbrev} · {p.title}
                </span>
                <button
                  type="button"
                  className={`${s.chipRemove}${isCyclic ? ` ${s.chipRemoveCyclic}` : ""}`}
                  onClick={() => removeProject(p.id)}
                  aria-label={`Remove ${p.title}`}
                >
                  <Icon name="close" size={12} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {cyclicProjects.length > 0 && (
        <div className={s.cycleWarning} role="alert">
          <span className={s.cycleWarningIcon}>
            <Icon name="warning" size={14} />
          </span>
          <Text size={200}>
            <strong>Circular {cyclicProjects.length === 1 ? "dependency" : "dependencies"} detected</strong>
            {" — "}
            {cyclicProjects.length === 1
              ? `"${cyclicProjects[0].title}" already depends on this project, creating a cycle.`
              : `${cyclicProjects.map((p) => `"${p.title}"`).join(", ")} already depend on this project, creating cycles.`}
            {" "}You can still save, but circular dependencies may cause confusion in the dependency graph.
          </Text>
        </div>
      )}

      <div className={s.control} ref={containerRef}>
        <input
          className={s.input}
          type="text"
          placeholder={selected.length === 0 ? "Search projects to add as dependencies…" : "Add another dependency…"}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          autoComplete="off"
        />
        {open && (
          <div className={s.dropdown}>
            {options.length === 0 ? (
              <div className={s.noResults}>
                <Text size={200}>
                  {query ? `No projects matching "${query}"` : "No more projects to add"}
                </Text>
              </div>
            ) : (
              options.map((p) => (
                <div
                  key={p.id}
                  className={s.option}
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent blur before click
                    addProject(p.id);
                    setOpen(false);
                  }}
                >
                  <span className={s.optionTitle}>{p.title}</span>
                  <span className={s.optionAbbrev}>{p.abbrev} · {(PORTFOLIO_SHORT_NAMES as Record<string, string>)[p.portfolio] ?? p.portfolio}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
