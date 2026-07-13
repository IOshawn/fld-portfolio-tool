import { Link, useNavigate } from "react-router-dom";
import { makeStyles, shorthands, tokens, Text, Button } from "@fluentui/react-components";
import { PageHeader } from "../components/PageHeader";
import { PortfolioGate } from "../components/PortfolioGate";
import { SectionCard, StatCard } from "../components/cards";
import { BarList } from "../components/BarList";
import { MilestoneListItem, EngagementListItem, ProjectMiniRow } from "../components/lists";
import { RoadmapTimeline } from "../components/RoadmapTimeline";
import type { PortfolioData } from "../types/models";
import { SITE_NAMES } from "../types/models";
import {
  projectsByStage,
  projectsByStatus,
  recentlyUpdated,
  upcomingMilestones,
  upcomingEngagements,
  activeSites,
  sitesByActivity,
  initiativesRequiringAttention,
} from "../lib/selectors";
import { statusBarColor } from "../lib/theme";
import { formatDate, todayISO } from "../lib/format";

const STAGE_BAR = "#3a5a8c";

const useStyles = makeStyles({
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    ...shorthands.gap("16px"),
    marginBottom: "20px",
  },
  roadmapWrap: { marginBottom: "20px" },
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "1.5fr 1fr",
    ...shorthands.gap("16px"),
    alignItems: "start",
    "@media (max-width: 980px)": { gridTemplateColumns: "1fr" },
  },
  col: { display: "flex", flexDirection: "column", ...shorthands.gap("16px"), minWidth: 0 },
  muted: { color: tokens.colorNeutralForeground3, ...shorthands.padding("12px", "4px") },
  bodyPad: { padding: "0 20px 8px" },
  actRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    columnGap: "12px",
    textDecorationLine: "none",
    color: "inherit",
    ...shorthands.padding("11px", "4px"),
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke3),
    ":last-child": { ...shorthands.borderBottom("0") },
    ":hover": { backgroundColor: tokens.colorNeutralBackground2 },
  },
  actName: { fontWeight: 600 },
  actSub: { color: tokens.colorNeutralForeground3 },
  actCount: { fontVariantNumeric: "tabular-nums", color: tokens.colorNeutralForeground2, whiteSpace: "nowrap" },
});

function HomeContent({ data }: { data: PortfolioData }): JSX.Element {
  const s = useStyles();
  const navigate = useNavigate();
  const { projects, milestones, engagements } = data;

  const titleOf = (id: string) => projects.find((p) => p.id === id)?.title ?? id;

  const inDelivery = projects.filter((p) => ["Build", "Pilot", "Scale"].includes(p.stage)).length;
  const attention = initiativesRequiringAttention(projects, engagements);
  const recent = recentlyUpdated(projects, 6);
  const upMilestones = upcomingMilestones(milestones, 6);
  const upEngagements = upcomingEngagements(engagements, 6);
  const topSites = sitesByActivity(engagements).slice(0, 6);

  const roadmapProjects = [...projects].sort((a, b) => a.startDate.localeCompare(b.startDate));

  const stageBars = projectsByStage(projects).map((x) => ({ label: x.stage, count: x.count, color: STAGE_BAR }));
  const statusBars = projectsByStatus(projects).map((x) => ({
    label: x.status,
    count: x.count,
    color: statusBarColor(x.status),
  }));

  return (
    <>
      <PageHeader
        eyebrow="Frontline Digital"
        title="What we're working on"
        subtitle={`Portfolio & engagement snapshot · ${formatDate(todayISO())} · ${projects.length} initiatives`}
        actions={
          <>
            <Button appearance="secondary" onClick={() => navigate("/engagements")}>
              Engagement Hub
            </Button>
            <Button appearance="primary" onClick={() => navigate("/roadmap")}>
              Open roadmap
            </Button>
          </>
        }
      />

      <div className={s.statGrid}>
        <StatCard label="Initiatives" value={projects.length} accentColor={STAGE_BAR} />
        <StatCard label="In delivery" value={inDelivery} hint="Build, Pilot or Scale" accentColor="#3d8a4f" />
        <StatCard label="Needs attention" value={attention.length} hint="At-risk or on-hold" accentColor="#bc3b3b" />
        <StatCard label="Sites engaged" value={activeSites(engagements).length} hint="Across all engagements" accentColor="#2f9e8f" />
      </div>

      <div className={s.roadmapWrap}>
        <SectionCard
          title="Portfolio roadmap · 2026–2028"
          icon="roadmap"
          action={
            <Button appearance="subtle" size="small" onClick={() => navigate("/roadmap")}>
              Open
            </Button>
          }
          flush
        >
          <div style={{ padding: "12px" }}>
            <RoadmapTimeline projects={roadmapProjects} />
          </div>
        </SectionCard>
      </div>

      <div className={s.mainGrid}>
        <div className={s.col}>
          <SectionCard title="Upcoming milestones" icon="flag" flush>
            <div className={s.bodyPad}>
              {upMilestones.length === 0 ? (
                <Text className={s.muted}>No milestones due.</Text>
              ) : (
                upMilestones.map((m) => (
                  <MilestoneListItem key={m.id} milestone={m} projectTitle={titleOf(m.projectId)} />
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Upcoming site engagements"
            icon="location"
            action={
              <Button appearance="subtle" size="small" onClick={() => navigate("/engagements")}>
                View all
              </Button>
            }
            flush
          >
            <div className={s.bodyPad}>
              {upEngagements.length === 0 ? (
                <Text className={s.muted}>No engagements scheduled.</Text>
              ) : (
                upEngagements.map((e) => (
                  <EngagementListItem key={e.id} engagement={e} initiativeTitle={titleOf(e.initiativeId)} />
                ))
              )}
            </div>
          </SectionCard>
        </div>

        <div className={s.col}>
          <SectionCard title="Initiatives requiring attention" icon="warning" flush>
            <div className={s.bodyPad}>
              {attention.length === 0 ? (
                <Text className={s.muted}>Nothing flagged — all on track.</Text>
              ) : (
                attention.map((p) => <ProjectMiniRow key={p.id} project={p} />)
              )}
            </div>
          </SectionCard>

          <SectionCard title="Sites with highest activity" icon="sites" flush>
            <div className={s.bodyPad}>
              {topSites.length === 0 ? (
                <Text className={s.muted}>No site activity yet.</Text>
              ) : (
                topSites.map((sa) => (
                  <Link key={sa.site} to={`/sites?site=${encodeURIComponent(sa.site)}`} className={s.actRow}>
                    <div style={{ minWidth: 0 }}>
                      <Text size={300} className={s.actName} block>
                        {sa.site}
                      </Text>
                      <Text size={200} className={s.actSub}>
                        {SITE_NAMES[sa.site]}
                      </Text>
                    </div>
                    <Text size={200} className={s.actCount}>
                      {sa.engagements} eng · {sa.initiatives} init
                    </Text>
                  </Link>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard title="Projects by stage" icon="roadmap">
            <BarList items={stageBars} />
          </SectionCard>

          <SectionCard title="Projects by status" icon="check">
            <BarList items={statusBars} />
          </SectionCard>

          <SectionCard title="Recently updated" icon="clock" flush>
            <div className={s.bodyPad}>
              {recent.map((p) => (
                <ProjectMiniRow key={p.id} project={p} />
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}

export function HomePage(): JSX.Element {
  return <PortfolioGate>{(data) => <HomeContent data={data} />}</PortfolioGate>;
}
