import { useMemo, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  makeStyles,
  mergeClasses,
  shorthands,
  tokens,
  Text,
  Button,
  Avatar,
  Badge,
  TabList,
  Tab,
  ProgressBar,
} from "@fluentui/react-components";
import { PortfolioGate } from "../components/PortfolioGate";
import { ProjectEditDrawer } from "../components/ProjectEditDrawer";
import { DependencyGraph, resolveDep } from "../components/DependencyGraph";
import { SectionCard } from "../components/cards";
import { EmptyState } from "../components/states";
import { StatusBadge, StageBadge, MilestoneStatusBadge } from "../components/Badges";
import { Icon } from "../components/Icon";
import { InitiativeEngagementPanel } from "../components/InitiativeEngagementPanel";
import type { PortfolioData, Project } from "../types/models";
import {
  milestonesFor,
  updatesFor,
  engagementsForInitiative,
  sitesForInitiative,
} from "../lib/selectors";
import { formatDate, parseISO, today } from "../lib/format";

const useStyles = makeStyles({
  back: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: "4px",
    color: tokens.colorNeutralForeground3,
    textDecorationLine: "none",
    marginBottom: "12px",
    ":hover": { color: tokens.colorNeutralForeground1 },
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    columnGap: "16px",
    rowGap: "12px",
    flexWrap: "wrap",
    marginBottom: "8px",
  },
  titleWrap: { minWidth: 0 },
  badges: { display: "flex", alignItems: "center", columnGap: "8px", marginTop: "8px", flexWrap: "wrap" },
  code: { color: tokens.colorNeutralForeground3, fontVariantNumeric: "tabular-nums" },
  divider: { height: "1px", backgroundColor: tokens.colorNeutralStroke2, ...shorthands.margin("20px", "0", "24px", "0") },
  grid: {
    display: "grid",
    gridTemplateColumns: "1.5fr 1fr",
    ...shorthands.gap("16px"),
    alignItems: "start",
    "@media (max-width: 980px)": { gridTemplateColumns: "1fr" },
  },
  col: { display: "flex", flexDirection: "column", ...shorthands.gap("16px"), minWidth: 0 },
  callout: {
    ...shorthands.padding("12px", "14px"),
    ...shorthands.borderRadius("8px"),
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderLeft("3px", "solid", tokens.colorBrandStroke1),
    marginBottom: "12px",
  },
  calloutValue: {
    ...shorthands.borderLeft("3px", "solid", "#2f9e8f"),
  },
  eyebrow: { fontSize: "11px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" },
  facts: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    ...shorthands.gap("14px", "16px"),
    marginTop: "14px",
    "@media (max-width: 520px)": { gridTemplateColumns: "1fr" },
  },
  fact: { display: "flex", flexDirection: "column", rowGap: "2px", minWidth: 0 },
  factLabel: { color: tokens.colorNeutralForeground3, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.03em" },
  factValueRow: { display: "flex", alignItems: "center", columnGap: "8px" },
  depWrap: { marginTop: "16px" },
  chips: { display: "flex", flexWrap: "wrap", ...shorthands.gap("8px"), marginTop: "6px" },
  depLink: { textDecorationLine: "none" },
  progressRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" },
  updateItem: {
    ...shorthands.padding("14px", "0"),
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke3),
    ":last-child": { ...shorthands.borderBottom("0") },
  },
  updateHead: { display: "flex", alignItems: "center", justifyContent: "space-between", columnGap: "10px", marginBottom: "6px" },
  riskRow: { display: "flex", columnGap: "8px", marginTop: "8px", color: tokens.colorNeutralForeground2 },
  riskIcon: { flexShrink: 0, marginTop: "2px", color: "#b8690b" },
  mRow: {
    display: "flex",
    alignItems: "center",
    columnGap: "12px",
    ...shorthands.padding("12px", "4px"),
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke3),
    ":last-child": { ...shorthands.borderBottom("0") },
  },
  mIcon: { display: "grid", placeItems: "center", width: "30px", height: "30px", flexShrink: 0, ...shorthands.borderRadius("8px"), backgroundColor: tokens.colorNeutralBackground3, color: tokens.colorNeutralForeground3 },
  mBody: { minWidth: 0, flexGrow: 1, display: "flex", flexDirection: "column", rowGap: "1px" },
  mPrimary: { fontWeight: 600 },
  mSecondary: { color: tokens.colorNeutralForeground3 },
  mRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", rowGap: "3px", flexShrink: 0 },
  date: { fontVariantNumeric: "tabular-nums", color: tokens.colorNeutralForeground2, whiteSpace: "nowrap" },
  tabs: { marginBottom: "12px" },
  muted: { color: tokens.colorNeutralForeground3, ...shorthands.padding("16px", "4px") },
});

function Fact({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  const s = useStyles();
  return (
    <div className={s.fact}>
      <span className={s.factLabel}>{label}</span>
      <div className={s.factValueRow}>{children}</div>
    </div>
  );
}

function DetailContent({ data, project }: { data: PortfolioData; project: Project }): JSX.Element {
  const s = useStyles();
  const navigate = useNavigate();
  const [tab, setTab] = useState<string>("milestones");
  const [editOpen, setEditOpen] = useState(false);
  const openEdit = useCallback(() => setEditOpen(true), []);
  const closeEdit = useCallback(() => setEditOpen(false), []);

  const ms = useMemo(() => milestonesFor(data.milestones, project.id), [data.milestones, project.id]);
  const ups = useMemo(() => updatesFor(data.updates, project.id), [data.updates, project.id]);
  const engs = useMemo(() => engagementsForInitiative(data.engagements, project.id), [data.engagements, project.id]);
  const sites = useMemo(() => sitesForInitiative(data.engagements, project.id), [data.engagements, project.id]);
  const latest = ups[0];

  // Resolve dependency entries (ID or legacy title) to Project objects
  const resolvedUpstreams = useMemo(
    () =>
      project.dependencies
        .map((dep) => resolveDep(dep, data.projects))
        .filter((p): p is NonNullable<typeof p> => p !== undefined),
    [project.dependencies, data.projects]
  );

  // Check if there are any downstream dependents (projects that depend on this one)
  const hasDownstreams = useMemo(
    () =>
      data.projects.some(
        (p) =>
          p.id !== project.id &&
          p.dependencies.some(
            (dep) => dep === project.id || dep.toLowerCase() === project.title.toLowerCase()
          )
      ),
    [data.projects, project.id, project.title]
  );

  const start = parseISO(project.startDate).getTime();
  const end = parseISO(project.endDate).getTime();
  const now = today().getTime();
  const progress = end > start ? Math.min(1, Math.max(0, (now - start) / (end - start))) : 0;
  const progressPct = Math.round(progress * 100);

  return (
    <>
      <Link to="/projects" className={s.back}>
        <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>
          <Icon name="chevronRight" size={16} />
        </span>
        Back to projects
      </Link>

      <div className={s.header}>
        <div className={s.titleWrap}>
          <h1 style={{ margin: 0 }}>
            <Text size={800} weight="bold" style={{ lineHeight: 1.1 }} block>
              {project.title}
            </Text>
          </h1>
          <div className={s.badges}>
            <StatusBadge status={project.status} />
            <StageBadge stage={project.stage} />
            <Badge appearance="tint" color="brand" shape="rounded">
              {project.portfolio}
            </Badge>
            <Text size={200} className={s.code}>
              {project.projectCode}
            </Text>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button appearance="secondary" onClick={openEdit} icon={<Icon name="edit" size={16} />}>
            Edit project
          </Button>
          <Button appearance="primary" onClick={() => navigate(`/updates?project=${project.id}`)}>
            Post update
          </Button>
        </div>
      </div>

      <ProjectEditDrawer project={project} allProjects={data.projects} open={editOpen} onClose={closeEdit} />

      <div className={s.divider} />

      <div className={s.grid}>
        <div className={s.col}>
          <SectionCard title="Overview" icon="projects">
            <div className={s.callout}>
              <Text size={200} weight="semibold" className={s.eyebrow} style={{ color: tokens.colorBrandForeground2 }} block>
                Outcome
              </Text>
              <Text size={400}>{project.outcomeStatement}</Text>
            </div>
            <div className={mergeClasses(s.callout, s.calloutValue)}>
              <Text size={200} weight="semibold" className={s.eyebrow} style={{ color: "#2f9e8f" }} block>
                Business value
              </Text>
              <Text size={300}>{project.businessValue}</Text>
            </div>
            <Text size={300} style={{ color: tokens.colorNeutralForeground2 }}>
              {project.summary}
            </Text>

            <div className={s.facts}>
              <Fact label="Owner">
                <Avatar name={project.owner} size={20} color="colorful" />
                <Text size={300}>{project.owner}</Text>
              </Fact>
              <Fact label="Sponsor">
                <Avatar name={project.sponsor} size={20} color="colorful" />
                <Text size={300}>{project.sponsor}</Text>
              </Fact>
              <Fact label="Product area">
                <Text size={300}>{project.productArea}</Text>
              </Fact>
              <Fact label="Funding source">
                <Text size={300}>{project.fundingSource}</Text>
              </Fact>
              <Fact label="Start">
                <Text size={300}>{formatDate(project.startDate)}</Text>
              </Fact>
              <Fact label="End">
                <Text size={300}>{formatDate(project.endDate)}</Text>
              </Fact>
            </div>

            <div className={s.depWrap}>
              <span className={s.factLabel}>
                <Icon name="link" size={14} /> Dependencies
              </span>
              <div className={s.chips}>
                {project.dependencies.length === 0 ? (
                  <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                    None recorded
                  </Text>
                ) : (
                  project.dependencies.map((dep) => {
                    const target = resolveDep(dep, data.projects);
                    const label = target ? target.title : dep;
                    const badge = (
                      <Badge appearance="outline" color="informative" shape="rounded">
                        {label}
                      </Badge>
                    );
                    return target ? (
                      <Link key={dep} to={`/projects/${target.id}`} className={s.depLink}>
                        {badge}
                      </Link>
                    ) : (
                      <span key={dep}>{badge}</span>
                    );
                  })
                )}
              </div>
            </div>
          </SectionCard>

          <div className={s.tabs}>
            <TabList selectedValue={tab} onTabSelect={(_, d) => setTab(d.value as string)}>
              <Tab value="milestones">Milestones ({ms.length})</Tab>
              <Tab value="engagements">Engagements ({engs.length})</Tab>
              <Tab value="updates">Update history ({ups.length})</Tab>
            </TabList>
          </div>

          {tab === "milestones" ? (
            <SectionCard title="Milestones" icon="flag" flush>
              <div style={{ padding: "4px 20px 8px" }}>
                {ms.length === 0 ? (
                  <Text className={s.muted}>No milestones recorded.</Text>
                ) : (
                  ms.map((m) => (
                    <div className={s.mRow} key={m.id}>
                      <span className={s.mIcon}>
                        <Icon name="flag" size={16} />
                      </span>
                      <div className={s.mBody}>
                        <Text size={300} className={s.mPrimary}>
                          {m.name}
                        </Text>
                        {m.notes ? (
                          <Text size={200} className={s.mSecondary}>
                            {m.notes}
                          </Text>
                        ) : null}
                      </div>
                      <div className={s.mRight}>
                        <Text size={200} className={s.date}>
                          {formatDate(m.date)}
                        </Text>
                        <MilestoneStatusBadge status={m.status} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SectionCard>
          ) : null}

          {tab === "engagements" ? (
            <InitiativeEngagementPanel project={project} engagements={data.engagements} />
          ) : null}

          {tab === "updates" ? (
            <SectionCard title="Update history" icon="updates" flush>
              <div style={{ padding: "4px 20px 12px" }}>
                {ups.length === 0 ? (
                  <Text className={s.muted}>No updates submitted yet.</Text>
                ) : (
                  ups.map((u) => (
                    <div className={s.updateItem} key={u.id}>
                      <div className={s.updateHead}>
                        <Text size={300} weight="semibold">
                          {formatDate(u.date)}
                        </Text>
                        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                          {u.submittedBy}
                        </Text>
                      </div>
                      <Text size={300} style={{ color: tokens.colorNeutralForeground2 }} block>
                        {u.summary}
                      </Text>
                      {u.risks && u.risks.toLowerCase() !== "none material." ? (
                        <div className={s.riskRow}>
                          <span className={s.riskIcon}>
                            <Icon name="warning" size={16} />
                          </span>
                          <Text size={200}>
                            <strong>Risk:</strong> {u.risks}
                          </Text>
                        </div>
                      ) : null}
                      {u.decisionsRequired &&
                      u.decisionsRequired.toLowerCase() !== "none this period." ? (
                        <div className={s.riskRow}>
                          <span className={s.riskIcon} style={{ color: tokens.colorBrandForeground2 }}>
                            <Icon name="check" size={16} />
                          </span>
                          <Text size={200}>
                            <strong>Decision required:</strong> {u.decisionsRequired}
                          </Text>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </SectionCard>
          ) : null}
        </div>

        <div className={s.col}>
          <SectionCard title="Timeline" icon="calendar">
            <div className={s.progressRow}>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                {formatDate(project.startDate)}
              </Text>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                {formatDate(project.endDate)}
              </Text>
            </div>
            <ProgressBar value={progress} thickness="large" />
            <Text size={200} style={{ color: tokens.colorNeutralForeground3, marginTop: "8px" }} block>
              {progressPct}% of planned timeline elapsed
            </Text>
          </SectionCard>

          {latest ? (
            <SectionCard title="Latest update" icon="updates">
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }} block>
                {formatDate(latest.date)} · {latest.submittedBy}
              </Text>
              <Text size={300} style={{ color: tokens.colorNeutralForeground2, marginTop: "6px" }} block>
                {latest.summary}
              </Text>
            </SectionCard>
          ) : null}

          <SectionCard title={`Sites engaged (${sites.length})`} icon="sites">
            {sites.length === 0 ? (
              <Text className={s.muted}>No sites engaged yet.</Text>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {sites.map((site) => (
                  <Link key={site} to={`/sites?site=${encodeURIComponent(site)}`} className={s.depLink}>
                    <Badge appearance="tint" color="informative" shape="rounded">
                      {site}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>

          {(resolvedUpstreams.length > 0 || hasDownstreams) && (
            <SectionCard title="Dependency graph" icon="link">
              <DependencyGraph
                project={project}
                allProjects={data.projects}
                upstreams={resolvedUpstreams}
              />
            </SectionCard>
          )}
        </div>
      </div>
    </>
  );
}

export function ProjectDetailPage(): JSX.Element {
  const { projectId } = useParams();
  return (
    <PortfolioGate>
      {(data) => {
        const project = data.projects.find((p) => p.id === projectId);
        if (!project) {
          return (
            <EmptyState
              icon="search"
              title="Project not found"
              message="This project may have been removed or the link is incorrect."
              action={
                <Link to="/projects">
                  <Button appearance="primary">Back to projects</Button>
                </Link>
              }
            />
          );
        }
        return <DetailContent data={data} project={project} />;
      }}
    </PortfolioGate>
  );
}
