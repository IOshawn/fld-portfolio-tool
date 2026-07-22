/**
 * TravelPage — /travel
 *
 * Shows a Travel & Roster calendar and list for site travel tracking.
 * Linked to the Engagements data model; uses the same sites, work areas,
 * and team enums.
 */
import { useState } from "react";
import {
  makeStyles,
  shorthands,
  Button,
  TabList,
  Tab,
} from "@fluentui/react-components";
import { PageHeader } from "../components/PageHeader";
import { PortfolioGate } from "../components/PortfolioGate";
import { StatCard } from "../components/cards";
import { TravelCalendar } from "../components/TravelCalendar";
import { TravelList } from "../components/TravelList";
import { TravelEntryForm } from "../components/TravelEntryForm";
import { portfolioStore } from "../store/portfolioStore";
import type { PortfolioData, TravelEntry } from "../types/models";

const useStyles = makeStyles({
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    ...shorthands.gap("16px"),
    marginBottom: "20px",
  },
  tabs: {
    marginBottom: "16px",
  },
});

function TravelContent({ data }: { data: PortfolioData }): JSX.Element {
  const s = useStyles();
  const { projects, travelEntries } = data;

  const [tab, setTab] = useState<string>("calendar");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<TravelEntry | null>(null);

  const openAdd = () => { setEditEntry(null); setPanelOpen(true); };
  const openEdit = (entry: TravelEntry) => { setEditEntry(entry); setPanelOpen(true); };
  const closePanel = () => { setPanelOpen(false); setEditEntry(null); };

  const planned = travelEntries.filter((e) => e.status === "Planned");
  const travelling = travelEntries.filter((e) => e.status === "Travelling");
  const uniquePeople = [...new Set(travelEntries.map((e) => e.person))];

  const handleSave = async (input: Omit<TravelEntry, "id"> & { id?: string }) => {
    await portfolioStore.saveTravelEntry({
      id: input.id,
      person: input.person,
      initiativeId: input.initiativeId,
      site: input.site,
      workArea: input.workArea,
      team: input.team,
      departureDate: input.departureDate,
      returnDate: input.returnDate,
      flightNumber: input.flightNumber,
      description: input.description,
      status: input.status,
      associatedWith: input.associatedWith,
    });
  };

  const handleDelete = async (id: string) => {
    await portfolioStore.deleteTravelEntry(id);
  };

  return (
    <>
      <PageHeader
        eyebrow="Site Deployments"
        title="Travel & Roster"
        subtitle="Track and plan site visits, field deployments, and team travel across all Frontline Digital initiatives"
        actions={
          <Button appearance="primary" onClick={openAdd}>
            Log travel
          </Button>
        }
      />

      <div className={s.statGrid}>
        <StatCard label="Total entries" value={travelEntries.length} accentColor="#2f5e9e" />
        <StatCard label="Currently away" value={travelling.length} accentColor="#3d8a4f" />
        <StatCard label="Planned trips" value={planned.length} accentColor="#5f76b5" />
        <StatCard label="People travelling" value={uniquePeople.length} accentColor="#2f9e8f" />
      </div>

      <div className={s.tabs}>
        <TabList selectedValue={tab} onTabSelect={(_, d) => setTab(d.value as string)}>
          <Tab value="calendar">Calendar</Tab>
          <Tab value="list">Roster list</Tab>
        </TabList>
      </div>

      {tab === "calendar" ? (
        <TravelCalendar entries={travelEntries} projects={projects} onEdit={openEdit} />
      ) : null}

      {tab === "list" ? (
        <TravelList entries={travelEntries} projects={projects} onAdd={openAdd} onEdit={openEdit} />
      ) : null}

      <TravelEntryForm
        open={panelOpen}
        entry={editEntry}
        projects={projects}
        allEntries={travelEntries}
        onSave={handleSave}
        onDelete={editEntry ? handleDelete : undefined}
        onClose={closePanel}
      />
    </>
  );
}

export function TravelPage(): JSX.Element {
  return <PortfolioGate>{(data) => <TravelContent data={data} />}</PortfolioGate>;
}
