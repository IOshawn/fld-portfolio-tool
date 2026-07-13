import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { makeStyles, shorthands, tokens, Text } from "@fluentui/react-components";
import type { Engagement, Project, Site, WorkArea } from "../types/models";
import { SITES, WORK_AREAS, SITE_NAMES, ENGAGEMENT_STAGES } from "../types/models";
import { buildMatrix, cellKey } from "../lib/selectors";
import { stageColor, engagementStageOrder } from "../lib/theme";
import { EngagementStageBadge } from "./Badges";
import { formatDate } from "../lib/format";

const HEAT_BASE = "47, 94, 158"; // rgb for the density ramp

const useStyles = makeStyles({
  scroll: {
    ...shorthands.overflow("auto"),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
    ...shorthands.borderRadius("12px"),
    boxShadow: tokens.shadow2,
  },
  grid: {
    display: "grid",
    minWidth: "880px",
  },
  corner: {
    position: "sticky",
    top: 0,
    left: 0,
    zIndex: 5,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRight("1px", "solid", tokens.colorNeutralStroke2),
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke2),
    ...shorthands.padding("10px", "12px"),
    color: tokens.colorNeutralForeground3,
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    display: "flex",
    alignItems: "flex-end",
  },
  colHead: {
    position: "sticky",
    top: 0,
    zIndex: 3,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke2),
    ...shorthands.borderRight("1px", "solid", tokens.colorNeutralStroke3),
    ...shorthands.padding("8px", "6px"),
    textAlign: "center",
    color: tokens.colorNeutralForeground1,
    fontWeight: 600,
    fontSize: "12px",
    textDecorationLine: "none",
    ":hover": { backgroundColor: tokens.colorNeutralBackground1Hover },
  },
  rowHead: {
    position: "sticky",
    left: 0,
    zIndex: 2,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRight("1px", "solid", tokens.colorNeutralStroke2),
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke3),
    ...shorthands.padding("8px", "12px"),
    fontWeight: 600,
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
  },
  cell: {
    ...shorthands.borderRight("1px", "solid", tokens.colorNeutralStroke3),
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke3),
    ...shorthands.padding("5px"),
    minHeight: "44px",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    ...shorthands.gap("3px"),
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    height: "19px",
    ...shorthands.padding("0", "6px"),
    ...shorthands.borderRadius("5px"),
    color: "#ffffff",
    fontSize: "11px",
    fontWeight: 700,
    textDecorationLine: "none",
    transitionProperty: "transform",
    transitionDuration: tokens.durationFaster,
    ":hover": { transform: "translateY(-1px)" },
  },
  heatCell: {
    ...shorthands.border("0"),
    ...shorthands.padding("0"),
    ...shorthands.borderRight("1px", "solid", tokens.colorNeutralStroke3),
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke3),
    minHeight: "44px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontVariantNumeric: "tabular-nums",
    fontWeight: 700,
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    ":hover": { outlineWidth: "2px", outlineStyle: "solid", outlineColor: tokens.colorBrandStroke1, outlineOffset: "-2px" },
  },
  heatSelected: {
    outlineWidth: "2px",
    outlineStyle: "solid",
    outlineColor: tokens.colorBrandStroke1,
    outlineOffset: "-2px",
  },
  drill: {
    marginTop: "16px",
    ...shorthands.padding("16px", "18px"),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
    ...shorthands.borderRadius("12px"),
    boxShadow: tokens.shadow2,
  },
  drillRow: {
    display: "flex",
    alignItems: "center",
    columnGap: "10px",
    ...shorthands.padding("8px", "2px"),
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke3),
    ":last-child": { ...shorthands.borderBottom("0") },
    textDecorationLine: "none",
    color: "inherit",
    ":hover": { backgroundColor: tokens.colorNeutralBackground2 },
  },
  legend: {
    display: "flex",
    alignItems: "center",
    columnGap: "14px",
    rowGap: "8px",
    flexWrap: "wrap",
    marginTop: "14px",
  },
  legendItem: { display: "flex", alignItems: "center", columnGap: "6px" },
  swatch: { width: "12px", height: "12px", ...shorthands.borderRadius("3px") },
  muted: { color: tokens.colorNeutralForeground3 },
});

function useProjectMap(projects: Project[]) {
  return useMemo(() => {
    const m = new Map<string, Project>();
    for (const p of projects) m.set(p.id, p);
    return m;
  }, [projects]);
}

function gridColumns(cols: number): string {
  return `184px repeat(${cols}, minmax(62px, 1fr))`;
}

export function StageLegend(): JSX.Element {
  const s = useStyles();
  return (
    <div className={s.legend}>
      <Text size={200} weight="semibold">
        Stage
      </Text>
      {ENGAGEMENT_STAGES.map((st) => (
        <span className={s.legendItem} key={st}>
          <span className={s.swatch} style={{ backgroundColor: stageColor(st) }} />
          <Text size={200}>{st}</Text>
        </span>
      ))}
    </div>
  );
}

/** Master Work Area × Site matrix; cells show initiative chips coloured by stage. */
export function EngagementMatrix({
  engagements,
  projects,
}: {
  engagements: Engagement[];
  projects: Project[];
}): JSX.Element {
  const s = useStyles();
  const projectMap = useProjectMap(projects);
  const matrix = useMemo(() => buildMatrix(engagements), [engagements]);

  return (
    <>
      <div className={s.scroll}>
        <div className={s.grid} style={{ gridTemplateColumns: gridColumns(SITES.length) }}>
          <div className={s.corner}>Work Area</div>
          {SITES.map((site) => (
            <Link key={site} to={`/sites?site=${encodeURIComponent(site)}`} className={s.colHead} title={SITE_NAMES[site]}>
              {site}
            </Link>
          ))}

          {WORK_AREAS.map((wa) => (
            <RowFragment key={wa} workArea={wa}>
              <div className={s.rowHead}>{wa}</div>
              {SITES.map((site) => {
                const items = (matrix.get(cellKey(wa, site)) ?? []).slice().sort(
                  (a, b) => engagementStageOrder(b.stage) - engagementStageOrder(a.stage)
                );
                return (
                  <div className={s.cell} key={site}>
                    {items.map((e) => {
                      const p = projectMap.get(e.initiativeId);
                      return (
                        <Link
                          key={e.id}
                          to={`/projects/${e.initiativeId}`}
                          className={s.chip}
                          style={{ backgroundColor: stageColor(e.stage) }}
                          title={`${p?.title ?? e.initiativeId} · ${e.stage} · ${e.status}`}
                        >
                          {p?.abbrev ?? "?"}
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </RowFragment>
          ))}
        </div>
      </div>
      <StageLegend />
    </>
  );
}

// React fragment helper that keeps grid items as direct children of the grid.
function RowFragment({ children }: { workArea: WorkArea; children: ReactNode }): JSX.Element {
  return <>{children}</>;
}

/** Density heatmap; cells coloured by number of initiatives, click to drill. */
export function EngagementHeatmap({
  engagements,
  projects,
}: {
  engagements: Engagement[];
  projects: Project[];
}): JSX.Element {
  const s = useStyles();
  const projectMap = useProjectMap(projects);
  const matrix = useMemo(() => buildMatrix(engagements), [engagements]);
  const [selected, setSelected] = useState<{ wa: WorkArea; site: Site } | null>(null);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    let max = 0;
    for (const wa of WORK_AREAS) {
      for (const site of SITES) {
        const items = matrix.get(cellKey(wa, site)) ?? [];
        const n = new Set(items.map((e) => e.initiativeId)).size;
        m.set(cellKey(wa, site), n);
        if (n > max) max = n;
      }
    }
    return { m, max: Math.max(1, max) };
  }, [matrix]);

  const selItems = selected ? (matrix.get(cellKey(selected.wa, selected.site)) ?? []) : [];

  return (
    <>
      <div className={s.scroll}>
        <div className={s.grid} style={{ gridTemplateColumns: gridColumns(SITES.length) }}>
          <div className={s.corner}>Work Area</div>
          {SITES.map((site) => (
            <Link key={site} to={`/sites?site=${encodeURIComponent(site)}`} className={s.colHead} title={SITE_NAMES[site]}>
              {site}
            </Link>
          ))}

          {WORK_AREAS.map((wa) => (
            <RowFragment key={wa} workArea={wa}>
              <div className={s.rowHead}>{wa}</div>
              {SITES.map((site) => {
                const n = counts.m.get(cellKey(wa, site)) ?? 0;
                const alpha = n === 0 ? 0 : 0.16 + 0.84 * (n / counts.max);
                const isSel = selected?.wa === wa && selected?.site === site;
                return (
                  <button
                    type="button"
                    key={site}
                    className={`${s.heatCell}${isSel ? " " + s.heatSelected : ""}`}
                    style={{
                      backgroundColor: n === 0 ? "transparent" : `rgba(${HEAT_BASE}, ${alpha})`,
                      color: alpha > 0.55 ? "#ffffff" : tokens.colorNeutralForeground2,
                    }}
                    onClick={() => setSelected(n > 0 ? { wa, site } : null)}
                    aria-label={`${wa} at ${site}: ${n} initiatives`}
                    disabled={n === 0}
                  >
                    {n > 0 ? n : ""}
                  </button>
                );
              })}
            </RowFragment>
          ))}
        </div>
      </div>

      {selected && selItems.length > 0 ? (
        <div className={s.drill}>
          <Text size={400} weight="semibold" block>
            {selected.wa} · {selected.site}{" "}
            <Text size={200} className={s.muted}>
              ({SITE_NAMES[selected.site]})
            </Text>
          </Text>
          <div style={{ marginTop: "8px" }}>
            {selItems
              .slice()
              .sort((a, b) => engagementStageOrder(b.stage) - engagementStageOrder(a.stage))
              .map((e) => (
                <Link key={e.id} to={`/projects/${e.initiativeId}`} className={s.drillRow}>
                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <Text size={300} weight="semibold" block>
                      {projectMap.get(e.initiativeId)?.title ?? e.initiativeId}
                    </Text>
                    <Text size={200} className={s.muted}>
                      {e.team} · {e.purpose}
                    </Text>
                  </div>
                  <Text size={200} className={s.muted}>
                    {formatDate(e.startDate)}
                  </Text>
                  <EngagementStageBadge stage={e.stage} />
                </Link>
              ))}
          </div>
        </div>
      ) : (
        <Text size={200} className={s.muted} style={{ display: "block", marginTop: "12px" }}>
          Tip: click a cell to see the initiatives engaging that work area and site.
        </Text>
      )}
    </>
  );
}
