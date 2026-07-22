/**
 * AdminPage — bulk-edit console for all data objects.
 *
 * Three tabs: Projects, Engagements, Milestones.
 * Each tab shows a full-width spreadsheet-style table where clicking any
 * editable cell activates an inline editor. Multiple rows can be selected
 * for bulk status/stage changes or deletion.
 */
import { useState, useCallback } from "react";
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
} from "../types/models";
import {
  STAGES,
  STATUSES,
  MILESTONE_STATUSES,
  SITES,
  WORK_AREAS,
  ENGAGEMENT_STAGES,
  ENGAGEMENT_STATUSES,
} from "../types/models";
import { Icon } from "../components/Icon";

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

  const projects = data.projects;
  const allChecked = projects.length > 0 && selected.size === projects.length;

  const toggleAll = () =>
    setSelected(allChecked ? new Set() : new Set(projects.map((p) => p.id)));
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
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead className={s.thead}>
            <tr>
              <th className={s.thCheck}>
                <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" />
              </th>
              <th className={s.th}>Title</th>
              <th className={s.th}>Abbrev</th>
              <th className={s.th}>Portfolio</th>
              <th className={s.th}>Product Area</th>
              <th className={s.th}>Owner</th>
              <th className={s.th}>Sponsor</th>
              <th className={s.th}>Stage</th>
              <th className={s.th}>Status</th>
              <th className={s.th}>Start</th>
              <th className={s.th}>End</th>
              <th className={s.th}>Funding Source</th>
              <th className={s.th}>Code</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
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
                  onSave={(v) => actions.updateProject({ id: p.id, portfolio: v })}
                />
                <EditableCell
                  value={p.productArea}
                  onSave={(v) => actions.updateProject({ id: p.id, productArea: v })}
                />
                <EditableCell
                  value={p.owner}
                  onSave={(v) => actions.updateProject({ id: p.id, owner: v })}
                />
                <EditableCell
                  value={p.sponsor}
                  onSave={(v) => actions.updateProject({ id: p.id, sponsor: v })}
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
                  value={p.projectCode}
                  onSave={(v) => actions.updateProject({ id: p.id, projectCode: v })}
                />
              </tr>
            ))}
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

  const engagements = data.engagements;
  const projectMap = new Map(data.projects.map((p) => [p.id, p.title]));
  const allChecked = engagements.length > 0 && selected.size === engagements.length;

  const toggleAll = () =>
    setSelected(allChecked ? new Set() : new Set(engagements.map((e) => e.id)));
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
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead className={s.thead}>
            <tr>
              <th className={s.thCheck}>
                <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" />
              </th>
              <th className={s.th}>Project</th>
              <th className={s.th}>Site</th>
              <th className={s.th}>Work Area</th>
              <th className={s.th}>Team</th>
              <th className={s.th}>Stage</th>
              <th className={s.th}>Status</th>
              <th className={s.th}>Start</th>
              <th className={s.th}>End</th>
              <th className={s.th}>Purpose</th>
            </tr>
          </thead>
          <tbody>
            {engagements.map((e) => (
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
                  <span title={e.initiativeId}>{projectMap.get(e.initiativeId) ?? e.initiativeId}</span>
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

  const milestones = data.milestones;
  const projectMap = new Map(data.projects.map((p) => [p.id, p.title]));
  const allChecked = milestones.length > 0 && selected.size === milestones.length;

  const toggleAll = () =>
    setSelected(allChecked ? new Set() : new Set(milestones.map((m) => m.id)));
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
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead className={s.thead}>
            <tr>
              <th className={s.thCheck}>
                <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" />
              </th>
              <th className={s.th}>Project</th>
              <th className={s.th}>Milestone Name</th>
              <th className={s.th}>Date</th>
              <th className={s.th}>Status</th>
              <th className={s.th}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {milestones.map((m) => (
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
                  <span title={m.projectId}>{projectMap.get(m.projectId) ?? m.projectId}</span>
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
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── Tab switcher ─────────────────────────────────────────────────────────────

type TabId = "projects" | "engagements" | "milestones";

const TABS: { id: TabId; label: string; count: (d: PortfolioData) => number }[] = [
  { id: "projects", label: "Projects", count: (d) => d.projects.length },
  { id: "engagements", label: "Engagements", count: (d) => d.engagements.length },
  { id: "milestones", label: "Milestones", count: (d) => d.milestones.length },
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
            <span style={{ fontWeight: 400, opacity: 0.7 }}>({t.count(data)})</span>
          </button>
        ))}
      </div>

      {/* Active table */}
      {activeTab === "projects" && <ProjectsTable data={data} />}
      {activeTab === "engagements" && <EngagementsTable data={data} />}
      {activeTab === "milestones" && <MilestonesTable data={data} />}
    </>
  );
}

export function AdminPage(): JSX.Element {
  return <PortfolioGate>{(data) => <AdminContent data={data} />}</PortfolioGate>;
}
