/**
 * ProjectEditDrawer — slide-in panel for editing all core fields of a project.
 *
 * Opens from the project detail page via the "Edit project" button.
 * Calls portfolioStore.updateProject() on save and closes on success.
 */
import { useState, useEffect } from "react";
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
  Divider,
  Text,
  Spinner,
  makeStyles,
  shorthands,
  tokens,
} from "@fluentui/react-components";
import { Icon } from "./Icon";
import { PeoplePicker } from "./PeoplePicker";
import { DependencyPicker } from "./DependencyPicker";
import { resolveDep } from "./DependencyGraph";
import { usePortfolioActions } from "../hooks/usePortfolio";
import type { Project } from "../types/models";
import { STAGES, STATUSES } from "../types/models";

const useStyles = makeStyles({
  body: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("4px"),
    paddingBottom: "100px", // room for sticky footer
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
});

interface Props {
  project: Project;
  /** All portfolio projects — used to populate the dependency picker. */
  allProjects: Project[];
  open: boolean;
  onClose: () => void;
}

type FormState = {
  title: string;
  abbrev: string;
  portfolio: string;
  productArea: string;
  owner: string;
  sponsor: string;
  stage: string;
  status: string;
  startDate: string;
  endDate: string;
  summary: string;
  outcomeStatement: string;
  businessValue: string;
  /** Array of project IDs (new format). Legacy title strings are converted on load. */
  dependencies: string[];
  fundingSource: string;
  projectCode: string;
};

function projectToForm(p: Project, allProjects: Project[]): FormState {
  // Convert existing dependency entries to IDs (fallback: keep as-is for unknown entries)
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
    projectCode: p.projectCode,
  };
}

export function ProjectEditDrawer({ project, allProjects, open, onClose }: Props): JSX.Element {
  const s = useStyles();
  const actions = usePortfolioActions();

  const [form, setForm] = useState<FormState>(() => projectToForm(project, allProjects));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form whenever the drawer opens or the project changes
  useEffect(() => {
    if (open) {
      setForm(projectToForm(project, allProjects));
      setError(null);
    }
  }, [open, project]); // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await actions.updateProject({
        id: project.id,
        title: form.title.trim() || undefined,
        abbrev: form.abbrev.trim() || undefined,
        portfolio: form.portfolio.trim() || undefined,
        productArea: form.productArea.trim() || undefined,
        owner: form.owner.trim() || undefined,
        sponsor: form.sponsor.trim() || undefined,
        stage: form.stage as Project["stage"],
        status: form.status as Project["status"],
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        summary: form.summary.trim() || undefined,
        outcomeStatement: form.outcomeStatement.trim() || undefined,
        businessValue: form.businessValue.trim() || undefined,
        dependencies: form.dependencies,
        fundingSource: form.fundingSource.trim() || undefined,
        projectCode: form.projectCode.trim() || undefined,
      });
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
          Edit project
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
            <Field label="Project code">
              <Input
                value={form.projectCode}
                onChange={(_, d) => set("projectCode", d.value)}
                placeholder="e.g. FD-012"
              />
            </Field>
          </div>

          <div className={s.row}>
            <Field label="Portfolio">
              <Input
                value={form.portfolio}
                onChange={(_, d) => set("portfolio", d.value)}
                placeholder="e.g. Workforce"
              />
            </Field>
            <Field label="Product area">
              <Input
                value={form.productArea}
                onChange={(_, d) => set("productArea", d.value)}
                placeholder="e.g. Asset Health"
              />
            </Field>
          </div>

          <Field label="Funding source">
            <Input
              value={form.fundingSource}
              onChange={(_, d) => set("fundingSource", d.value)}
              placeholder="e.g. Capex FY26"
            />
          </Field>

          <Divider />

          {/* ── People ───────────────────────────────── */}
          <Text weight="semibold" className={s.section}>People</Text>

          <div className={s.row}>
            <Field label="Owner" required>
              <PeoplePicker
                value={form.owner}
                onChange={(name) => set("owner", name)}
                placeholder="Search by name or email…"
                required
              />
            </Field>
            <Field label="Sponsor">
              <PeoplePicker
                value={form.sponsor}
                onChange={(name) => set("sponsor", name)}
                placeholder="Search by name or email…"
              />
            </Field>
          </div>

          <Divider />

          {/* ── Stage & status ───────────────────────── */}
          <Text weight="semibold" className={s.section}>Stage & status</Text>

          <div className={s.row}>
            <Field label="Stage">
              <Select value={form.stage} onChange={(_, d) => set("stage", d.value)}>
                {STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(_, d) => set("status", d.value)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </Field>
          </div>

          <Divider />

          {/* ── Dates ────────────────────────────────── */}
          <Text weight="semibold" className={s.section}>Timeline</Text>

          <div className={s.row}>
            <Field label="Start date">
              <Input
                type="date"
                value={form.startDate}
                onChange={(_, d) => set("startDate", d.value)}
              />
            </Field>
            <Field label="End date">
              <Input
                type="date"
                value={form.endDate}
                onChange={(_, d) => set("endDate", d.value)}
              />
            </Field>
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
              currentProjectId={project.id}
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

        {/* Sticky save / cancel footer */}
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
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </DrawerBody>
    </OverlayDrawer>
  );
}
