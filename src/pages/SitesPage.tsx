import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { makeStyles, shorthands, tokens, Text, Badge, mergeClasses } from "@fluentui/react-components";
import { PageHeader } from "../components/PageHeader";
import { PortfolioGate } from "../components/PortfolioGate";
import { SectionCard, StatCard } from "../components/cards";
import { EngagementListItem } from "../components/lists";
import { EngagementStageBadge } from "../components/Badges";
import { Icon } from "../components/Icon";
import type { PortfolioData, Site } from "../types/models";
import { SITE_NAMES } from "../types/models";
import {
  activeSites,
  engagementsForSite,
  initiativeIdsAtSite,
  furthestStage,
} from "../lib/selectors";
import { parseISO, today } from "../lib/format";

const useStyles = makeStyles({
  // ── Layout ────────────────────────────────────────────────────────────────
  grid: {
    display: "grid",
    gridTemplateColumns: "240px 1fr",
    ...shorthands.gap("16px"),
    alignItems: "start",
    "@media (max-width: 880px)": { gridTemplateColumns: "1fr" },
  },
  // ── Desktop sidebar list ──────────────────────────────────────────────────
  siteList: { display: "flex", flexDirection: "column", ...shorthands.padding("8px") },
  siteBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    columnGap: "10px",
    ...shorthands.padding("10px", "12px"),
    ...shorthands.borderRadius("8px"),
    ...shorthands.border("0"),
    backgroundColor: "transparent",
    color: tokens.colorNeutralForeground1,
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "inherit",
    ":hover": { backgroundColor: tokens.colorNeutralBackground1Hover },
  },
  siteBtnActive: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground2,
    ":hover": { backgroundColor: tokens.colorBrandBackground2 },
  },
  siteBtnName: { fontWeight: 600, fontSize: "14px" },
  siteBtnSub: { fontSize: "11px", color: tokens.colorNeutralForeground3 },
  pill: {
    fontVariantNumeric: "tabular-nums",
    fontSize: "12px",
    color: tokens.colorNeutralForeground3,
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.padding("1px", "8px"),
    ...shorthands.borderRadius("10px"),
    flexShrink: 0,
  },
  // ── Mobile horizontal chip strip ──────────────────────────────────────────
  mobileStrip: {
    display: "none",
    "@media (max-width: 880px)": {
      display: "flex",
      ...shorthands.overflow("auto", "hidden"),
      ...shorthands.gap("8px"),
      ...shorthands.padding("4px", "0", "12px", "0"),
      scrollbarWidth: "none",
    },
  },
  mobileChip: {
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "center",
    flexShrink: 0,
    ...shorthands.padding("8px", "14px"),
    ...shorthands.borderRadius("10px"),
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: "pointer",
    fontFamily: "inherit",
    ":hover": { backgroundColor: tokens.colorNeutralBackground1Hover },
  },
  mobileChipActive: {
    backgroundColor: tokens.colorBrandBackground2,
    ...shorthands.border("1px", "solid", tokens.colorBrandStroke1),
    color: tokens.colorBrandForeground2,
    ":hover": { backgroundColor: tokens.colorBrandBackground2 },
  },
  mobileChipName: { fontWeight: 700, fontSize: "13px", whiteSpace: "nowrap" },
  mobileChipCount: { fontSize: "11px", color: "inherit", opacity: 0.7, whiteSpace: "nowrap" },
  // Hide desktop sidebar card on mobile
  desktopSidebarCard: {
    "@media (max-width: 880px)": {
      display: "none",
    },
  },
  // ── Detail column ─────────────────────────────────────────────────────────
  col: { display: "flex", flexDirection: "column", ...shorthands.gap("16px"), minWidth: 0 },
  head: { display: "flex", alignItems: "center", columnGap: "10px", marginBottom: "2px", flexWrap: "wrap" },
  statRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    ...shorthands.gap("12px"),
  },
  initRow: {
    display: "flex",
    alignItems: "center",
    columnGap: "12px",
    textDecorationLine: "none",
    color: "inherit",
    ...shorthands.padding("11px", "4px"),
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke3),
    ":last-child": { ...shorthands.borderBottom("0") },
    ":hover": { backgroundColor: tokens.colorNeutralBackground2 },
  },
  initBody: { minWidth: 0, flexGrow: 1 },
  initTitle: { fontWeight: 600 },
  initSub: { color: tokens.colorNeutralForeground3 },
  chips: { display: "flex", flexWrap: "wrap", ...shorthands.gap("8px") },
  bodyPad: { padding: "0 20px 8px" },
  muted: { color: tokens.colorNeutralForeground3, ...shorthands.padding("12px", "4px") },
});

function SitesContent({ data }: { data: PortfolioData }): JSX.Element {
  const s = useStyles();
  const { projects, engagements } = data;
  const [params] = useSearchParams();
  const sites = useMemo(() => activeSites(engagements), [engagements]);

  const paramSite = params.get("site");
  const initialSite =
    paramSite && sites.includes(paramSite as Site) ? (paramSite as Site) : sites[0];
  const [selected, setSelected] = useState<Site>(initialSite);

  const titleOf = (id: string) => projects.find((p) => p.id === id)?.title ?? id;
  const countFor = (site: Site) => engagements.filter((e) => e.site === site).length;

  const siteEngagements = useMemo(
    () => engagementsForSite(engagements, selected),
    [engagements, selected]
  );

  const now = today().getTime();
  const upcoming = siteEngagements.filter(
    (e) => parseISO(e.startDate).getTime() >= now && e.status !== "Complete"
  );

  const workAreas = useMemo(
    () => [...new Set(siteEngagements.map((e) => e.workArea))],
    [siteEngagements]
  );

  const initiatives = useMemo(() => {
    return initiativeIdsAtSite(engagements, selected)
      .map((id) => {
        const items = siteEngagements.filter((e) => e.initiativeId === id);
        return {
          id,
          title: titleOf(id),
          stage: furthestStage(items),
          areas: new Set(items.map((e) => e.workArea)).size,
        };
      })
      .sort((a, b) => a.title.localeCompare(b.title));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagements, selected, siteEngagements]);

  return (
    <>
      <PageHeader
        eyebrow="Sites"
        title="What's happening at each site"
        subtitle="Pick a site to see the initiatives, teams and engagement activity in one place."
      />

      {/* Mobile: horizontal chip strip of sites */}
      <div className={s.mobileStrip} role="listbox" aria-label="Select a site">
        {sites.map((site) => (
          <button
            key={site}
            type="button"
            role="option"
            aria-selected={site === selected}
            className={mergeClasses(s.mobileChip, site === selected && s.mobileChipActive)}
            onClick={() => setSelected(site)}
          >
            <span className={s.mobileChipName}>{site}</span>
            <span className={s.mobileChipCount}>{countFor(site)} eng</span>
          </button>
        ))}
      </div>

      <div className={s.grid}>
        {/* Desktop: sidebar list inside a card */}
        <div className={s.desktopSidebarCard}>
          <SectionCard title={`Sites (${sites.length})`} icon="sites" flush>
            <div className={s.siteList}>
              {sites.map((site) => (
                <button
                  key={site}
                  type="button"
                  className={mergeClasses(s.siteBtn, site === selected && s.siteBtnActive)}
                  onClick={() => setSelected(site)}
                  aria-pressed={site === selected}
                >
                  <span>
                    <span className={s.siteBtnName}>{site}</span>
                    <br />
                    <span className={s.siteBtnSub}>{SITE_NAMES[site]}</span>
                  </span>
                  <span className={s.pill}>{countFor(site)}</span>
                </button>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className={s.col}>
          <div className={s.head}>
            <Icon name="location" size={22} />
            <Text size={600} weight="bold">
              {selected}
            </Text>
            <Text size={400} style={{ color: tokens.colorNeutralForeground3 }}>
              {SITE_NAMES[selected]}
            </Text>
          </div>

          <div className={s.statRow}>
            <StatCard label="Initiatives" value={initiatives.length} accentColor="#2f5e9e" />
            <StatCard label="Work areas / teams" value={workAreas.length} accentColor="#5f76b5" />
            <StatCard label="Engagements" value={siteEngagements.length} accentColor="#2f9e8f" />
            <StatCard label="Upcoming" value={upcoming.length} accentColor="#c2902a" />
          </div>

          <SectionCard title={`Active initiatives (${initiatives.length})`} icon="projects" flush>
            <div className={s.bodyPad}>
              {initiatives.length === 0 ? (
                <Text className={s.muted}>No initiatives engaging this site.</Text>
              ) : (
                initiatives.map((it) => (
                  <Link key={it.id} to={`/projects/${it.id}`} className={s.initRow}>
                    <div className={s.initBody}>
                      <Text size={300} className={s.initTitle} block>
                        {it.title}
                      </Text>
                      <Text size={200} className={s.initSub}>
                        Engaged across {it.areas} work area{it.areas === 1 ? "" : "s"}
                      </Text>
                    </div>
                    {it.stage ? <EngagementStageBadge stage={it.stage} /> : null}
                  </Link>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard title="Impacted teams & work areas" icon="team">
            {workAreas.length === 0 ? (
              <Text className={s.muted}>No teams engaged yet.</Text>
            ) : (
              <div className={s.chips}>
                {workAreas.map((wa) => (
                  <Badge key={wa} appearance="tint" color="brand" shape="rounded">
                    {wa} Team
                  </Badge>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title={`Upcoming engagements (${upcoming.length})`} icon="calendar" flush>
            <div className={s.bodyPad}>
              {upcoming.length === 0 ? (
                <Text className={s.muted}>No upcoming engagements at this site.</Text>
              ) : (
                upcoming.map((e) => (
                  <EngagementListItem key={e.id} engagement={e} initiativeTitle={titleOf(e.initiativeId)} mode="site" />
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard title={`Engagement timeline (${siteEngagements.length})`} icon="clock" flush>
            <div className={s.bodyPad}>
              {siteEngagements.length === 0 ? (
                <Text className={s.muted}>No engagement activity recorded.</Text>
              ) : (
                siteEngagements.map((e) => (
                  <EngagementListItem key={e.id} engagement={e} initiativeTitle={titleOf(e.initiativeId)} mode="site" />
                ))
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}

export function SitesPage(): JSX.Element {
  return <PortfolioGate>{(data) => <SitesContent data={data} />}</PortfolioGate>;
}
