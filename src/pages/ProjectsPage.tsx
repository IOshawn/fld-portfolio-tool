import { useMemo, useState } from "react";
import { makeStyles, shorthands, Button } from "@fluentui/react-components";
import { PageHeader } from "../components/PageHeader";
import { PortfolioGate } from "../components/PortfolioGate";
import {
  FilterBar,
  SearchInput,
  SelectFilter,
  ResultCount,
} from "../components/FilterBar";
import { ProjectCard } from "../components/ProjectCard";
import { ProjectEditDrawer } from "../components/ProjectEditDrawer";
import { EmptyState } from "../components/states";
import { Icon } from "../components/Icon";
import type { PortfolioData } from "../types/models";
import { personName, toPersonRef } from "../types/models";
import { distinctField, nextMilestone } from "../lib/selectors";
import { STAGE_ORDER } from "../lib/theme";
import { downloadCsv } from "../hooks/useExportCsv";

const useStyles = makeStyles({
  grid: {
    display: "grid",
    // On very narrow screens (< 340px) a 300px min would overflow; clamp it.
    gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))",
    ...shorthands.gap("16px"),
    alignItems: "start",
  },
});

function ProjectsContent({ data }: { data: PortfolioData }): JSX.Element {
  const s = useStyles();
  const { projects, milestones } = data;

  const [query, setQuery] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [stage, setStage] = useState("");
  const [status, setStatus] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const portfolios = useMemo(() => distinctField(projects, "portfolio"), [projects]);
  const stages = useMemo(
    () =>
      [...new Set(projects.map((p) => p.stage))].sort(
        (a, b) => STAGE_ORDER[a] - STAGE_ORDER[b]
      ),
    [projects]
  );
  const statuses = useMemo(() => distinctField(projects, "status"), [projects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects
      .filter((p) => (portfolio ? p.portfolio === portfolio : true))
      .filter((p) => (stage ? p.stage === stage : true))
      .filter((p) => (status ? p.status === status : true))
      .filter((p) => {
        if (!q) return true;
        return [p.title, personName(p.owner), personName(p.sponsor), p.nOrPCode, p.productArea, p.portfolio, p.summary]
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [projects, query, portfolio, stage, status]);

  const anyFilter = Boolean(query || portfolio || stage || status);
  const clear = () => {
    setQuery("");
    setPortfolio("");
    setStage("");
    setStatus("");
  };

  const handleExportCsv = () => {
    const rows = filtered.map((p) => {
      const owner = toPersonRef(p.owner);
      const sponsor = toPersonRef(p.sponsor);
      return {
        id: p.id,
        title: p.title,
        abbrev: p.abbrev,
        portfolio: p.portfolio,
        productArea: p.productArea,
        stage: p.stage,
        status: p.status,
        startDate: p.startDate,
        endDate: p.endDate,
        ownerName: owner.name,
        ownerEmail: owner.email,
        ownerCorpId: owner.corpId,
        sponsorName: sponsor.name,
        sponsorEmail: sponsor.email,
        fundingSource: p.fundingSource,
        nOrPCode: p.nOrPCode,
        summary: p.summary,
      };
    });
    downloadCsv(rows, "projects-export.csv");
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
        <PageHeader
          eyebrow="Projects"
          title="All projects"
          subtitle="Search and filter the full Frontline Digital portfolio."
        />
        <div style={{ display: "flex", gap: "8px", marginTop: "4px", flexShrink: 0 }}>
          <Button
            appearance="subtle"
            icon={<Icon name="download" size={16} />}
            onClick={handleExportCsv}
          >
            Export CSV
          </Button>
          <Button
            appearance="primary"
            icon={<Icon name="add" size={16} />}
            onClick={() => setCreateOpen(true)}
          >
            Create project or initiative
          </Button>
        </div>
      </div>

      <ProjectEditDrawer
        allProjects={projects}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      <FilterBar>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search name, owner, code…"
          label="Search"
        />
        <SelectFilter
          label="Portfolio"
          value={portfolio}
          options={portfolios}
          onChange={setPortfolio}
          allLabel="All portfolios"
        />
        <SelectFilter
          label="Stage"
          value={stage}
          options={stages}
          onChange={setStage}
          allLabel="All stages"
        />
        <SelectFilter
          label="Status"
          value={status}
          options={statuses}
          onChange={setStatus}
          allLabel="All statuses"
        />
        <ResultCount count={filtered.length} noun="project" />
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState
          icon="search"
          title="No projects found"
          message="No projects match your search and filters."
          action={
            anyFilter ? (
              <Button appearance="primary" onClick={clear}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className={s.grid}>
          {filtered.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              nextMilestone={nextMilestone(milestones, p.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}

export function ProjectsPage(): JSX.Element {
  return <PortfolioGate>{(data) => <ProjectsContent data={data} />}</PortfolioGate>;
}
