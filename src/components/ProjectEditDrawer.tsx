/**
 * ProjectEditDrawer — slide-in panel for creating or editing a project / initiative.
 *
 * Create mode: open with no `project` prop → blank form, "Create initiative" button.
 * Edit mode:   open with a `project` prop → pre-filled form, "Save changes" button.
 */
import { useState, useEffect, useId } from "react";
import {
  OverlayDrawer,
  DrawerHeader,
  DrawerHeaderTitle,
  DrawerBody,
  Button,
  Field,
  Input,
  Textarea,
  Select,
  Checkbox,
  Divider,
  Text,
  Spinner,
  Badge,
  makeStyles,
  shorthands,
  tokens,
} from "@fluentui/react-components";
import { Icon } from "./Icon";
import { PeoplePicker } from "./PeoplePicker";
import { DependencyPicker } from "./DependencyPicker";
import { resolveDep } from "./DependencyGraph";
import { usePortfolioActions } from "../hooks/usePortfolio";
import type { Project, Site, Stage, Status, PersonRef } from "../types/models";
import { STAGES, STATUSES, PORTFOLIOS, PRODUCT_AREAS, SITES, SITE_NAMES } from "../types/models";

// ─── Styles ─────────────────────────────────────────────────────────────────

const useStyles = makeStyles({
  body: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("4px"),
    paddingBottom: "100px",
  },
  section: {
    marginTop: "12px",
    marginBottom: "4px",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    ...shorthands.gap("12px"),
  },
  footer: {
    position: "sticky",
    bottom: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderTop("1px", "solid", tokens.colorNeutralStroke2),
    ...shorthands.padding("16px", "20px"),
    display: "flex",
    justifyContent: "flex-end",
    ...shorthands.gap("8px"),
    zIndex: 1,
  },
  errorBox: {
    ...shorthands.padding("10px", "14px"),
    ...shorthands.borderRadius("6px"),
    backgroundColor: tokens.colorStatusDangerBackground1,
    color: tokens.colorStatusDangerForeground1,
    marginTop: "8px",
  },
  hint: {
    color: tokens.colorNeutralForeground3,
    fontSize: "11px",
    marginTop: "2px",
  },
  // Sites checkbox grid
  sitesGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    ...shorthands.gap("2px", "8px"),
    marginTop: "6px",
  },
  siteCheck: {
    alignItems: "center",
  },
  // Stage breakdown
  stageSection: {
    marginTop: "12px",
    marginBottom: "4px",
  },
  stageList: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("8px"),
    marginTop: "6px",
  },
  stageRow: {
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
    ...shorthands.borderRadius("8px"),
    ...shorthands.padding("10px", "12px"),
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("8px"),
    backgroundColor: tokens.colorNeutralBackground2,
  },
  stageRowHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stageFields: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    ...shorthands.gap("8px"),
  },
  stageFieldsFull: {
    display: "grid",
    gridTemplateColumns: "1fr",
    ...shorthands.gap("8px"),
  },
  addStageBtn: {
    marginTop: "6px",
    alignSelf: "flex-start",
  },
  emptyStages: {
    color: tokens.colorNeutralForeground3,
    fontSize: "13px",
    ...shorthands.padding("8px", "0"),
  },
});

// ─── Types ───────────────────────────────────────────────────────────────────

type StageRow = {
  key: string;
  label: string;
  stage: string;
  status: string;
  startDate: string;
  endDate: string;
};

type FormState = {
  title: string;
  abbrev: string;
  portfolio: string;
  productArea: string;
  owner: PersonRef;
  sponsor: PersonRef;
  stage: string;
  status: string;
  startDate: string;
  endDate: string;
  summary: string;
  outcomeStatement: string;
  businessValue: string;
  dependencies: string[];
  fundingSource: string;
  nOrPCode: string;
  sites: Site[];
  stageRows: StageRow[];
};

const BLANK_PERSON: PersonRef = { name: "", email: "", corpId: "" };

const BLANK_FORM: FormState = {
  title: "",
  abbrev: "",
  portfolio: PORTFOLIOS[0],
  productArea: PRODUCT_AREAS[0],
  owner: BLANK_PERSON,
  sponsor: BLANK_PERSON,
  stage: "Define",
  status: "On Track",
  startDate: "",
  endDate: "",
  summary: "",
  outcomeStatement: "",
  businessValue: "",
  dependencies: [],
  fundingSource: "",
  nOrPCode: "",
  sites: [],
  stageRows: [],
};

let rowKeyCounter = 0;
const newRowKey = () => `new-${++rowKeyCounter}`;

function projectToForm(p: Project, allProjects: Project[]): FormState {
  const deps = p.dependencies.map((dep) => {
    const resolved = resolveDep(dep, allProjects);
    return resolved ? resolved.id : dep;
  });
  return {
    title: p.title,
    abbrev: p.abbrev,
    portfolio: p.portfolio,
    productArea: p.productArea,
    owner: p.owner,
    sponsor: p.sponsor,
    stage: p.stage,
    status: p.status,
    startDate: p.startDate,
    endDate: p.endDate,
    summary: p.summary,
    outcomeStatement: p.outcomeStatement,
    businessValue: p.businessValue,
    dependencies: deps,
    fundingSource: p.fundingSource,
    nOrPCode: p.nOrPCode ?? "",
    sites: p.sites ?? [],
    stageRows: (p.projectStages ?? []).map((s) => ({
      key: s.id,
      label: s.label,
      stage: s.stage,
      status: s.status,
      startDate: s.startDate,
      endDate: s.endDate,
    })),
  };
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  /** When provided → edit mode. When undefined → create mode. */
  project?: Project;
  allProjects: Project[];
  open: boolean;
  onClose: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ProjectEditDrawer({ project, allProjects, open, onClose }: Props): JSX.Element {
  const s = useStyles();
  const actions = usePortfolioActions();
  const isCreate = !project;
  const uid = useId();

  const [form, setForm] = useState<FormState>(() =>
    project ? projectToForm(project, allProjects) : { ...BLANK_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(project ? projectToForm(project, allProjects) : { ...BLANK_FORM, stageRows: [] });
      setError(null);
    }
  }, [open, project]); // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleSite(site: Site) {
    setForm((prev) => {
      const has = prev.sites.includes(site);
      return {
        ...prev,
        sites: has ? prev.sites.filter((s) => s !== site) : [...prev.sites, site],
      };
    });
  }

  function addStageRow() {
    setForm((prev) => {
      // Default the new row to the next canonical stage in the ladder.
      const nextStage = STAGES[Math.min(prev.stageRows.length, STAGES.length - 1)];
      return {
        ...prev,
        stageRows: [
          ...prev.stageRows,
          {
            key: newRowKey(),
            label: nextStage,
            stage: nextStage,
            status: "On Track",
            startDate: "",
            endDate: "",
          },
        ],
      };
    });
  }

  function updateStageRow(key: string, field: keyof Omit<StageRow, "key">, value: string) {
    setForm((prev) => ({
      ...prev,
      stageRows: prev.stageRows.map((r) => (r.key === key ? { ...r, [field]: value } : r)),
    }));
  }

  function removeStageRow(key: string) {
    setForm((prev) => ({ ...prev, stageRows: prev.stageRows.filter((r) => r.key !== key) }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const stages = form.stageRows.map((r, i) => ({
        id: r.key.startsWith("new-") ? `ps-${Date.now()}-${i}` : r.key,
        projectId: project?.id ?? "",
        label: r.label,
        stage: r.stage as Stage,
        status: r.status as Status,
        startDate: r.startDate,
        endDate: r.endDate,
      }));

      if (isCreate) {
        await actions.createProject({
          title: form.title.trim(),
          abbrev: form.abbrev.trim(),
          portfolio: form.portfolio,
          productArea: form.productArea,
          owner: form.owner,
          sponsor: form.sponsor,
          stage: form.stage as Stage,
          status: form.status as Status,
          startDate: form.startDate,
          endDate: form.endDate,
          summary: form.summary.trim(),
          outcomeStatement: form.outcomeStatement.trim(),
          businessValue: form.businessValue.trim(),
          dependencies: form.dependencies,
          fundingSource: form.fundingSource.trim(),
          nOrPCode: form.nOrPCode.trim(),
          sites: form.sites,
          projectStages: stages.map(({ id: _id, projectId: _pid, ...rest }) => rest),
        });
      } else {
        await actions.updateProject({
          id: project!.id,
          title: form.title.trim() || undefined,
          abbrev: form.abbrev.trim() || undefined,
          portfolio: form.portfolio || undefined,
          productArea: form.productArea || undefined,
          owner: form.owner,
          sponsor: form.sponsor,
          stage: form.stage as Stage,
          status: form.status as Status,
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
          summary: form.summary.trim() || undefined,
          outcomeStatement: form.outcomeStatement.trim() || undefined,
          businessValue: form.businessValue.trim() || undefined,
          dependencies: form.dependencies,
          fundingSource: form.fundingSource.trim() || undefined,
          nOrPCode: form.nOrPCode.trim(),
          sites: form.sites,
          projectStages: stages,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <OverlayDrawer
      position="end"
      size="medium"
      open={open}
      onOpenChange={(_, { open: o }) => { if (!o && !saving) onClose(); }}
    >
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            <Button
              appearance="subtle"
              aria-label="Close"
              icon={<Icon name="close" size={16} />}
              onClick={onClose}
              disabled={saving}
            />
          }
        >
          {isCreate ? "Create project or initiative" : "Edit project"}
        </DrawerHeaderTitle>
      </DrawerHeader>

      <DrawerBody>
        <div className={s.body}>

          {/* ── Identity ─────────────────────────────── */}
          <Text weight="semibold" className={s.section}>Identity</Text>

          <Field label="Title" required>
            <Input
              value={form.title}
              onChange={(_, d) => set("title", d.value)}
              placeholder="Initiative title"
            />
          </Field>

          <div className={s.row}>
            <Field label="Abbreviation">
              <Input
                value={form.abbrev}
                onChange={(_, d) => set("abbrev", d.value)}
                placeholder="e.g. SH"
              />
            </Field>
            <Field label="N or P Code">
              <Input
                value={form.nOrPCode}
                onChange={(_, d) => set("nOrPCode", d.value)}
                placeholder="e.g. N12345"
              />
            </Field>
          </div>

          <div className={s.row}>
            <Field label="Portfolio">
              <Select value={form.portfolio} onChange={(_, d) => set("portfolio", d.value)}>
                {PORTFOLIOS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </Select>
            </Field>
            <Field label="Product area">
              <Select value={form.productArea} onChange={(_, d) => set("productArea", d.value)}>
                {PRODUCT_AREAS.map((pa) => (
                  <option key={pa} value={pa}>{pa}</option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Funding source">
            <Input
              value={form.fundingSource}
              onChange={(_, d) => set("fundingSource", d.value)}
              placeholder="e.g. CAPEX FY26"
            />
          </Field>

          <Divider />

          {/* ── People ───────────────────────────────── */}
          <Text weight="semibold" className={s.section}>People</Text>

          <div className={s.row}>
            <Field label="Owner" required>
              <PeoplePicker
                value={form.owner}
                onChange={(person) => set("owner", person)}
                placeholder="Search by name or email…"
                required
              />
            </Field>
            <Field label="Sponsor">
              <PeoplePicker
                value={form.sponsor}
                onChange={(person) => set("sponsor", person)}
                placeholder="Search by name or email…"
              />
            </Field>
          </div>

          <Divider />

          {/* ── Stage & status ───────────────────────── */}
          <Text weight="semibold" className={s.section}>Stage &amp; status</Text>

          <div className={s.row}>
            <Field label="Overall stage">
              <Select value={form.stage} onChange={(_, d) => set("stage", d.value)}>
                {STAGES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </Select>
            </Field>
            <Field label="Overall status">
              <Select value={form.status} onChange={(_, d) => set("status", d.value)}>
                {STATUSES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </Select>
            </Field>
          </div>

          <Divider />

          {/* ── Timeline ─────────────────────────────── */}
          <Text weight="semibold" className={s.section}>Timeline</Text>

          <div className={s.row}>
            <Field
              label="Start date"
              validationState={
                form.startDate && form.endDate && form.startDate > form.endDate
                  ? "warning"
                  : "none"
              }
              validationMessage={
                form.startDate && form.endDate && form.startDate > form.endDate
                  ? "Start date is after end date"
                  : undefined
              }
            >
              <Input
                type="date"
                value={form.startDate}
                onChange={(_, d) => set("startDate", d.value)}
              />
            </Field>
            <Field
              label="End date"
              validationState={
                form.startDate && form.endDate && form.startDate > form.endDate
                  ? "warning"
                  : "none"
              }
              validationMessage={
                form.startDate && form.endDate && form.startDate > form.endDate
                  ? "End date is before start date"
                  : undefined
              }
            >
              <Input
                type="date"
                value={form.endDate}
                onChange={(_, d) => set("endDate", d.value)}
              />
            </Field>
          </div>

          <Divider />

          {/* ── Sites ────────────────────────────────── */}
          <Text weight="semibold" className={s.section}>Sites</Text>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            Select all sites associated with this initiative.
          </Text>
          <div className={s.sitesGrid}>
            {SITES.map((site) => (
              <Checkbox
                key={site}
                id={`${uid}-site-${site}`}
                className={s.siteCheck}
                checked={form.sites.includes(site)}
                onChange={() => toggleSite(site)}
                label={`${site} — ${SITE_NAMES[site]}`}
              />
            ))}
          </div>

          <Divider />

          {/* ── Stage breakdown ──────────────────────── */}
          <Text weight="semibold" className={s.stageSection}>Stage breakdown</Text>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            Break this initiative into named phases. Each phase gets its own bar on the roadmap.
          </Text>

          <div className={s.stageList}>
            {form.stageRows.length === 0 && (
              <Text className={s.emptyStages}>No phases defined — this initiative shows as a single bar.</Text>
            )}
            {form.stageRows.map((row, idx) => (
              <div key={row.key} className={s.stageRow}>
                <div className={s.stageRowHeader}>
                  <Badge appearance="tint" color="brand" shape="rounded" size="small">
                    Phase {idx + 1}
                  </Badge>
                  <Button
                    appearance="subtle"
                    size="small"
                    icon={<Icon name="close" size={14} />}
                    onClick={() => removeStageRow(row.key)}
                    aria-label="Remove phase"
                  />
                </div>

                <div className={s.stageFieldsFull}>
                  <Field label="Label">
                    <Input
                      size="small"
                      value={row.label}
                      onChange={(_, d) => updateStageRow(row.key, "label", d.value)}
                      placeholder="e.g. Feasability"
                    />
                  </Field>
                </div>

                <div className={s.stageFields}>
                  <Field label="Stage">
                    <Select
                      size="small"
                      value={row.stage}
                      onChange={(_, d) => updateStageRow(row.key, "stage", d.value)}
                    >
                      {STAGES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Status">
                    <Select
                      size="small"
                      value={row.status}
                      onChange={(_, d) => updateStageRow(row.key, "status", d.value)}
                    >
                      {STATUSES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    label="Start date"
                    validationState={
                      row.startDate && row.endDate && row.startDate > row.endDate
                        ? "warning"
                        : row.endDate && !row.startDate
                        ? "warning"
                        : "none"
                    }
                    validationMessage={
                      row.startDate && row.endDate && row.startDate > row.endDate
                        ? "Start date is after end date"
                        : row.endDate && !row.startDate
                        ? "Start date required when end date is set"
                        : undefined
                    }
                  >
                    <Input
                      size="small"
                      type="date"
                      value={row.startDate}
                      onChange={(_, d) => updateStageRow(row.key, "startDate", d.value)}
                    />
                  </Field>
                  <Field
                    label="End date"
                    validationState={
                      row.startDate && row.endDate && row.startDate > row.endDate
                        ? "warning"
                        : row.startDate && !row.endDate
                        ? "warning"
                        : "none"
                    }
                    validationMessage={
                      row.startDate && row.endDate && row.startDate > row.endDate
                        ? "End date is before start date"
                        : row.startDate && !row.endDate
                        ? "End date required when start date is set"
                        : undefined
                    }
                  >
                    <Input
                      size="small"
                      type="date"
                      value={row.endDate}
                      onChange={(_, d) => updateStageRow(row.key, "endDate", d.value)}
                    />
                  </Field>
                </div>
              </div>
            ))}

            <Button
              appearance="outline"
              size="small"
              className={s.addStageBtn}
              icon={<Icon name="add" size={14} />}
              onClick={addStageRow}
            >
              Add phase
            </Button>
          </div>

          <Divider />

          {/* ── Content ──────────────────────────────── */}
          <Text weight="semibold" className={s.section}>Content</Text>

          <Field label="Summary">
            <Textarea
              value={form.summary}
              onChange={(_, d) => set("summary", d.value)}
              rows={3}
              resize="vertical"
              placeholder="Brief description of the initiative"
            />
          </Field>

          <Field label="Outcome statement">
            <Textarea
              value={form.outcomeStatement}
              onChange={(_, d) => set("outcomeStatement", d.value)}
              rows={3}
              resize="vertical"
              placeholder="What does success look like?"
            />
          </Field>

          <Field label="Business value">
            <Textarea
              value={form.businessValue}
              onChange={(_, d) => set("businessValue", d.value)}
              rows={3}
              resize="vertical"
              placeholder="Why does this matter to the business?"
            />
          </Field>

          <Field
            label="Dependencies"
            hint={
              <span className={s.hint}>
                Select other portfolio projects this initiative depends on.
              </span>
            }
          >
            <DependencyPicker
              projects={allProjects}
              currentProjectId={project?.id ?? ""}
              selected={form.dependencies}
              onChange={(ids) => set("dependencies", ids)}
            />
          </Field>

          {error && (
            <div className={s.errorBox}>
              <Text size={300}>{error}</Text>
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className={s.footer}>
          <Button appearance="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            appearance="primary"
            onClick={handleSave}
            disabled={saving || !form.title.trim()}
            icon={saving ? <Spinner size="tiny" /> : undefined}
          >
            {saving ? "Saving…" : isCreate ? "Create initiative" : "Save changes"}
          </Button>
        </div>
      </DrawerBody>
    </OverlayDrawer>
  );
}
