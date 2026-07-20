import { useMemo, useState } from "react";
import { makeStyles, shorthands, tokens, Text, Button } from "@fluentui/react-components";
import { PageHeader } from "../components/PageHeader";
import { PortfolioGate } from "../components/PortfolioGate";
import { FilterBar, SelectFilter, ResultCount } from "../components/FilterBar";
import { RoadmapTimeline } from "../components/RoadmapTimeline";
import { EmptyState } from "../components/states";
import { Icon } from "../components/Icon";
import type { PortfolioData } from "../types/models";
import { STATUSES } from "../types/models";
import { distinctField, activeSites, activeWorkAreas } from "../lib/selectors";
import { STAGE_ORDER, statusBarColor } from "../lib/theme";

const useStyles = makeStyles({
  legend: {
    display: "flex",
    alignItems: "center",
    columnGap: "18px",
    rowGap: "8px",
    flexWrap: "wrap",
    marginTop: "14px",
    color: tokens.colorNeutralForeground3,
  },
  legendItem: { display: "flex", alignItems: "center", columnGap: "7px" },
  swatch: { width: "12px", height: "12px", ...shorthands.borderRadius("3px") },
  scrollHint: {
    display: "none",
    "@media (max-width: 820px)": {
      display: "flex",
      alignItems: "center",
      columnGap: "8px",
      ...shorthands.padding("10px", "14px"),
      ...shorthands.borderRadius("8px"),
      backgroundColor: tokens.colorNeutralBackground2,
      ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
      color: tokens.colorNeutralForeground2,
      fontSize: "13px",
      marginBottom: "12px",
    },
  },
  scrollHintIcon: {
    flexShrink: 0,
    color: tokens.colorBrandForeground2,
  },
});

function RoadmapContent({ data }: { data: PortfolioData }): JSX.Element {
  const s = useStyles();
  const { projects, engagements } = data;

  const [portfolio, setPortfolio] = useState("");
  const [site, setSite] = useState("");
  const [workArea, setWorkArea] = useState("");
  const [productArea, setProductArea] = useState("");
  const [stage, setStage] = useState("");

  const portfolios = useMemo(() => distinctField(projects, "portfolio"), [projects]);
  const productAreas = useMemo(() => distinctField(projects, "productArea"), [projects]);
  const sites = useMemo(() => activeSites(engagements) as string[], [engagements]);
  const workAreas = useMemo(() => activeWorkAreas(engagements) as string[], [engagements]);
  const stages = useMemo(
    () => [...new Set(projects.map((p) => p.stage))].sort((a, b) => STAGE_ORDER[a] - STAGE_ORDER[b]),
    [projects]
  );

  // Site / work-area membership per initiative (via its engagements).
  const sitesByProject = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const e of engagements) {
      if (!m.has(e.initiativeId)) m.set(e.initiativeId, new Set());
      m.get(e.initiativeId)!.add(e.site);
    }
    return m;
  }, [engagements]);
  const waByProject = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const e of engagements) {
      if (!m.has(e.initiativeId)) m.set(e.initiativeId, new Set());
      m.get(e.initiativeId)!.add(e.workArea);
    }
    return m;
  }, [engagements]);

  const filtered = useMemo(
    () =>
      projects
        .filter((p) => (portfolio ? p.portfolio === portfolio : true))
        .filter((p) => (productArea ? p.productArea === productArea : true))
        .filter((p) => (stage ? p.stage === stage : true))
        .filter((p) => (site ? sitesByProject.get(p.id)?.has(site) ?? false : true))
        .filter((p) => (workArea ? waByProject.get(p.id)?.has(workArea) ?? false : true))
        .sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [projects, portfolio, productArea, stage, site, workArea, sitesByProject, waByProject]
  );

  const anyFilter = Boolean(portfolio || site || workArea || productArea || stage);
  const clear = () => {
    setPortfolio("");
    setSite("");
    setWorkArea("");
    setProductArea("");
    setStage("");
  };

  return (
    <>
      <PageHeader
        eyebrow="Portfolio Roadmap"
        title="Portfolio Roadmap 2026–2028"
        subtitle="Generated live from initiative start and end dates — no manual slides."
        actions={anyFilter ? <Button appearance="secondary" onClick={clear}>Clear filters</Button> : undefined}
      />

      <FilterBar>
        <SelectFilter label="Portfolio" value={portfolio} options={portfolios} onChange={setPortfolio} allLabel="All portfolios" />
        <SelectFilter label="Site" value={site} options={sites} onChange={setSite} allLabel="All sites" />
        <SelectFilter label="Work area" value={workArea} options={workAreas} onChange={setWorkArea} allLabel="All work areas" />
        <SelectFilter label="Product area" value={productArea} options={productAreas} onChange={setProductArea} allLabel="All product areas" />
        <SelectFilter label="Stage" value={stage} options={stages} onChange={setStage} allLabel="All stages" />
        <ResultCount count={filtered.length} noun="initiative" />
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState
          icon="filter"
          title="No initiatives match these filters"
          message="Try widening the portfolio, site, work area, product area or stage selection."
          action={<Button appearance="primary" onClick={clear}>Clear filters</Button>}
        />
      ) : (
        <>
          <div className={s.scrollHint}>
            <span className={s.scrollHintIcon}>
              <Icon name="roadmap" size={16} />
            </span>
            <Text size={200}>Scroll sideways to see the full 2026–2028 timeline.</Text>
          </div>
          <RoadmapTimeline projects={filtered} />
          <div className={s.legend}>
            <Text size={200} weight="semibold">
              Status
            </Text>
            {STATUSES.map((st) => (
              <span className={s.legendItem} key={st}>
                <span className={s.swatch} style={{ backgroundColor: statusBarColor(st) }} />
                <Text size={200}>{st}</Text>
              </span>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export function RoadmapPage(): JSX.Element {
  return <PortfolioGate>{(data) => <RoadmapContent data={data} />}</PortfolioGate>;
}
