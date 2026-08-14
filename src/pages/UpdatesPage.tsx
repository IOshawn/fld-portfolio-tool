import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  makeStyles,
  shorthands,
  tokens,
  Text,
  Button,
  Field,
  Dropdown,
  Option,
  Input,
  Textarea,
  TabList,
  Tab,
  Spinner,
} from "@fluentui/react-components";
import { PageHeader } from "../components/PageHeader";
import { PortfolioGate } from "../components/PortfolioGate";
import { SectionCard } from "../components/cards";
import { Icon } from "../components/Icon";
import { PeoplePicker } from "../components/PeoplePicker";
import type { Project, PortfolioData, PersonRef } from "../types/models";
import {
  STAGES,
  STATUSES,
  MILESTONE_STATUSES,
  WORK_AREAS,
  SITES,
  ENGAGEMENT_STAGES,
  ENGAGEMENT_STATUSES,
} from "../types/models";
import { portfolioStore } from "../store/portfolioStore";
import { todayISO } from "../lib/format";

const useStyles = makeStyles({
  intro: { color: tokens.colorNeutralForeground3, maxWidth: "640px", marginBottom: "16px" },
  tabs: { marginBottom: "16px" },
  formWrap: { maxWidth: "720px" },
  form: { display: "flex", flexDirection: "column", ...shorthands.gap("16px") },
  row2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    ...shorthands.gap("16px"),
    "@media (max-width: 560px)": { gridTemplateColumns: "1fr" },
  },
  dateInput: {
    height: "32px",
    ...shorthands.padding("0", "10px"),
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    fontFamily: "inherit",
    fontSize: "14px",
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
  },
  actions: { display: "flex", columnGap: "10px", marginTop: "4px" },
  success: {
    display: "flex",
    alignItems: "flex-start",
    columnGap: "12px",
    ...shorthands.padding("16px", "18px"),
    ...shorthands.borderRadius("10px"),
    backgroundColor: "#e7f5ea",
    ...shorthands.border("1px", "solid", "#a7d8b3"),
  },
  successIcon: { color: "#0e700e", flexShrink: 0, marginTop: "1px" },
  errorText: { color: "#b10e1c" },
});

function ProjectPicker({
  projects,
  value,
  onChange,
}: {
  projects: Project[];
  value: string;
  onChange: (v: string) => void;
}): JSX.Element {
  const display = projects.find((p) => p.id === value)?.title ?? "";
  return (
    <Field label="Initiative" required>
      <Dropdown
        placeholder="Select an initiative"
        value={display}
        selectedOptions={value ? [value] : []}
        onOptionSelect={(_, d) => onChange(d.optionValue ?? "")}
      >
        {projects.map((p) => (
          <Option key={p.id} value={p.id} text={p.title}>
            {p.title}
          </Option>
        ))}
      </Dropdown>
    </Field>
  );
}

function EnumPicker({
  label,
  value,
  options,
  onChange,
  placeholder,
  required,
  emptyOptionLabel,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  emptyOptionLabel?: string;
}): JSX.Element {
  const display = value === "" ? emptyOptionLabel ?? "" : value;
  return (
    <Field label={label} required={required}>
      <Dropdown
        placeholder={placeholder}
        value={display}
        selectedOptions={[value]}
        onOptionSelect={(_, d) => onChange(d.optionValue ?? "")}
      >
        {emptyOptionLabel ? (
          <Option value="" text={emptyOptionLabel}>
            {emptyOptionLabel}
          </Option>
        ) : null}
        {options.map((o) => (
          <Option key={o} value={o} text={o}>
            {o}
          </Option>
        ))}
      </Dropdown>
    </Field>
  );
}

function SuccessBanner({ message, onAnother }: { message: string; onAnother: () => void }): JSX.Element {
  const s = useStyles();
  return (
    <div className={s.success}>
      <span className={s.successIcon}>
        <Icon name="check" size={20} />
      </span>
      <div style={{ flexGrow: 1 }}>
        <Text weight="semibold" block>
          Saved
        </Text>
        <Text size={300} style={{ color: tokens.colorNeutralForeground2 }}>
          {message}
        </Text>
      </div>
      <Button appearance="secondary" onClick={onAnother}>
        Post another
      </Button>
    </div>
  );
}

/* ----------------------------- Project update ----------------------------- */

function ProjectUpdateForm({
  projects,
  initialProject,
}: {
  projects: Project[];
  initialProject: string;
}): JSX.Element {
  const s = useStyles();
  const [projectId, setProjectId] = useState(initialProject);
  const [date, setDate] = useState(todayISO());
  const [summary, setSummary] = useState("");
  const [risks, setRisks] = useState("");
  const [decisions, setDecisions] = useState("");
  const [submittedBy, setSubmittedBy] = useState<PersonRef>({ name: "", email: "", corpId: "" });
  const [newStatus, setNewStatus] = useState("");
  const [newStage, setNewStage] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialProject) setProjectId(initialProject);
  }, [initialProject]);

  const valid = projectId && date && summary.trim() && submittedBy.name.trim();

  const reset = () => {
    setSummary("");
    setRisks("");
    setDecisions("");
    setNewStatus("");
    setNewStage("");
    setDate(todayISO());
    setSubmittedBy({ name: "", email: "", corpId: "" });
    setSaved(null);
    setError(null);
  };

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      const { project } = await portfolioStore.submitProjectUpdate({
        projectId,
        date,
        summary: summary.trim(),
        risks: risks.trim() || "None this period.",
        decisionsRequired: decisions.trim() || "None this period.",
        submittedBy,
        newStatus: (newStatus || undefined) as never,
        newStage: (newStage || undefined) as never,
      });
      setSaved(
        `Update added to ${project.title} and its record refreshed${newStatus ? ` · status now ${newStatus}` : ""}.`
      );
    } catch {
      setError("Could not save the update. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (saved) return <SuccessBanner message={saved} onAnother={reset} />;

  return (
    <div className={s.form}>
      <ProjectPicker projects={projects} value={projectId} onChange={setProjectId} />
      <div className={s.row2}>
        <Field label="Update date" required>
          <input type="date" className={s.dateInput} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Submitted by" required>
          <PeoplePicker
            value={submittedBy}
            onChange={(p) => setSubmittedBy(p)}
            placeholder="Search by name or email…"
            required
          />
        </Field>
      </div>
      <Field label="Update summary" required hint="What changed this period?">
        <Textarea value={summary} onChange={(_, d) => setSummary(d.value)} resize="vertical" placeholder="Progress, achievements, what's next…" />
      </Field>
      <Field label="Risks">
        <Textarea value={risks} onChange={(_, d) => setRisks(d.value)} resize="vertical" placeholder="Any risks or blockers" />
      </Field>
      <Field label="Decisions required">
        <Textarea value={decisions} onChange={(_, d) => setDecisions(d.value)} resize="vertical" placeholder="Anything needing a decision" />
      </Field>
      <div className={s.row2}>
        <EnumPicker label="Change status (optional)" value={newStatus} options={STATUSES} onChange={setNewStatus} emptyOptionLabel="No change" />
        <EnumPicker label="Change stage (optional)" value={newStage} options={STAGES} onChange={setNewStage} emptyOptionLabel="No change" />
      </div>
      {error ? <Text className={s.errorText}>{error}</Text> : null}
      <div className={s.actions}>
        <Button appearance="primary" onClick={submit} disabled={!valid || saving} icon={saving ? <Spinner size="tiny" /> : undefined}>
          {saving ? "Saving…" : "Save update"}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------- Milestone -------------------------------- */

function MilestoneForm({ projects }: { projects: Project[] }): JSX.Element {
  const s = useStyles();
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [date, setDate] = useState(todayISO());
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const valid = projectId && name.trim() && date && status;

  const reset = () => {
    setName("");
    setNotes("");
    setStatus("");
    setDate(todayISO());
    setSaved(null);
    setError(null);
  };

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      const m = await portfolioStore.saveMilestone({
        projectId,
        name: name.trim(),
        date,
        status: status as never,
        notes: notes.trim(),
      });
      setSaved(`Milestone "${m.name}" added.`);
    } catch {
      setError("Could not save the milestone. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (saved) return <SuccessBanner message={saved} onAnother={reset} />;

  return (
    <div className={s.form}>
      <ProjectPicker projects={projects} value={projectId} onChange={setProjectId} />
      <Field label="Milestone name" required>
        <Input value={name} onChange={(_, d) => setName(d.value)} placeholder="e.g. Pilot go-live" />
      </Field>
      <div className={s.row2}>
        <Field label="Milestone date" required>
          <input type="date" className={s.dateInput} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <EnumPicker label="Status" value={status} options={MILESTONE_STATUSES} onChange={setStatus} placeholder="Select status" required />
      </div>
      <Field label="Notes">
        <Textarea value={notes} onChange={(_, d) => setNotes(d.value)} resize="vertical" placeholder="Optional context" />
      </Field>
      {error ? <Text className={s.errorText}>{error}</Text> : null}
      <div className={s.actions}>
        <Button appearance="primary" onClick={submit} disabled={!valid || saving} icon={saving ? <Spinner size="tiny" /> : undefined}>
          {saving ? "Saving…" : "Save milestone"}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------ Engagement -------------------------------- */

function EngagementForm({ projects }: { projects: Project[] }): JSX.Element {
  const s = useStyles();
  const [projectId, setProjectId] = useState("");
  const [site, setSite] = useState("");
  const [workArea, setWorkArea] = useState("");
  const [team, setTeam] = useState("");
  const [stage, setStage] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const valid = projectId && site && workArea && stage && status && startDate && endDate;

  const reset = () => {
    setSite("");
    setWorkArea("");
    setTeam("");
    setStage("");
    setStatus("");
    setStartDate(todayISO());
    setEndDate(todayISO());
    setPurpose("");
    setNotes("");
    setSaved(null);
    setError(null);
  };

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      const e = await portfolioStore.saveEngagement({
        initiativeId: projectId,
        site: site as never,
        workArea: workArea as never,
        team: team.trim() || `${workArea} Team`,
        stage: stage as never,
        status: status as never,
        startDate,
        endDate,
        purpose: purpose.trim(),
        notes: notes.trim(),
      });
      setSaved(`Engagement for ${e.workArea} at ${e.site} (${e.stage}) added.`);
    } catch {
      setError("Could not save the engagement. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (saved) return <SuccessBanner message={saved} onAnother={reset} />;

  return (
    <div className={s.form}>
      <ProjectPicker projects={projects} value={projectId} onChange={setProjectId} />
      <div className={s.row2}>
        <EnumPicker label="Site" value={site} options={SITES} onChange={setSite} placeholder="Select a site" required />
        <EnumPicker label="Work area" value={workArea} options={WORK_AREAS} onChange={setWorkArea} placeholder="Select a work area" required />
      </div>
      <div className={s.row2}>
        <EnumPicker label="Engagement stage" value={stage} options={ENGAGEMENT_STAGES} onChange={setStage} placeholder="Select stage" required />
        <EnumPicker label="Status" value={status} options={ENGAGEMENT_STATUSES} onChange={setStatus} placeholder="Select status" required />
      </div>
      <div className={s.row2}>
        <Field label="Start date" required>
          <input type="date" className={s.dateInput} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="End date" required>
          <input type="date" className={s.dateInput} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </Field>
      </div>
      <Field label="Team" hint="Defaults to the work area team if left blank.">
        <Input value={team} onChange={(_, d) => setTeam(d.value)} placeholder="e.g. Production Team" />
      </Field>
      <Field label="Engagement purpose">
        <Textarea value={purpose} onChange={(_, d) => setPurpose(d.value)} resize="vertical" placeholder="Why the engagement is happening" />
      </Field>
      <Field label="Notes">
        <Textarea value={notes} onChange={(_, d) => setNotes(d.value)} resize="vertical" placeholder="Optional context" />
      </Field>
      {error ? <Text className={s.errorText}>{error}</Text> : null}
      <div className={s.actions}>
        <Button appearance="primary" onClick={submit} disabled={!valid || saving} icon={saving ? <Spinner size="tiny" /> : undefined}>
          {saving ? "Saving…" : "Save engagement"}
        </Button>
      </div>
    </div>
  );
}

/* --------------------------- Edit initiative ------------------------------ */

function EditInitiativeForm({ projects }: { projects: Project[] }): JSX.Element {
  const s = useStyles();
  const [projectId, setProjectId] = useState("");
  const [f, setF] = useState({
    title: "", abbrev: "", portfolio: "", productArea: "",
    owner: { name: "", email: "", corpId: "" } as PersonRef,
    sponsor: { name: "", email: "", corpId: "" } as PersonRef,
    stage: "", status: "", startDate: "", endDate: "", fundingSource: "",
    outcomeStatement: "", businessValue: "", summary: "", dependencies: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const upd = (patch: Partial<typeof f>) => setF((cur) => ({ ...cur, ...patch }));

  useEffect(() => {
    const p = projects.find((x) => x.id === projectId);
    if (!p) return;
    setF({
      title: p.title, abbrev: p.abbrev, portfolio: p.portfolio, productArea: p.productArea,
      owner: typeof p.owner === "string" ? { name: p.owner as unknown as string, email: "", corpId: "" } : p.owner,
      sponsor: typeof p.sponsor === "string" ? { name: p.sponsor as unknown as string, email: "", corpId: "" } : p.sponsor,
      stage: p.stage, status: p.status,
      startDate: p.startDate, endDate: p.endDate, fundingSource: p.fundingSource,
      outcomeStatement: p.outcomeStatement, businessValue: p.businessValue, summary: p.summary,
      dependencies: p.dependencies.join(", "),
    });
    setSaved(null);
    setError(null);
  }, [projectId, projects]);

  const valid = projectId && f.title.trim() && f.portfolio.trim() && f.owner.name.trim() && f.stage && f.status;

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      const p = await portfolioStore.updateProject({
        id: projectId,
        title: f.title.trim(),
        abbrev: f.abbrev.trim(),
        portfolio: f.portfolio.trim(),
        productArea: f.productArea.trim(),
        owner: f.owner,
        sponsor: f.sponsor,
        stage: f.stage as never,
        status: f.status as never,
        startDate: f.startDate,
        endDate: f.endDate,
        fundingSource: f.fundingSource.trim(),
        outcomeStatement: f.outcomeStatement.trim(),
        businessValue: f.businessValue.trim(),
        summary: f.summary.trim(),
        dependencies: f.dependencies.split(/[;,]/).map((d) => d.trim()).filter(Boolean),
      });
      setSaved(`${p.title} updated — owner ${typeof p.owner === "object" ? p.owner.name : p.owner}, portfolio ${p.portfolio}.`);
    } catch {
      setError("Could not save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (saved)
    return <SuccessBanner message={saved} onAnother={() => { setProjectId(""); setSaved(null); }} />;

  return (
    <div className={s.form}>
      <ProjectPicker projects={projects} value={projectId} onChange={setProjectId} />
      {projectId ? (
        <>
          <div className={s.row2}>
            <Field label="Initiative name" required>
              <Input value={f.title} onChange={(_, d) => upd({ title: d.value })} />
            </Field>
            <Field label="Abbreviation" hint="Shown in the engagement matrix">
              <Input value={f.abbrev} onChange={(_, d) => upd({ abbrev: d.value })} />
            </Field>
          </div>
          <div className={s.row2}>
            <Field label="Portfolio" required>
              <Input value={f.portfolio} onChange={(_, d) => upd({ portfolio: d.value })} />
            </Field>
            <Field label="Product area">
              <Input value={f.productArea} onChange={(_, d) => upd({ productArea: d.value })} />
            </Field>
          </div>
          <div className={s.row2}>
            <Field label="Owner" required>
              <PeoplePicker
                value={f.owner}
                onChange={(p) => upd({ owner: p })}
                placeholder="Search by name or email…"
                required
              />
            </Field>
            <Field label="Sponsor">
              <PeoplePicker
                value={f.sponsor}
                onChange={(p) => upd({ sponsor: p })}
                placeholder="Search by name or email…"
              />
            </Field>
          </div>
          <div className={s.row2}>
            <EnumPicker label="Stage" value={f.stage} options={STAGES} onChange={(v) => upd({ stage: v })} required />
            <EnumPicker label="Status" value={f.status} options={STATUSES} onChange={(v) => upd({ status: v })} required />
          </div>
          <div className={s.row2}>
            <Field label="Start date">
              <input type="date" className={s.dateInput} value={f.startDate} onChange={(e) => upd({ startDate: e.target.value })} />
            </Field>
            <Field label="End date">
              <input type="date" className={s.dateInput} value={f.endDate} onChange={(e) => upd({ endDate: e.target.value })} />
            </Field>
          </div>
          <Field label="Funding source">
            <Input value={f.fundingSource} onChange={(_, d) => upd({ fundingSource: d.value })} />
          </Field>
          <Field label="Outcome statement">
            <Textarea value={f.outcomeStatement} onChange={(_, d) => upd({ outcomeStatement: d.value })} resize="vertical" />
          </Field>
          <Field label="Business value">
            <Textarea value={f.businessValue} onChange={(_, d) => upd({ businessValue: d.value })} resize="vertical" />
          </Field>
          <Field label="Summary">
            <Textarea value={f.summary} onChange={(_, d) => upd({ summary: d.value })} resize="vertical" />
          </Field>
          <Field label="Dependencies" hint="Comma-separated initiative names">
            <Input value={f.dependencies} onChange={(_, d) => upd({ dependencies: d.value })} />
          </Field>
          {error ? <Text className={s.errorText}>{error}</Text> : null}
          <div className={s.actions}>
            <Button appearance="primary" onClick={submit} disabled={!valid || saving} icon={saving ? <Spinner size="tiny" /> : undefined}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </>
      ) : (
        <Text style={{ color: tokens.colorNeutralForeground3 }}>Choose an initiative to edit its details.</Text>
      )}
    </div>
  );
}

/* --------------------------------- Page ----------------------------------- */

function UpdatesContent({ data }: { data: PortfolioData }): JSX.Element {
  const s = useStyles();
  const [params] = useSearchParams();
  const initialProject = params.get("project") ?? "";
  const [tab, setTab] = useState<string>("project");

  const projects = [...data.projects].sort((a, b) => a.title.localeCompare(b.title));

  const titles: Record<string, string> = {
    project: "Submit a project update",
    edit: "Edit initiative details",
    milestone: "Add or update a milestone",
    engagement: "Log a site engagement",
  };

  return (
    <>
      <PageHeader
        eyebrow="Updates"
        title="Update the hub"
        subtitle="Keep initiatives and engagements current — these forms write straight to the hub for you."
      />
      <Text className={s.intro} block>
        You never touch a list. A project update refreshes the initiative record and adds a history
        entry; milestones and engagements appear instantly across the roadmap, matrix and site views.
      </Text>

      <div className={s.tabs}>
        <TabList selectedValue={tab} onTabSelect={(_, d) => setTab(d.value as string)}>
          <Tab value="project">Project update</Tab>
          <Tab value="edit">Edit initiative</Tab>
          <Tab value="milestone">Milestone</Tab>
          <Tab value="engagement">Site engagement</Tab>
        </TabList>
      </div>

      <div className={s.formWrap}>
        <SectionCard title={titles[tab]} icon="updates">
          {tab === "project" ? <ProjectUpdateForm projects={projects} initialProject={initialProject} /> : null}
          {tab === "edit" ? <EditInitiativeForm projects={projects} /> : null}
          {tab === "milestone" ? <MilestoneForm projects={projects} /> : null}
          {tab === "engagement" ? <EngagementForm projects={projects} /> : null}
        </SectionCard>
      </div>
    </>
  );
}

export function UpdatesPage(): JSX.Element {
  return <PortfolioGate>{(data) => <UpdatesContent data={data} />}</PortfolioGate>;
}
