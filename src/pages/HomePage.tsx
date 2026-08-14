import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { makeStyles, shorthands, tokens, Text, Button, Badge } from "@fluentui/react-components";
import { PageHeader } from "../components/PageHeader";
import { PortfolioGate } from "../components/PortfolioGate";
import { SectionCard, StatCard } from "../components/cards";
import { BarList } from "../components/BarList";
import { MilestoneListItem, EngagementListItem, ProjectMiniRow } from "../components/lists";
import { RoadmapTimeline } from "../components/RoadmapTimeline";
import { Icon } from "../components/Icon";
import type { PortfolioData, PersonRef } from "../types/models";
import { SITE_NAMES, toPersonRef, personName } from "../types/models";
import { usePersonTravelAlerts } from "../hooks/usePersonTravelAlerts";
import { readDismissed, writeDismissed } from "../lib/travelAlertDismissals";
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
  travelRow: {
    display: "flex",
    alignItems: "center",
    columnGap: "12px",
    ...shorthands.padding("9px", "4px"),
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke3),
    ":last-child": { ...shorthands.borderBottom("0") },
  },
  travelPerson: { fontWeight: 600, flexShrink: 0 },
  travelMeta: { color: tokens.colorNeutralForeground3, flexGrow: 1, minWidth: 0 },
});

/** Returns the date string 7 days from today in YYYY-MM-DD format. */
function sevenDaysFromNow(): string {
  const d = new Date(todayISO());
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

function travelStatusColor(status: string): "success" | "informative" {
  return status === "Booked" ? "success" : "informative";
}

function UpcomingTravelSection({ data }: { data: PortfolioData }): JSX.Element | null {
  const s = useStyles();
  const today = todayISO();
  const cutoff = sevenDaysFromNow();

  const upcoming = useMemo(
    () =>
      data.travelEntries
        .filter((e) => e.departureDate >= today && e.departureDate <= cutoff)
        .sort((a, b) => a.departureDate.localeCompare(b.departureDate))
        .slice(0, 5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.travelEntries]
  );

  if (upcoming.length === 0) return null;

  return (
    <div style={{ marginBottom: "20px" }}>
      <SectionCard
        title="Upcoming travel · next 7 days"
        icon="travel"
        action={
          <Link to="/travel" style={{ textDecoration: "none" }}>
            <Button appearance="subtle" size="small">View all</Button>
          </Link>
        }
        flush
      >
        <div style={{ padding: "0 20px 8px" }}>
          {upcoming.map((entry) => (
            <div key={entry.id} className={s.travelRow}>
              <span style={{ flexShrink: 0, color: tokens.colorBrandForeground2 }}>
                <Icon name="plane" size={14} />
              </span>
              <Text size={300} className={s.travelPerson}>
                {personName(entry.person)}
              </Text>
              <Text size={200} className={s.travelMeta}>
                → {entry.site} · {formatDate(entry.departureDate)}
              </Text>
              <Badge
                appearance="tint"
                color={travelStatusColor(entry.status)}
                shape="rounded"
                size="small"
              >
                {entry.status}
              </Badge>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// Separate component so hooks rules are satisfied
function TravelAlertsList({ data }: { data: PortfolioData }): JSX.Element | null {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(readDismissed);

  const activeProjects = useMemo(
    () => data.projects.filter((p) => p.status !== "Complete"),
    [data.projects]
  );

  // Build a single persons map for the hook
  const personsMap = useMemo(() => {
    const map: Record<string, PersonRef> = {};
    for (const p of activeProjects) {
      const owner = toPersonRef(p.owner);
      const sponsor = toPersonRef(p.sponsor);
      if (owner.name) map[`owner-${p.id}`] = owner;
      if (sponsor.name) map[`sponsor-${p.id}`] = sponsor;
    }
    return map;
  }, [activeProjects]);

  const rawAlerts = usePersonTravelAlerts(personsMap, data.travelEntries);

  // Enrich alerts with project context
  // role key format passed to the hook is `owner-{projectId}` or `sponsor-{projectId}`
  const enriched = useMemo(() => {
    return rawAlerts.map((a) => {
      const parts = a.role.split("-");
      const pRole = parts[0]; // "owner" or "sponsor"
      const pId = parts.slice(1).join("-"); // rest is the project id
      const project = activeProjects.find((p) => p.id === pId);
      return { ...a, pRole, project };
    }).filter((a) => a.project);
  }, [rawAlerts, activeProjects]);

  const visibleAlerts = enriched.filter((a) => !dismissedIds.has(a.entry.id));

  function dismissAll(): void {
    const next = new Set(dismissedIds);
    for (const a of visibleAlerts) next.add(a.entry.id);
    writeDismissed(next);
    setDismissedIds(next);
  }

  if (visibleAlerts.length === 0) return null;

  return (
    <SectionCard
      title={`Travel alerts (${visibleAlerts.length})`}
      icon="travel"
      action={
        <Button appearance="subtle" size="small" onClick={dismissAll}>
          Dismiss all
        </Button>
      }
    >
      <div style={{ padding: "4px 16px 12px" }}>
        {visibleAlerts.map((a, i) => (
          <div key={i} style={{
            display: "flex",
            alignItems: "flex-start",
            columnGap: "10px",
            padding: "8px 0",
            borderBottom: i < visibleAlerts.length - 1 ? `1px solid ${tokens.colorNeutralStroke3}` : "none",
          }}>
            <span style={{ marginTop: "3px", flexShrink: 0, color: tokens.colorBrandForeground2 }}>
                <Icon name="plane" size={14} />
              </span>
            <div style={{ minWidth: 0, flexGrow: 1 }}>
              <Text size={300} weight="semibold" block>
                {a.person.name}
              </Text>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }} block>
                {a.pRole} on{" "}
                <Link to={`/projects/${a.project!.id}`} style={{ color: tokens.colorBrandForeground1 }}>
                  {a.project!.title}
                </Link>
                {" "}· travelling to {a.entry.site} {formatDate(a.entry.departureDate)}–{formatDate(a.entry.returnDate)}
              </Text>
            </div>
            {a.person.email && (
              <a
                href={`mailto:${a.person.email}`}
                style={{ flexShrink: 0, textDecoration: "none" }}
              >
                <Badge appearance="tint" color="brand" shape="rounded" size="small">
                  Email
                </Badge>
              </a>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function HomeContent({ data }: { data: PortfolioData }): JSX.Element {
  const s = useStyles();
  const navigate = useNavigate();
  const { projects, milestones, engagements } = data;

  const titleOf = (id: string) => projects.find((p) => p.id === id)?.title ?? id;

  const inDelivery = projects.filter((p) => p.stage === "Implementation").length;
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
        <StatCard label="In delivery" value={inDelivery} hint="In Implementation" accentColor="#3d8a4f" />
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

      <TravelAlertsList data={data} />

      <UpcomingTravelSection data={data} />

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
