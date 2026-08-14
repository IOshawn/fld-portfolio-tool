/**
 * AdminPage — bulk-edit console for all data objects.
 *
 * Three tabs: Projects, Engagements, Milestones.
 * Each tab shows a full-width spreadsheet-style table where clicking any
 * editable cell activates an inline editor. Multiple rows can be selected
 * for bulk status/stage changes or deletion.
 *
 * Column headers are sortable (click to toggle asc/desc).
 * A filter bar above each table narrows rows by any text field.
 */
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  makeStyles,
  shorthands,
  tokens,
  Text,
  Button,
  mergeClasses,
} from "@fluentui/react-components";
import { PageHeader } from "../components/PageHeader";
import { PortfolioGate } from "../components/PortfolioGate";
import { usePortfolioActions } from "../hooks/usePortfolio";
import type {
  PortfolioData,
  Engagement,
  Milestone,
  Stage,
  Status,
  MilestoneStatus,
  Site,
  WorkArea,
  EngagementStage,
  EngagementStatus,
  PersonRef,
} from "../types/models";
import {
  STAGES,
  STATUSES,
  MILESTONE_STATUSES,
  PORTFOLIOS,
  SITES,
  WORK_AREAS,
  ENGAGEMENT_STAGES,
  ENGAGEMENT_STATUSES,
  personName,
} from "../types/models";
import { PeoplePicker } from "../components/PeoplePicker";
import { Icon } from "../components/Icon";
import { repository } from "../services";
import type { QuarterlyMilestoneInput } from "../services";
import type { QuarterlyMilestone, PortfolioArea } from "../types/quarterly";
import { QUARTERLY_PORTFOLIO_AREAS } from "../types/quarterly";

// ─── Styles ──────────────────────────────────────────────────────────────────

const useStyles = makeStyles({
  tabs: {
    display: "flex",
    columnGap: "4px",
    marginBottom: "16px",
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  tab: {
    ...shorthands.padding("8px", "16px"),
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500,
    color: tokens.colorNeutralForeground2,
    marginBottom: "-1px",
    ":hover": {
      color: tokens.colorNeutralForeground1,
    },
  },
  tabActive: {
    color: tokens.colorBrandForeground1,
    borderBottomColor: tokens.colorBrandStroke1,
    fontWeight: 600,
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    columnGap: "8px",
    ...shorthands.padding("8px", "12px"),
    backgroundColor: tokens.colorBrandBackground2,
    ...shorthands.borderRadius("8px"),
    marginBottom: "12px",
    flexWrap: "wrap",
    rowGap: "8px",
  },
  toolbarLabel: {
    fontWeight: 600,
    color: tokens.colorBrandForeground2,
    marginRight: "4px",
    whiteSpace: "nowrap",
  },
  filterBar: {
    display: "flex",
    alignItems: "center",
    columnGap: "8px",
    marginBottom: "10px",
  },
  filterInput: {
    flex: "1 1 240px",
    maxWidth: "360px",
    fontSize: "13px",
    ...shorthands.padding("5px", "10px"),
    ...shorthands.borderRadius("6px"),
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    outline: "none",
    background: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    ":focus": {
      border: `1px solid ${tokens.colorBrandStroke1}`,
    },
  },
  filterCount: {
    fontSize: "12px",
    color: tokens.colorNeutralForeground3,
    whiteSpace: "nowrap",
  },
  tableWrap: {
    overflowX: "auto",
    ...shorthands.borderRadius("8px"),
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
    minWidth: "900px",
  },
  thead: {
    backgroundColor: tokens.colorNeutralBackground2,
    position: "sticky",
    top: 0,
    zIndex: 1,
  },
  th: {
    ...shorthands.padding("8px", "10px"),
    textAlign: "left",
    fontWeight: 600,
    fontSize: "12px",
    color: tokens.colorNeutralForeground3,
    whiteSpace: "nowrap",
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  thSortable: {
    cursor: "pointer",
    userSelect: "none",
    ":hover": {
      color: tokens.colorNeutralForeground1,
      backgroundColor: tokens.colorNeutralBackground3,
    },
  },
  thActive: {
    color: tokens.colorBrandForeground1,
  },
  thCheck: {
    width: "36px",
    ...shorthands.padding("8px", "8px"),
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  tr: {
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  trSelected: {
    backgroundColor: tokens.colorBrandBackground2,
    ":hover": {
      backgroundColor: tokens.colorBrandBackground2Hover,
    },
  },
  td: {
    ...shorthands.padding("4px", "6px"),
    verticalAlign: "middle",
    maxWidth: "220px",
  },
  tdCheck: {
    ...shorthands.padding("4px", "8px"),
    verticalAlign: "middle",
    width: "36px",
  },
  tdReadonly: {
    color: tokens.colorNeutralForeground3,
    fontSize: "12px",
  },
  savingIndicator: {
    display: "inline-block",
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: tokens.colorBrandBackground,
    marginLeft: "4px",
    verticalAlign: "middle",
  },
  successTick: {
    color: tokens.colorStatusSuccessForeground1,
    marginLeft: "4px",
    fontSize: "11px",
  },
});

// ─── Sort helpers ─────────────────────────────────────────────────────────────

type SortDir = "asc" | "desc";

interface SortConfig {
  key: string;
  dir: SortDir;
}

function useSortFilter() {
  const [filterText, setFilterText] = useState("");
  const [sort, setSort] = useState<SortConfig | null>(null);

  const toggleSort = (key: string) => {
    setSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  };

  return { filterText, setFilterText, sort, toggleSort };
}

function sortRows<T extends Record<string, unknown>>(rows: T[], sort: SortConfig | null): T[] {
  if (!sort) return rows;
  return [...rows].sort((a, b) => {
    const av = String(a[sort.key] ?? "").toLowerCase();
    const bv = String(b[sort.key] ?? "").toLowerCase();
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sort.dir === "asc" ? cmp : -cmp;
  });
}

function filterRows<T extends Record<string, unknown>>(rows: T[], text: string, getSearchStr: (row: T) => string): T[] {
  if (!text.trim()) return rows;
  const q = text.trim().toLowerCase();
  return rows.filter((r) => getSearchStr(r).toLowerCase().includes(q));
}

// ─── SortableHeader ───────────────────────────────────────────────────────────

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  sort: SortConfig | null;
  onSort: (key: string) => void;
  className?: string;
}

function SortableHeader({ label, sortKey, sort, onSort, className }: SortableHeaderProps) {
  const s = useStyles();
  const isActive = sort?.key === sortKey;
  const arrow = isActive ? (sort!.dir === "asc" ? " ↑" : " ↓") : " ↕";

  return (
    <th
      className={mergeClasses(s.th, s.thSortable, isActive ? s.thActive : undefined, className)}
      onClick={() => onSort(sortKey)}
      aria-sort={isActive ? (sort!.dir === "asc" ? "ascending" : "descending") : "none"}
      title={`Sort by ${label}`}
    >
      {label}
      <span style={{ opacity: isActive ? 1 : 0.35, fontSize: "10px", marginLeft: "2px" }}>{arrow}</span>
    </th>
  );
}

// ─── EditableCell ─────────────────────────────────────────────────────────────

type CellSaveState = "idle" | "saving" | "saved";

interface EditableCellProps {
  value: string;
  type?: "text" | "date" | "select";
  options?: readonly string[];
  readonly?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSave?: (value: string) => Promise<any>;
}

function EditableCell({ value, type = "text", options, readonly, onSave }: EditableCellProps) {
  const s = useStyles();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saveState, setSaveState] = useState<CellSaveState>("idle");

  const commit = useCallback(
    async (newVal: string) => {
      setEditing(false);
      if (newVal === value || !onSave) return;
      setSaveState("saving");
      try {
        await onSave(newVal);
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1500);
      } catch {
        setSaveState("idle");
      }
    },
    [value, onSave]
  );

  if (readonly) {
    return (
      <td className={mergeClasses(s.td, s.tdReadonly)}>
        <span title={value}>{value || "—"}</span>
      </td>
    );
  }

  const cellStyle: React.CSSProperties = {
    cursor: "text",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    display: "block",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    border: "none",
    outline: "none",
    borderBottom: `1.5px solid ${tokens.colorBrandBackground}`,
    borderRadius: "2px 2px 0 0",
    background: "rgba(0,120,212,0.06)",
    padding: "1px 2px",
    font: "inherit",
    fontSize: "inherit",
    color: "inherit",
  };

  return (
    <td className={s.td}>
      <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
        {editing ? (
          type === "select" && options ? (
            <select
              value={draft}
              autoFocus
              style={{ ...inputStyle, cursor: "pointer" }}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => void commit(draft)}
              onClick={(e) => e.stopPropagation()}
            >
              {options.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          ) : (
            <input
              autoFocus
              type={type}
              value={draft}
              style={inputStyle}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => void commit(draft)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); void commit(draft); }
                if (e.key === "Escape") { setDraft(value); setEditing(false); }
              }}
            />
          )
        ) : (
          <span
            title={value || "Click to edit"}
            style={cellStyle}
            onClick={(e) => {
              e.stopPropagation();
              setDraft(value);
              setEditing(true);
            }}
          >
            {value || <span style={{ color: tokens.colorNeutralForeground4 }}>—</span>}
          </span>
        )}
        {saveState === "saving" && <span className={s.savingIndicator} title="Saving…" />}
        {saveState === "saved" && <span className={s.successTick}>✓</span>}
      </div>
    </td>
  );
}

// ─── PersonPickerCell ─────────────────────────────────────────────────────────

interface PersonPickerCellProps {
  value: PersonRef;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSave?: (person: PersonRef) => Promise<any>;
}

function PersonPickerCell({ value, onSave }: PersonPickerCellProps) {
  const s = useStyles();
  const [editing, setEditing] = useState(false);
  const [saveState, setSaveState] = useState<CellSaveState>("idle");

  /**
   * Ref always holds the latest PersonRef emitted by PeoplePicker's onChange.
   * Using a ref (not state) avoids stale-closure problems inside setTimeout
   * callbacks — a ref read at execution time always sees the latest value,
   * regardless of when the closure was created.
   */
  const latestRef = useRef<PersonRef>(value);

  // Keep the ref in sync with the parent value whenever we're not editing
  useEffect(() => {
    if (!editing) latestRef.current = value;
  }, [value, editing]);

  const displayValue = personName(value);

  const valueRef = useRef(value);
  valueRef.current = value;

  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const commit = useCallback(async (person: PersonRef) => {
    setEditing(false);
    const current = valueRef.current;
    const unchanged =
      person.name === current.name &&
      person.email === current.email &&
      person.corpId === current.corpId;
    if (unchanged || !onSaveRef.current) return;
    setSaveState("saving");
    try {
      await onSaveRef.current(person);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1500);
    } catch {
      setSaveState("idle");
    }
  }, []); // stable — reads values via refs, no closure over props

  /**
   * Wrapper div's onBlur fires when focus leaves the entire picker area.
   * We wait 250 ms so PeoplePicker's own free-text onChange (delayed 150 ms
   * by its internal setTimeout) has already updated latestRef.current before
   * we read it and commit.
   */
  const handleWrapperBlur = useCallback(() => {
    setTimeout(() => void commit(latestRef.current), 250);
  }, [commit]);

  const cellStyle: React.CSSProperties = {
    cursor: "text",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    display: "block",
  };

  return (
    <td className={s.td} onClick={(e) => e.stopPropagation()}>
      <div style={{ display: "flex", alignItems: "center", minWidth: 0, position: "relative" }}>
        {editing ? (
          <div style={{ width: "100%", minWidth: 160 }} onBlur={handleWrapperBlur}>
            <PeoplePicker
              value={latestRef.current}
              onChange={(person) => {
                // Always update the ref synchronously — no stale closure risk
                latestRef.current = person;
              }}
              placeholder="Search people…"
            />
          </div>
        ) : (
          <span
            title={displayValue || "Click to edit"}
            style={cellStyle}
            onClick={() => {
              latestRef.current = value;
              setEditing(true);
            }}
          >
            {displayValue || <span style={{ color: tokens.colorNeutralForeground4 }}>—</span>}
          </span>
        )}
        {saveState === "saving" && <span className={s.savingIndicator} title="Saving…" />}
        {saveState === "saved" && <span className={s.successTick}>✓</span>}
      </div>
    </td>
  );
}

// ─── Bulk action toolbar ──────────────────────────────────────────────────────

interface BulkToolbarProps {
  count: number;
  onClearSelection: () => void;
  actions: Array<{ label: string; variant?: "danger"; onClick: () => void }>;
}

function BulkToolbar({ count, onClearSelection, actions }: BulkToolbarProps) {
  const s = useStyles();
  return (
    <div className={s.toolbar}>
      <Text className={s.toolbarLabel}>{count} selected</Text>
      {actions.map((a) => (
        <Button
          key={a.label}
          size="small"
          appearance={a.variant === "danger" ? "primary" : "secondary"}
          style={
            a.variant === "danger"
              ? { backgroundColor: tokens.colorStatusDangerBackground3, color: "#fff", border: "none" }
              : undefined
          }
          icon={a.variant === "danger" ? <Icon name="trash" size={14} /> : undefined}
          onClick={a.onClick}
        >
          {a.label}
        </Button>
      ))}
      <Button size="small" appearance="subtle" onClick={onClearSelection}>
        Clear selection
      </Button>
    </div>
  );
}

// ─── Projects table ───────────────────────────────────────────────────────────

function ProjectsTable({ data }: { data: PortfolioData }) {
  const s = useStyles();
  const actions = usePortfolioActions();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<Status | "">("");
  const [bulkStage, setBulkStage] = useState<Stage | "">("");
  const [deleting, setDeleting] = useState(false);
  const { filterText, setFilterText, sort, toggleSort } = useSortFilter();

  const projects = data.projects;

  // Build sortable record shape (flatten owner/sponsor names)
  const rows = useMemo(
    () =>
      projects.map((p) => ({
        ...p,
        _ownerName: typeof p.owner === "object" ? p.owner.name : String(p.owner ?? ""),
        _sponsorName: typeof p.sponsor === "object" ? p.sponsor.name : String(p.sponsor ?? ""),
      })),
    [projects]
  );

  const visibleRows = useMemo(() => {
    const filtered = filterRows(rows, filterText, (r) =>
      [r.title, r.abbrev, r.portfolio, r.productArea, r._ownerName, r._sponsorName,
       r.stage, r.status, r.startDate, r.endDate, r.fundingSource, r.nOrPCode].join(" ")
    );
    return sortRows(filtered, sort);
  }, [rows, filterText, sort]);

  const allChecked = visibleRows.length > 0 && visibleRows.every((r) => selected.has(r.id));

  const toggleAll = () =>
    setSelected(
      allChecked
        ? new Set([...selected].filter((id) => !visibleRows.find((r) => r.id === id)))
        : new Set([...selected, ...visibleRows.map((r) => r.id)])
    );
  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${selected.size} project(s)? This cannot be undone.`)) return;
    setDeleting(true);
    for (const id of selected) {
      await actions.deleteProject(id);
    }
    setSelected(new Set());
    setDeleting(false);
  };

  const handleBulkStatus = async () => {
    if (!bulkStatus) return;
    for (const id of selected) {
      await actions.updateProject({ id, status: bulkStatus as Status });
    }
    setSelected(new Set());
    setBulkStatus("");
  };

  const handleBulkStage = async () => {
    if (!bulkStage) return;
    for (const id of selected) {
      await actions.updateProject({ id, stage: bulkStage as Stage });
    }
    setSelected(new Set());
    setBulkStage("");
  };

  return (
    <>
      {selected.size > 0 && (
        <BulkToolbar
          count={selected.size}
          onClearSelection={() => setSelected(new Set())}
          actions={[
            ...(bulkStatus
              ? [{ label: `Set Status: ${bulkStatus}`, onClick: handleBulkStatus }]
              : []),
            ...(bulkStage
              ? [{ label: `Set Stage: ${bulkStage}`, onClick: handleBulkStage }]
              : []),
            { label: deleting ? "Deleting…" : "Delete selected", variant: "danger" as const, onClick: handleDelete },
          ]}
        />
      )}
      {selected.size > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as Status | "")}
            style={{ fontSize: 13, padding: "4px 8px", borderRadius: 6, border: `1px solid ${tokens.colorNeutralStroke2}` }}
          >
            <option value="">Bulk set status…</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={bulkStage}
            onChange={(e) => setBulkStage(e.target.value as Stage | "")}
            style={{ fontSize: 13, padding: "4px 8px", borderRadius: 6, border: `1px solid ${tokens.colorNeutralStroke2}` }}
          >
            <option value="">Bulk set stage…</option>
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {/* Filter bar */}
      <div className={s.filterBar}>
        <input
          className={s.filterInput}
          type="search"
          placeholder="Filter projects…"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          aria-label="Filter projects"
        />
        <span className={s.filterCount}>
          {visibleRows.length} / {projects.length}
        </span>
        {filterText && (
          <Button size="small" appearance="subtle" onClick={() => setFilterText("")}>
            Clear
          </Button>
        )}
      </div>

      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead className={s.thead}>
            <tr>
              <th className={s.thCheck}>
                <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" />
              </th>
              <SortableHeader label="Title" sortKey="title" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Abbrev" sortKey="abbrev" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Portfolio" sortKey="portfolio" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Product Area" sortKey="productArea" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Owner" sortKey="_ownerName" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Sponsor" sortKey="_sponsorName" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Stage" sortKey="stage" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Status" sortKey="status" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Start" sortKey="startDate" sort={sort} onSort={toggleSort} />
              <SortableHeader label="End" sortKey="endDate" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Funding Source" sortKey="fundingSource" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Code" sortKey="nOrPCode" sort={sort} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((p) => (
              <tr
                key={p.id}
                className={mergeClasses(s.tr, selected.has(p.id) && s.trSelected)}
                onClick={() => toggle(p.id)}
              >
                <td className={s.tdCheck} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    aria-label={`Select ${p.title}`}
                  />
                </td>
                <EditableCell
                  value={p.title}
                  onSave={(v) => actions.updateProject({ id: p.id, title: v })}
                />
                <EditableCell
                  value={p.abbrev}
                  onSave={(v) => actions.updateProject({ id: p.id, abbrev: v })}
                />
                <EditableCell
                  value={p.portfolio}
                  type="select"
                  options={PORTFOLIOS}
                  onSave={(v) => actions.updateProject({ id: p.id, portfolio: v })}
                />
                <EditableCell
                  value={p.productArea}
                  onSave={(v) => actions.updateProject({ id: p.id, productArea: v })}
                />
                <PersonPickerCell
                  value={typeof p.owner === "object" ? p.owner : { name: String(p.owner ?? ""), email: "", corpId: "" }}
                  onSave={(person) => actions.updateProject({ id: p.id, owner: person })}
                />
                <PersonPickerCell
                  value={typeof p.sponsor === "object" ? p.sponsor : { name: String(p.sponsor ?? ""), email: "", corpId: "" }}
                  onSave={(person) => actions.updateProject({ id: p.id, sponsor: person })}
                />
                <EditableCell
                  value={p.stage}
                  type="select"
                  options={STAGES}
                  onSave={(v) => actions.updateProject({ id: p.id, stage: v as Stage })}
                />
                <EditableCell
                  value={p.status}
                  type="select"
                  options={STATUSES}
                  onSave={(v) => actions.updateProject({ id: p.id, status: v as Status })}
                />
                <EditableCell
                  value={p.startDate}
                  type="date"
                  onSave={(v) => actions.updateProject({ id: p.id, startDate: v })}
                />
                <EditableCell
                  value={p.endDate}
                  type="date"
                  onSave={(v) => actions.updateProject({ id: p.id, endDate: v })}
                />
                <EditableCell
                  value={p.fundingSource}
                  onSave={(v) => actions.updateProject({ id: p.id, fundingSource: v })}
                />
                <EditableCell
                  value={p.nOrPCode}
                  onSave={(v) => actions.updateProject({ id: p.id, nOrPCode: v })}
                />
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={13} style={{ textAlign: "center", padding: "24px", color: tokens.colorNeutralForeground3 }}>
                  No projects match "{filterText}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── Engagements table ────────────────────────────────────────────────────────

function EngagementsTable({ data }: { data: PortfolioData }) {
  const s = useStyles();
  const actions = usePortfolioActions();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<EngagementStatus | "">("");
  const [bulkStage, setBulkStage] = useState<EngagementStage | "">("");
  const [deleting, setDeleting] = useState(false);
  const { filterText, setFilterText, sort, toggleSort } = useSortFilter();

  const engagements = data.engagements;
  const projectMap = new Map(data.projects.map((p) => [p.id, p.title]));

  const rows = useMemo(
    () =>
      engagements.map((e) => ({
        ...e,
        _projectTitle: projectMap.get(e.initiativeId) ?? e.initiativeId,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [engagements, data.projects]
  );

  const visibleRows = useMemo(() => {
    const filtered = filterRows(rows, filterText, (r) =>
      [r._projectTitle, r.site, r.workArea, r.team, r.stage, r.status,
       r.startDate, r.endDate, r.purpose, r.notes ?? ""].join(" ")
    );
    return sortRows(filtered, sort);
  }, [rows, filterText, sort]);

  const allChecked = visibleRows.length > 0 && visibleRows.every((r) => selected.has(r.id));

  const toggleAll = () =>
    setSelected(
      allChecked
        ? new Set([...selected].filter((id) => !visibleRows.find((r) => r.id === id)))
        : new Set([...selected, ...visibleRows.map((r) => r.id)])
    );
  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${selected.size} engagement(s)? This cannot be undone.`)) return;
    setDeleting(true);
    for (const id of selected) {
      await actions.deleteEngagement(id);
    }
    setSelected(new Set());
    setDeleting(false);
  };

  const handleBulkStatus = async () => {
    if (!bulkStatus) return;
    const engToUpdate = engagements.filter((e) => selected.has(e.id));
    for (const e of engToUpdate) {
      await actions.saveEngagement({
        id: e.id,
        initiativeId: e.initiativeId,
        site: e.site,
        workArea: e.workArea,
        team: e.team,
        stage: e.stage,
        status: bulkStatus as EngagementStatus,
        startDate: e.startDate,
        endDate: e.endDate,
        purpose: e.purpose,
        notes: e.notes,
      });
    }
    setSelected(new Set());
    setBulkStatus("");
  };

  const handleBulkStage = async () => {
    if (!bulkStage) return;
    const engToUpdate = engagements.filter((e) => selected.has(e.id));
    for (const e of engToUpdate) {
      await actions.saveEngagement({
        id: e.id,
        initiativeId: e.initiativeId,
        site: e.site,
        workArea: e.workArea,
        team: e.team,
        stage: bulkStage as EngagementStage,
        status: e.status,
        startDate: e.startDate,
        endDate: e.endDate,
        purpose: e.purpose,
        notes: e.notes,
      });
    }
    setSelected(new Set());
    setBulkStage("");
  };

  const saveEngagement = (e: Engagement, patch: Partial<Engagement>) =>
    actions.saveEngagement({
      id: e.id,
      initiativeId: patch.initiativeId ?? e.initiativeId,
      site: (patch.site ?? e.site) as Site,
      workArea: (patch.workArea ?? e.workArea) as WorkArea,
      team: patch.team ?? e.team,
      stage: (patch.stage ?? e.stage) as EngagementStage,
      status: (patch.status ?? e.status) as EngagementStatus,
      startDate: patch.startDate ?? e.startDate,
      endDate: patch.endDate ?? e.endDate,
      purpose: patch.purpose ?? e.purpose,
      notes: patch.notes ?? e.notes,
    });

  return (
    <>
      {selected.size > 0 && (
        <BulkToolbar
          count={selected.size}
          onClearSelection={() => setSelected(new Set())}
          actions={[
            ...(bulkStatus
              ? [{ label: `Set Status: ${bulkStatus}`, onClick: handleBulkStatus }]
              : []),
            ...(bulkStage
              ? [{ label: `Set Stage: ${bulkStage}`, onClick: handleBulkStage }]
              : []),
            { label: deleting ? "Deleting…" : "Delete selected", variant: "danger" as const, onClick: handleDelete },
          ]}
        />
      )}
      {selected.size > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as EngagementStatus | "")}
            style={{ fontSize: 13, padding: "4px 8px", borderRadius: 6, border: `1px solid ${tokens.colorNeutralStroke2}` }}
          >
            <option value="">Bulk set status…</option>
            {ENGAGEMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={bulkStage}
            onChange={(e) => setBulkStage(e.target.value as EngagementStage | "")}
            style={{ fontSize: 13, padding: "4px 8px", borderRadius: 6, border: `1px solid ${tokens.colorNeutralStroke2}` }}
          >
            <option value="">Bulk set stage…</option>
            {ENGAGEMENT_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {/* Filter bar */}
      <div className={s.filterBar}>
        <input
          className={s.filterInput}
          type="search"
          placeholder="Filter engagements…"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          aria-label="Filter engagements"
        />
        <span className={s.filterCount}>
          {visibleRows.length} / {engagements.length}
        </span>
        {filterText && (
          <Button size="small" appearance="subtle" onClick={() => setFilterText("")}>
            Clear
          </Button>
        )}
      </div>

      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead className={s.thead}>
            <tr>
              <th className={s.thCheck}>
                <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" />
              </th>
              <SortableHeader label="Project" sortKey="_projectTitle" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Site" sortKey="site" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Work Area" sortKey="workArea" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Team" sortKey="team" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Stage" sortKey="stage" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Status" sortKey="status" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Start" sortKey="startDate" sort={sort} onSort={toggleSort} />
              <SortableHeader label="End" sortKey="endDate" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Purpose" sortKey="purpose" sort={sort} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((e) => (
              <tr
                key={e.id}
                className={mergeClasses(s.tr, selected.has(e.id) && s.trSelected)}
                onClick={() => toggle(e.id)}
              >
                <td className={s.tdCheck} onClick={(ev) => ev.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(e.id)}
                    onChange={() => toggle(e.id)}
                    aria-label={`Select engagement ${e.id}`}
                  />
                </td>
                {/* Project — read-only FK display */}
                <td className={mergeClasses(s.td, s.tdReadonly)}>
                  <span title={e.initiativeId}>{e._projectTitle}</span>
                </td>
                <EditableCell
                  value={e.site}
                  type="select"
                  options={SITES}
                  onSave={(v) => saveEngagement(e, { site: v as Site })}
                />
                <EditableCell
                  value={e.workArea}
                  type="select"
                  options={WORK_AREAS}
                  onSave={(v) => saveEngagement(e, { workArea: v as WorkArea })}
                />
                <EditableCell
                  value={e.team}
                  onSave={(v) => saveEngagement(e, { team: v })}
                />
                <EditableCell
                  value={e.stage}
                  type="select"
                  options={ENGAGEMENT_STAGES}
                  onSave={(v) => saveEngagement(e, { stage: v as EngagementStage })}
                />
                <EditableCell
                  value={e.status}
                  type="select"
                  options={ENGAGEMENT_STATUSES}
                  onSave={(v) => saveEngagement(e, { status: v as EngagementStatus })}
                />
                <EditableCell
                  value={e.startDate}
                  type="date"
                  onSave={(v) => saveEngagement(e, { startDate: v })}
                />
                <EditableCell
                  value={e.endDate}
                  type="date"
                  onSave={(v) => saveEngagement(e, { endDate: v })}
                />
                <EditableCell
                  value={e.purpose}
                  onSave={(v) => saveEngagement(e, { purpose: v })}
                />
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: "24px", color: tokens.colorNeutralForeground3 }}>
                  No engagements match "{filterText}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── Milestones table ─────────────────────────────────────────────────────────

function MilestonesTable({ data }: { data: PortfolioData }) {
  const s = useStyles();
  const actions = usePortfolioActions();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<MilestoneStatus | "">("");
  const [deleting, setDeleting] = useState(false);
  const { filterText, setFilterText, sort, toggleSort } = useSortFilter();

  const milestones = data.milestones;
  const projectMap = new Map(data.projects.map((p) => [p.id, p.title]));

  const rows = useMemo(
    () =>
      milestones.map((m) => ({
        ...m,
        _projectTitle: projectMap.get(m.projectId) ?? m.projectId,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [milestones, data.projects]
  );

  const visibleRows = useMemo(() => {
    const filtered = filterRows(rows, filterText, (r) =>
      [r._projectTitle, r.name, r.date, r.status, r.notes ?? ""].join(" ")
    );
    return sortRows(filtered, sort);
  }, [rows, filterText, sort]);

  const allChecked = visibleRows.length > 0 && visibleRows.every((r) => selected.has(r.id));

  const toggleAll = () =>
    setSelected(
      allChecked
        ? new Set([...selected].filter((id) => !visibleRows.find((r) => r.id === id)))
        : new Set([...selected, ...visibleRows.map((r) => r.id)])
    );
  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${selected.size} milestone(s)? This cannot be undone.`)) return;
    setDeleting(true);
    for (const id of selected) {
      await actions.deleteMilestone(id);
    }
    setSelected(new Set());
    setDeleting(false);
  };

  const handleBulkStatus = async () => {
    if (!bulkStatus) return;
    const toUpdate = milestones.filter((m) => selected.has(m.id));
    for (const m of toUpdate) {
      await actions.saveMilestone({
        id: m.id,
        projectId: m.projectId,
        name: m.name,
        date: m.date,
        status: bulkStatus as MilestoneStatus,
        notes: m.notes,
      });
    }
    setSelected(new Set());
    setBulkStatus("");
  };

  const saveMilestone = (m: Milestone, patch: Partial<Milestone>) =>
    actions.saveMilestone({
      id: m.id,
      projectId: m.projectId,
      name: patch.name ?? m.name,
      date: patch.date ?? m.date,
      status: (patch.status ?? m.status) as MilestoneStatus,
      notes: patch.notes ?? m.notes,
    });

  return (
    <>
      {selected.size > 0 && (
        <BulkToolbar
          count={selected.size}
          onClearSelection={() => setSelected(new Set())}
          actions={[
            ...(bulkStatus
              ? [{ label: `Set Status: ${bulkStatus}`, onClick: handleBulkStatus }]
              : []),
            { label: deleting ? "Deleting…" : "Delete selected", variant: "danger" as const, onClick: handleDelete },
          ]}
        />
      )}
      {selected.size > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as MilestoneStatus | "")}
            style={{ fontSize: 13, padding: "4px 8px", borderRadius: 6, border: `1px solid ${tokens.colorNeutralStroke2}` }}
          >
            <option value="">Bulk set status…</option>
            {MILESTONE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {/* Filter bar */}
      <div className={s.filterBar}>
        <input
          className={s.filterInput}
          type="search"
          placeholder="Filter milestones…"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          aria-label="Filter milestones"
        />
        <span className={s.filterCount}>
          {visibleRows.length} / {milestones.length}
        </span>
        {filterText && (
          <Button size="small" appearance="subtle" onClick={() => setFilterText("")}>
            Clear
          </Button>
        )}
      </div>

      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead className={s.thead}>
            <tr>
              <th className={s.thCheck}>
                <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" />
              </th>
              <SortableHeader label="Project" sortKey="_projectTitle" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Milestone Name" sortKey="name" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Date" sortKey="date" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Status" sortKey="status" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Notes" sortKey="notes" sort={sort} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((m) => (
              <tr
                key={m.id}
                className={mergeClasses(s.tr, selected.has(m.id) && s.trSelected)}
                onClick={() => toggle(m.id)}
              >
                <td className={s.tdCheck} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(m.id)}
                    onChange={() => toggle(m.id)}
                    aria-label={`Select milestone ${m.name}`}
                  />
                </td>
                {/* Project — read-only FK display */}
                <td className={mergeClasses(s.td, s.tdReadonly)}>
                  <span title={m.projectId}>{m._projectTitle}</span>
                </td>
                <EditableCell
                  value={m.name}
                  onSave={(v) => saveMilestone(m, { name: v })}
                />
                <EditableCell
                  value={m.date}
                  type="date"
                  onSave={(v) => saveMilestone(m, { date: v })}
                />
                <EditableCell
                  value={m.status}
                  type="select"
                  options={MILESTONE_STATUSES}
                  onSave={(v) => saveMilestone(m, { status: v as MilestoneStatus })}
                />
                <EditableCell
                  value={m.notes}
                  onSave={(v) => saveMilestone(m, { notes: v })}
                />
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "24px", color: tokens.colorNeutralForeground3 }}>
                  No milestones match "{filterText}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── Quarterly Milestones table ───────────────────────────────────────────────

const EMPTY_QM_DRAFT: QuarterlyMilestoneInput = {
  portfolioArea: QUARTERLY_PORTFOLIO_AREAS[0],
  subGroup: "",
  initiative: "",
  initiativeDescription: "",
  milestone: "",
  targetDate: "",
  dateLabel: "",
  notes: "",
};

function QuarterlyMilestonesTable() {
  const s = useStyles();
  const [milestones, setMilestones] = useState<QuarterlyMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const { filterText, setFilterText, sort, toggleSort } = useSortFilter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [draft, setDraft] = useState<QuarterlyMilestoneInput>(EMPTY_QM_DRAFT);
  const [addSaving, setAddSaving] = useState(false);

  useEffect(() => {
    repository
      .getQuarterlyMilestones()
      .then((data) => { setMilestones(data); setLoading(false); })
      .catch((err: unknown) => {
        setFetchError(err instanceof Error ? err.message : "Failed to load quarterly milestones.");
        setLoading(false);
      });
  }, []);

  const rows = useMemo(
    () => milestones as unknown as Record<string, unknown>[],
    [milestones]
  );

  const visibleRows = useMemo(() => {
    const filtered = filterRows(rows, filterText, (r) =>
      [r.portfolioArea, r.subGroup ?? "", r.initiative, r.milestone,
       r.targetDate, r.notes ?? ""].join(" ")
    );
    return sortRows(filtered, sort) as unknown as QuarterlyMilestone[];
  }, [rows, filterText, sort]);

  const allChecked =
    visibleRows.length > 0 && visibleRows.every((r) => selected.has(r.id));

  const toggleAll = () =>
    setSelected(
      allChecked
        ? new Set([...selected].filter((id) => !visibleRows.find((r) => r.id === id)))
        : new Set([...selected, ...visibleRows.map((r) => r.id)])
    );
  const toggleRow = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${selected.size} quarterly milestone(s)? This cannot be undone.`)) return;
    setDeleting(true);
    for (const id of selected) {
      await repository.deleteQuarterlyMilestone(id);
      setMilestones((prev) => prev.filter((m) => m.id !== id));
    }
    setSelected(new Set());
    setDeleting(false);
  };

  const saveCell = useCallback(
    async (m: QuarterlyMilestone, patch: Partial<QuarterlyMilestone>) => {
      const updated = await repository.upsertQuarterlyMilestone({
        id:                    m.id,
        portfolioArea:         (patch.portfolioArea         ?? m.portfolioArea) as PortfolioArea,
        subGroup:              patch.subGroup               ?? m.subGroup,
        initiative:            patch.initiative             ?? m.initiative,
        initiativeDescription: patch.initiativeDescription  ?? m.initiativeDescription,
        milestone:             patch.milestone              ?? m.milestone,
        targetDate:            patch.targetDate             ?? m.targetDate,
        dateLabel:             patch.dateLabel              ?? m.dateLabel,
        notes:                 patch.notes                  ?? m.notes,
      });
      setMilestones((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    },
    []
  );

  const handleAddSave = async () => {
    if (!draft.initiative.trim() || !draft.milestone.trim()) return;
    setAddSaving(true);
    try {
      const created = await repository.upsertQuarterlyMilestone(draft);
      setMilestones((prev) => [...prev, created]);
      setShowAddForm(false);
      setDraft(EMPTY_QM_DRAFT);
    } finally {
      setAddSaving(false);
    }
  };

  const setDraftField = (key: keyof QuarterlyMilestoneInput, value: string) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  if (loading) {
    return <Text style={{ padding: "24px 0", color: tokens.colorNeutralForeground3 }}>Loading quarterly milestones…</Text>;
  }

  if (fetchError) {
    return (
      <div style={{
        padding: "16px", marginTop: 12,
        background: tokens.colorStatusDangerBackground1,
        border: `1px solid ${tokens.colorStatusDangerBorder1}`,
        borderRadius: tokens.borderRadiusMedium,
        color: tokens.colorStatusDangerForeground1,
        fontSize: 13,
      }}>
        <strong>Failed to load quarterly milestones:</strong> {fetchError}
        <br />
        <span style={{ opacity: 0.8 }}>
          {fetchError.includes("Functions backend")
            ? "Set VITE_USE_FUNCTIONS=true and deploy the Azure Functions host to use this feature with a live backend."
            : "Check the browser console for details."}
        </span>
      </div>
    );
  }

  return (
    <>
      {selected.size > 0 && (
        <BulkToolbar
          count={selected.size}
          onClearSelection={() => setSelected(new Set())}
          actions={[
            { label: deleting ? "Deleting…" : "Delete selected", variant: "danger" as const, onClick: handleDelete },
          ]}
        />
      )}

      <div className={s.filterBar}>
        <input
          className={s.filterInput}
          type="search"
          placeholder="Filter quarterly milestones…"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          aria-label="Filter quarterly milestones"
        />
        <span className={s.filterCount}>
          {visibleRows.length} / {milestones.length}
        </span>
        {filterText && (
          <Button size="small" appearance="subtle" onClick={() => setFilterText("")}>
            Clear
          </Button>
        )}
        <Button
          size="small"
          appearance="primary"
          icon={<Icon name="add" size={14} />}
          onClick={() => setShowAddForm(true)}
          disabled={showAddForm}
        >
          Add milestone
        </Button>
      </div>

      <div className={s.tableWrap}>
        <table className={s.table} style={{ minWidth: 1100 }}>
          <thead className={s.thead}>
            <tr>
              <th className={s.thCheck}>
                <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" />
              </th>
              <SortableHeader label="Portfolio Area"   sortKey="portfolioArea"         sort={sort} onSort={toggleSort} />
              <SortableHeader label="Sub-group"        sortKey="subGroup"              sort={sort} onSort={toggleSort} />
              <SortableHeader label="Initiative"       sortKey="initiative"            sort={sort} onSort={toggleSort} />
              <SortableHeader label="Init. Desc."      sortKey="initiativeDescription" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Milestone"        sortKey="milestone"             sort={sort} onSort={toggleSort} />
              <SortableHeader label="Target Date"      sortKey="targetDate"            sort={sort} onSort={toggleSort} />
              <SortableHeader label="Date Label"       sortKey="dateLabel"             sort={sort} onSort={toggleSort} />
              <SortableHeader label="Notes"            sortKey="notes"                 sort={sort} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {/* ── Add-new-row form ── */}
            {showAddForm && (
              <tr style={{ backgroundColor: tokens.colorBrandBackground2 }}>
                <td className={s.tdCheck} />
                <td className={s.td}>
                  <select
                    value={draft.portfolioArea}
                    autoFocus
                    style={{ width: "100%", fontSize: "inherit" }}
                    onChange={(e) => setDraftField("portfolioArea", e.target.value)}
                  >
                    {QUARTERLY_PORTFOLIO_AREAS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </td>
                <td className={s.td}>
                  <input style={{ width: "100%", fontSize: "inherit" }} placeholder="Sub-group…"
                    value={draft.subGroup ?? ""} onChange={(e) => setDraftField("subGroup", e.target.value)} />
                </td>
                <td className={s.td}>
                  <input style={{ width: "100%", fontSize: "inherit" }} placeholder="Initiative *"
                    value={draft.initiative} onChange={(e) => setDraftField("initiative", e.target.value)} />
                </td>
                <td className={s.td}>
                  <input style={{ width: "100%", fontSize: "inherit" }} placeholder="Description…"
                    value={draft.initiativeDescription ?? ""} onChange={(e) => setDraftField("initiativeDescription", e.target.value)} />
                </td>
                <td className={s.td}>
                  <input style={{ width: "100%", fontSize: "inherit" }} placeholder="Milestone *"
                    value={draft.milestone} onChange={(e) => setDraftField("milestone", e.target.value)} />
                </td>
                <td className={s.td}>
                  <input type="date" style={{ width: "100%", fontSize: "inherit" }}
                    value={draft.targetDate} onChange={(e) => setDraftField("targetDate", e.target.value)} />
                </td>
                <td className={s.td}>
                  <input style={{ width: "100%", fontSize: "inherit" }} placeholder="e.g. Q3"
                    value={draft.dateLabel ?? ""} onChange={(e) => setDraftField("dateLabel", e.target.value)} />
                </td>
                <td className={s.td} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input style={{ flex: 1, fontSize: "inherit" }} placeholder="Notes…"
                    value={draft.notes ?? ""} onChange={(e) => setDraftField("notes", e.target.value)} />
                  <Button size="small" appearance="primary" onClick={() => void handleAddSave()} disabled={addSaving || !draft.initiative.trim() || !draft.milestone.trim()}>
                    {addSaving ? "Saving…" : "Save"}
                  </Button>
                  <Button size="small" appearance="subtle" onClick={() => { setShowAddForm(false); setDraft(EMPTY_QM_DRAFT); }}>
                    Cancel
                  </Button>
                </td>
              </tr>
            )}

            {visibleRows.map((m) => (
              <tr
                key={m.id}
                className={mergeClasses(s.tr, selected.has(m.id) && s.trSelected)}
                onClick={() => toggleRow(m.id)}
              >
                <td className={s.tdCheck} onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggleRow(m.id)}
                    aria-label={`Select ${m.milestone}`} />
                </td>
                <EditableCell
                  value={m.portfolioArea}
                  type="select"
                  options={[...QUARTERLY_PORTFOLIO_AREAS]}
                  onSave={(v) => saveCell(m, { portfolioArea: v as PortfolioArea })}
                />
                <EditableCell value={m.subGroup ?? ""}             onSave={(v) => saveCell(m, { subGroup:              v || undefined })} />
                <EditableCell value={m.initiative}                 onSave={(v) => saveCell(m, { initiative:            v })} />
                <EditableCell value={m.initiativeDescription ?? ""} onSave={(v) => saveCell(m, { initiativeDescription: v || undefined })} />
                <EditableCell value={m.milestone}                  onSave={(v) => saveCell(m, { milestone:             v })} />
                <EditableCell value={m.targetDate}   type="date"   onSave={(v) => saveCell(m, { targetDate:            v })} />
                <EditableCell value={m.dateLabel ?? ""}            onSave={(v) => saveCell(m, { dateLabel:             v || undefined })} />
                <EditableCell value={m.notes ?? ""}               onSave={(v) => saveCell(m, { notes:                 v || undefined })} />
              </tr>
            ))}
            {visibleRows.length === 0 && !showAddForm && (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "24px", color: tokens.colorNeutralForeground3 }}>
                  {filterText ? `No milestones match "${filterText}"` : "No quarterly milestones yet — click Add milestone to start."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── Tab switcher ─────────────────────────────────────────────────────────────

type TabId = "projects" | "engagements" | "milestones" | "quarterly-milestones";

const TABS: { id: TabId; label: string; count?: (d: PortfolioData) => number }[] = [
  { id: "projects",              label: "Projects",              count: (d) => d.projects.length },
  { id: "engagements",           label: "Engagements",           count: (d) => d.engagements.length },
  { id: "milestones",            label: "Milestones",            count: (d) => d.milestones.length },
  { id: "quarterly-milestones",  label: "Quarterly Milestones" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

function AdminContent({ data }: { data: PortfolioData }) {
  const s = useStyles();
  const [activeTab, setActiveTab] = useState<TabId>("projects");

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Bulk-edit console"
        subtitle="Click any cell to edit inline. Select rows for bulk actions."
      />

      {/* Tab bar */}
      <div className={s.tabs} role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            className={mergeClasses(s.tab, activeTab === t.id && s.tabActive)}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}{" "}
            {t.count && (
              <span style={{ fontWeight: 400, opacity: 0.7 }}>({t.count(data)})</span>
            )}
          </button>
        ))}
      </div>

      {/* Active table */}
      {activeTab === "projects"             && <ProjectsTable data={data} />}
      {activeTab === "engagements"          && <EngagementsTable data={data} />}
      {activeTab === "milestones"           && <MilestonesTable data={data} />}
      {activeTab === "quarterly-milestones" && <QuarterlyMilestonesTable />}
    </>
  );
}

export function AdminPage(): JSX.Element {
  return <PortfolioGate>{(data) => <AdminContent data={data} />}</PortfolioGate>;
}
