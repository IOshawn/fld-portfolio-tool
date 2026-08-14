import { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { makeStyles, shorthands, tokens, Text, Button, TabList, Tab } from "@fluentui/react-components";
import { PageHeader } from "../components/PageHeader";
import { PortfolioGate } from "../components/PortfolioGate";
import { FilterBar, SelectFilter, SelectFilterKV, ResultCount } from "../components/FilterBar";
import { StatCard } from "../components/cards";
import { EngagementMatrix, EngagementHeatmap } from "../components/EngagementMatrix";
import { InitiativeEngagementPanel } from "../components/InitiativeEngagementPanel";
import { EmptyState } from "../components/states";
import { Icon } from "../components/Icon";
import type { PortfolioData } from "../types/models";
import { ENGAGEMENT_STAGES, ENGAGEMENT_STATUSES, SITE_NAMES } from "../types/models";
import {
  applyEngagementFilters,
  anyFilterActive,
  activeSites,
  activeWorkAreas,
  EMPTY_ENGAGEMENT_FILTERS,
  type EngagementFilters,
} from "../lib/selectors";

const useStyles = makeStyles({
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    ...shorthands.gap("16px"),
    marginBottom: "20px",
  },
  tabs: { marginBottom: "16px" },
  pickWrap: { display: "flex", flexWrap: "wrap", ...shorthands.gap("8px"), marginBottom: "20px" },
  pick: {
    ...shorthands.padding("7px", "12px"),
    ...shorthands.borderRadius("999px"),
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "13px",
    fontWeight: 500,
    color: tokens.colorNeutralForeground1,
    ":hover": { backgroundColor: tokens.colorNeutralBackground1Hover },
  },
});

function EngagementsContent({ data }: { data: PortfolioData }): JSX.Element {
  const s = useStyles();
  const { projects, engagements, travelEntries } = data;
  const [params] = useSearchParams();
  const initialInitiative = params.get("initiative") ?? "";

  const [filters, setFilters] = useState<EngagementFilters>({
    ...EMPTY_ENGAGEMENT_FILTERS,
    initiativeId: initialInitiative,
  });

  const [tab, setTab] = useState<string>(() => {
    if (initialInitiative) return "initiative";
    return "matrix";
  });

  const set = (patch: Partial<EngagementFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const clear = () => setFilters(EMPTY_ENGAGEMENT_FILTERS);

  const filtered = useMemo(() => applyEngagementFilters(engagements, filters), [engagements, filters]);

  const initiativeOptions = useMemo(() => {
    const withEng = new Set(engagements.map((e) => e.initiativeId));
    return projects
      .filter((p) => withEng.has(p.id))
      .map((p) => ({ value: p.id, label: p.title }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [projects, engagements]);

  const siteOptions = useMemo(() => activeSites(engagements) as string[], [engagements]);
  const workAreaOptions = useMemo(() => activeWorkAreas(engagements) as string[], [engagements]);
  const portfolioOptions = useMemo(
    () => [...new Set(engagements.map((e) => e.portfolio))].sort(),
    [engagements]
  );

  const selectedProject = projects.find((p) => p.id === filters.initiativeId);

  // Travel indicator — count entries matching the current site filter (if any)
  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const travelCount = useMemo(() => {
    const active = (travelEntries ?? []).filter(
      (e) => e.departureDate <= todayISO && e.returnDate >= todayISO
    );
    if (filters.site) return active.filter((e) => e.site === filters.site).length;
    return active.length;
  }, [travelEntries, filters.site, todayISO]);

  const travelLinkParams = filters.site ? `?site=${filters.site}` : "";

  return (
    <>
      <PageHeader
        eyebrow="Deployments and Contact"
        title="Site Engagements"
        subtitle="Where Frontline Digital is deploying, visiting or engaging - by site, work area, team and project stage"
        actions={
          anyFilterActive(filters) ? (
            <Button appearance="secondary" onClick={clear}>
              Clear filters
            </Button>
          ) : undefined
        }
      />

      {travelCount > 0 ? (
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          columnGap: "6px",
          marginBottom: "16px",
          marginTop: "-8px",
          fontSize: "13px",
          color: tokens.colorBrandForeground2,
        }}>
          <Icon name="travel" size={14} />
          <Link
            to={`/travel${travelLinkParams}`}
            style={{ color: "inherit", fontWeight: 600, textDecoration: "none" }}
          >
            {travelCount} {travelCount === 1 ? "person" : "people"} currently travelling
            {filters.site ? ` to ${SITE_NAMES[filters.site as keyof typeof SITE_NAMES] ?? filters.site}` : ""}
          </Link>
        </div>
      ) : null}

      <div className={s.statGrid}>
        <StatCard label="Engagements" value={filtered.length} accentColor="#2f5e9e" />
        <StatCard label="Sites engaged" value={activeSites(filtered).length} accentColor="#2f9e8f" />
        <StatCard label="Work areas" value={activeWorkAreas(filtered).length} accentColor="#5f76b5" />
        <StatCard
          label="Active now"
          value={filtered.filter((e) => e.status === "Active").length}
          accentColor="#3d8a4f"
        />
      </div>

      <FilterBar>
        <SelectFilterKV
          label="Initiative"
          value={filters.initiativeId}
          options={initiativeOptions}
          onChange={(v) => set({ initiativeId: v })}
          allLabel="All initiatives"
        />
        <SelectFilter
          label="Site"
          value={filters.site}
          options={siteOptions}
          onChange={(v) => set({ site: v })}
          allLabel="All sites"
        />
        <SelectFilter
          label="Portfolio"
          value={filters.portfolio}
          options={portfolioOptions}
          onChange={(v) => set({ portfolio: v })}
          allLabel="All portfolios"
        />
        <SelectFilter
          label="Work area"
          value={filters.workArea}
          options={workAreaOptions}
          onChange={(v) => set({ workArea: v })}
          allLabel="All work areas"
        />
        <SelectFilter
          label="Status"
          value={filters.status}
          options={[...ENGAGEMENT_STATUSES]}
          onChange={(v) => set({ status: v })}
          allLabel="All statuses"
        />
        <SelectFilter
          label="Stage"
          value={filters.stage}
          options={[...ENGAGEMENT_STAGES]}
          onChange={(v) => set({ stage: v })}
          allLabel="All stages"
        />
        <ResultCount count={filtered.length} noun="engagement" />
      </FilterBar>

      <div className={s.tabs}>
        <TabList selectedValue={tab} onTabSelect={(_, d) => setTab(d.value as string)}>
          <Tab value="matrix">Matrix</Tab>
          <Tab value="heatmap">Heatmap</Tab>
          <Tab value="initiative">By initiative</Tab>
        </TabList>
      </div>

      {tab === "matrix" ? (
        filtered.length === 0 ? (
          <EmptyState icon="filter" title="No engagements match these filters" action={<Button appearance="primary" onClick={clear}>Clear filters</Button>} />
        ) : (
          <EngagementMatrix engagements={filtered} projects={projects} />
        )
      ) : null}

      {tab === "heatmap" ? (
        filtered.length === 0 ? (
          <EmptyState icon="filter" title="No engagements match these filters" action={<Button appearance="primary" onClick={clear}>Clear filters</Button>} />
        ) : (
          <EngagementHeatmap engagements={filtered} projects={projects} />
        )
      ) : null}

      {tab === "initiative" ? (
        selectedProject ? (
          <InitiativeEngagementPanel project={selectedProject} engagements={filtered} />
        ) : (
          <>
            <Text size={300} style={{ color: tokens.colorNeutralForeground3, display: "block", marginBottom: "12px" }}>
              Pick an initiative to see where it has reached across sites and teams.
            </Text>
            <div className={s.pickWrap}>
              {initiativeOptions.map((o) => (
                <button key={o.value} type="button" className={s.pick} onClick={() => set({ initiativeId: o.value })}>
                  {o.label}
                </button>
              ))}
            </div>
          </>
        )
      ) : null}
    </>
  );
}

export function EngagementsPage(): JSX.Element {
  return <PortfolioGate>{(data) => <EngagementsContent data={data} />}</PortfolioGate>;
}
