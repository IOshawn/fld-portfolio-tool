import { Link } from "react-router-dom";
import { makeStyles, shorthands, tokens, Text } from "@fluentui/react-components";
import type { Project } from "../types/models";
import { parseISO, today, formatDate } from "../lib/format";
import { statusBarColor } from "../lib/theme";

const YEARS = [2026, 2027, 2028];
const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

const DOMAIN_START = new Date(YEARS[0], 0, 1).getTime();
const DOMAIN_END = new Date(YEARS[YEARS.length - 1] + 1, 0, 1).getTime();
const SPAN = DOMAIN_END - DOMAIN_START;

const LABEL_W = 184;
const TRACK_MIN = 792; // 12 quarters * 66px

function fraction(ms: number): number {
  return Math.min(1, Math.max(0, (ms - DOMAIN_START) / SPAN));
}

const useStyles = makeStyles({
  scroll: {
    ...shorthands.overflow("auto", "hidden"),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
    ...shorthands.borderRadius("12px"),
    boxShadow: tokens.shadow2,
  },
  grid: {
    minWidth: `${LABEL_W + TRACK_MIN}px`,
  },
  headRow: {
    display: "grid",
    gridTemplateColumns: `${LABEL_W}px 1fr`,
    position: "sticky",
    top: 0,
    zIndex: 3,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke2),
  },
  headLabel: {
    position: "sticky",
    left: 0,
    zIndex: 4,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.padding("12px", "16px"),
    ...shorthands.borderRight("1px", "solid", tokens.colorNeutralStroke2),
    color: tokens.colorNeutralForeground3,
    fontWeight: 600,
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    display: "flex",
    alignItems: "flex-end",
  },
  headTrack: {
    display: "flex",
  },
  headYear: {
    flexGrow: 1,
    flexBasis: 0,
    ...shorthands.borderRight("1px", "solid", tokens.colorNeutralStroke2),
    ":last-child": {
      ...shorthands.borderRight("0"),
    },
  },
  headYearLabel: {
    ...shorthands.padding("8px", "12px", "4px", "12px"),
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
  },
  headQuarters: {
    display: "flex",
  },
  headQuarter: {
    flexGrow: 1,
    flexBasis: 0,
    ...shorthands.padding("0", "0", "6px", "12px"),
    color: tokens.colorNeutralForeground3,
    fontSize: "11px",
  },
  row: {
    display: "grid",
    gridTemplateColumns: `${LABEL_W}px 1fr`,
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground2,
    },
  },
  rowLabel: {
    position: "sticky",
    left: 0,
    zIndex: 2,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.padding("0", "16px"),
    ...shorthands.borderRight("1px", "solid", tokens.colorNeutralStroke2),
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke3),
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    rowGap: "1px",
    minWidth: 0,
  },
  rowLabelTitle: {
    fontWeight: 600,
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    ...shorthands.overflow("hidden"),
  },
  rowLabelSub: {
    color: tokens.colorNeutralForeground3,
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    ...shorthands.overflow("hidden"),
  },
  track: {
    position: "relative",
    height: "48px",
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke3),
    // Quarter gridlines (every 1/12) + stronger year lines (every 1/3).
    backgroundImage: `repeating-linear-gradient(to right, ${tokens.colorNeutralStroke3} 0 1px, transparent 1px calc(100% / 12)), repeating-linear-gradient(to right, ${tokens.colorNeutralStroke2} 0 1px, transparent 1px calc(100% / 3))`,
  },
  bar: {
    position: "absolute",
    top: "11px",
    height: "26px",
    ...shorthands.borderRadius("6px"),
    display: "flex",
    alignItems: "center",
    ...shorthands.padding("0", "8px"),
    ...shorthands.overflow("hidden"),
    color: "#ffffff",
    textDecorationLine: "none",
    boxShadow: tokens.shadow2,
    transitionProperty: "transform, box-shadow",
    transitionDuration: tokens.durationFast,
    ":hover": {
      transform: "translateY(-1px)",
      boxShadow: tokens.shadow8,
    },
  },
  barLabel: {
    fontSize: "11px",
    fontWeight: 600,
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    ...shorthands.overflow("hidden"),
    color: "#ffffff",
  },
  todayLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "2px",
    backgroundColor: tokens.colorBrandStroke1,
    zIndex: 1,
    pointerEvents: "none",
  },
  noDates: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "8px",
    display: "flex",
    alignItems: "center",
    color: tokens.colorNeutralForeground4,
    fontSize: "11px",
    fontStyle: "italic",
    pointerEvents: "none",
  },
  undatedSection: {
    marginTop: "16px",
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
    ...shorthands.borderRadius("12px"),
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow2,
    ...shorthands.overflow("hidden"),
  },
  undatedHeader: {
    ...shorthands.padding("10px", "16px"),
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke2),
    backgroundColor: tokens.colorNeutralBackground2,
    fontWeight: 600,
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: tokens.colorNeutralForeground3,
  },
  undatedList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    ...shorthands.padding("12px", "16px"),
  },
  undatedItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    ...shorthands.padding("4px", "12px"),
    ...shorthands.borderRadius("16px"),
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
    fontSize: "13px",
    fontWeight: 500,
    textDecorationLine: "none",
    transitionProperty: "background-color, box-shadow",
    transitionDuration: tokens.durationFast,
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground4,
      boxShadow: tokens.shadow4,
    },
  },
  undatedDot: {
    width: "8px",
    height: "8px",
    ...shorthands.borderRadius("50%"),
    flexShrink: 0,
  },
});

export function RoadmapTimeline({ projects }: { projects: Project[] }): JSX.Element {
  const s = useStyles();
  const todayMs = today().getTime();
  const todayF = fraction(todayMs);
  const showToday = todayMs > DOMAIN_START && todayMs < DOMAIN_END;
  const todayLeft = `${todayF * 100}%`;

  const datedProjects = projects.filter((p) => p.startDate || p.endDate);
  const undatedProjects = projects.filter((p) => !p.startDate && !p.endDate);

  return (
    <div>
      <div className={s.scroll}>
        <div className={s.grid}>
          {/* Header */}
          <div className={s.headRow}>
            <div className={s.headLabel}>Project</div>
            <div className={s.headTrack}>
              {YEARS.map((year) => (
                <div className={s.headYear} key={year}>
                  <div className={s.headYearLabel}>{year}</div>
                  <div className={s.headQuarters}>
                    {QUARTERS.map((q) => (
                      <div className={s.headQuarter} key={q}>
                        {q}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {datedProjects.map((p) => {
          const startMs = p.startDate ? parseISO(p.startDate).getTime() : NaN;
          const endMs = p.endDate ? parseISO(p.endDate).getTime() + 86_400_000 : NaN;
          const hasProjectDates = !isNaN(startMs) && !isNaN(endMs);
          const left = hasProjectDates ? fraction(startMs) : 0;
          const right = hasProjectDates ? fraction(endMs) : 0;
          const widthPct = hasProjectDates ? Math.max((right - left) * 100, 2) : 0;
          // Valid stage bars: both dates present, parseable, and not reversed.
          const stageBars = (p.projectStages ?? []).filter((st) => {
            if (!st.startDate || !st.endDate) return false;
            const a = parseISO(st.startDate).getTime();
            const b = parseISO(st.endDate).getTime();
            return !isNaN(a) && !isNaN(b) && a <= b;
          });

          if (stageBars.length > 0) {
            // Single row per project: all stage bars share one track.
            return (
              <div className={s.row} key={p.id}>
                <div className={s.rowLabel}>
                  <Text size={300} className={s.rowLabelTitle}>
                    {p.title}
                  </Text>
                  <Text size={200} className={s.rowLabelSub}>
                    {p.portfolio}
                  </Text>
                </div>
                <div className={s.track}>
                  {showToday ? <div className={s.todayLine} style={{ left: todayLeft }} /> : null}
                  {stageBars.map((stage) => {
                    const sStart = parseISO(stage.startDate).getTime();
                    const sEnd = parseISO(stage.endDate).getTime() + 86_400_000;
                    const sLeft = fraction(sStart);
                    const sRight = fraction(sEnd);
                    const sWidth = Math.max((sRight - sLeft) * 100, 1);
                    return (
                      <Link
                        key={stage.id}
                        to={`/projects/${p.id}`}
                        className={s.bar}
                        style={{
                          left: `${sLeft * 100}%`,
                          width: `${sWidth}%`,
                          backgroundColor: statusBarColor(stage.status),
                        }}
                        title={`${p.title} · ${stage.label} · ${formatDate(stage.startDate)} – ${formatDate(stage.endDate)}`}
                      >
                        <span className={s.barLabel}>{stage.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          }

          // Default: single project bar
          return (
            <div className={s.row} key={p.id}>
              <div className={s.rowLabel}>
                <Text size={300} className={s.rowLabelTitle}>
                  {p.title}
                </Text>
                <Text size={200} className={s.rowLabelSub}>
                  {p.portfolio}
                </Text>
              </div>
              <div className={s.track}>
                {showToday ? <div className={s.todayLine} style={{ left: todayLeft }} /> : null}
                {hasProjectDates ? (
                  <Link
                    to={`/projects/${p.id}`}
                    className={s.bar}
                    style={{
                      left: `${left * 100}%`,
                      width: `${widthPct}%`,
                      backgroundColor: statusBarColor(p.status),
                    }}
                    title={`${p.title} · ${p.stage} · ${formatDate(p.startDate)} – ${formatDate(p.endDate)}`}
                  >
                    <span className={s.barLabel}>{p.stage}</span>
                  </Link>
                ) : (
                  <span className={s.noDates}>No dates set</span>
                )}
              </div>
            </div>
          );
          })}
        </div>
      </div>

      {/* Undated projects section */}
      {undatedProjects.length > 0 && (
        <div className={s.undatedSection}>
          <div className={s.undatedHeader}>Undated projects</div>
          <div className={s.undatedList}>
            {undatedProjects.map((p) => (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className={s.undatedItem}
                title={p.portfolio ? `${p.title} · ${p.portfolio}` : p.title}
              >
                <span
                  className={s.undatedDot}
                  style={{ backgroundColor: statusBarColor(p.status) }}
                />
                {p.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
