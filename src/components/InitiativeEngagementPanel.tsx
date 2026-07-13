import { useMemo } from "react";
import { makeStyles, shorthands, tokens, Text, Badge } from "@fluentui/react-components";
import type { Engagement, Project, Site } from "../types/models";
import { SITE_NAMES, WORK_AREAS } from "../types/models";
import { SectionCard, StatCard } from "./cards";
import { EngagementStageBadge } from "./Badges";
import { EngagementListItem } from "./lists";
import {
  engagementsForInitiative,
  sitesForInitiative,
  workAreasForInitiative,
} from "../lib/selectors";

const useStyles = makeStyles({
  stack: { display: "flex", flexDirection: "column", ...shorthands.gap("16px") },
  statRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    ...shorthands.gap("12px"),
    marginBottom: "12px",
  },
  chips: { display: "flex", flexWrap: "wrap", ...shorthands.gap("8px") },
  label: { color: tokens.colorNeutralForeground3, marginBottom: "6px" },
  siteRow: {
    display: "flex",
    alignItems: "flex-start",
    columnGap: "12px",
    ...shorthands.padding("10px", "2px"),
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke3),
    ":last-child": { ...shorthands.borderBottom("0") },
  },
  siteName: { width: "150px", flexShrink: 0 },
  waChips: { display: "flex", flexWrap: "wrap", ...shorthands.gap("6px") },
  waPair: { display: "inline-flex", alignItems: "center", columnGap: "5px" },
  waText: { color: tokens.colorNeutralForeground2, fontSize: "12px" },
  bodyPad: { padding: "0 20px 8px" },
  muted: { color: tokens.colorNeutralForeground3, ...shorthands.padding("12px", "4px") },
});

/** Shared "Initiative view": where an initiative has reached across sites/teams. */
export function InitiativeEngagementPanel({
  project,
  engagements,
}: {
  project: Project;
  engagements: Engagement[];
}): JSX.Element {
  const s = useStyles();
  const mine = useMemo(
    () => engagementsForInitiative(engagements, project.id),
    [engagements, project.id]
  );
  const sites = useMemo(() => sitesForInitiative(engagements, project.id), [engagements, project.id]);
  const workAreas = useMemo(
    () => workAreasForInitiative(engagements, project.id),
    [engagements, project.id]
  );
  const activeCount = mine.filter((e) => e.status === "Active").length;
  const plannedCount = mine.filter((e) => e.status === "Planned").length;

  const bySite: { site: Site; items: Engagement[] }[] = sites.map((site) => ({
    site,
    items: mine
      .filter((e) => e.site === site)
      .sort((a, b) => WORK_AREAS.indexOf(a.workArea) - WORK_AREAS.indexOf(b.workArea)),
  }));

  if (mine.length === 0) {
    return (
      <SectionCard title="Engagements" icon="engagements">
        <Text className={s.muted}>No site engagements recorded for this initiative yet.</Text>
      </SectionCard>
    );
  }

  return (
    <div className={s.stack}>
      <SectionCard title="Engagement footprint" icon="engagements">
        <div className={s.statRow}>
          <StatCard label="Sites engaged" value={sites.length} />
          <StatCard label="Work areas" value={workAreas.length} />
          <StatCard label="Active" value={activeCount} accentColor="#3d8a4f" />
          <StatCard label="Planned" value={plannedCount} accentColor="#5f76b5" />
        </div>
        <Text size={200} className={s.label} block>
          Sites engaged
        </Text>
        <div className={s.chips} style={{ marginBottom: "14px" }}>
          {sites.map((site) => (
            <Badge key={site} appearance="tint" color="informative" shape="rounded">
              {site}
            </Badge>
          ))}
        </div>
        <Text size={200} className={s.label} block>
          Teams &amp; work areas engaged
        </Text>
        <div className={s.chips}>
          {workAreas.map((wa) => (
            <Badge key={wa} appearance="tint" color="brand" shape="rounded">
              {wa}
            </Badge>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Where it has reached — status by site" icon="grid" flush>
        <div className={s.bodyPad}>
          {bySite.map(({ site, items }) => (
            <div className={s.siteRow} key={site}>
              <div className={s.siteName}>
                <Text size={300} weight="semibold" block>
                  {site}
                </Text>
                <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                  {SITE_NAMES[site]}
                </Text>
              </div>
              <div className={s.waChips}>
                {items.map((e) => (
                  <span className={s.waPair} key={e.id}>
                    <span className={s.waText}>{e.workArea}</span>
                    <EngagementStageBadge stage={e.stage} />
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Deployment plan" icon="roadmap" flush>
        <div className={s.bodyPad}>
          {mine.map((e) => (
            <EngagementListItem key={e.id} engagement={e} initiativeTitle={project.title} mode="initiative" />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
