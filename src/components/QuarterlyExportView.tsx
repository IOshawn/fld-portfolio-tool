/**
 * QuarterlyExportView — off-screen slide renderer for html2canvas capture.
 *
 * Uses ONLY inline styles (no Fluent UI, no makeStyles) so that html2canvas
 * can reliably paint every element without needing class-name resolution.
 */
import { type QuarterlyMilestone, type PortfolioArea, QUARTERLY_PORTFOLIO_AREAS } from "../types/quarterly";
import { type QuarterInfo } from "../lib/format";
import { forwardRef, useMemo } from "react";

// ---------------------------------------------------------------------------
// Key helpers (must match QuarterlyPage.tsx)
// ---------------------------------------------------------------------------
const initKey = (area: PortfolioArea, name: string) => `${area}|${name}`;
const chipKey = (id: string) => `chip:${id}`;
const areaKey = (area: PortfolioArea) => `area:${area}`;

// ---------------------------------------------------------------------------
// Colour tokens (self-contained — no Fluent UI)
// ---------------------------------------------------------------------------
const AREA_COLORS: Record<PortfolioArea, string> = {
  "Frontline Maintenance":              "#1d4ed8",
  "Operations & Decision Intelligence": "#7c3aed",
  "Frontline HSE":                      "#059669",
  "Frontline People & AI":              "#b45309",
};

// ---------------------------------------------------------------------------
// Sub-components (all inline styles)
// ---------------------------------------------------------------------------

function ExportChip({ milestone, milestoneId, dateLabel, muted, getText }: {
  milestone: string;
  milestoneId: string;
  dateLabel: string;
  muted: boolean;
  getText: (key: string, fallback: string) => string;
}): JSX.Element {
  const label = getText(chipKey(milestoneId), milestone);
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "2px 8px",
      borderRadius: 999,
      border: `1px solid ${muted ? "#e0e0e0" : "#d6d6d6"}`,
      backgroundColor: muted ? "#fafafa" : "#f3f4f6",
      color: muted ? "#999" : "#374151",
      fontSize: 11,
      fontWeight: 500,
      whiteSpace: "nowrap",
      lineHeight: "1.5",
    }}>
      {label}
      <span style={{ opacity: 0.55, fontWeight: 400, marginLeft: 2 }}>{dateLabel}</span>
    </span>
  );
}

function ExportInitiativeRow({ name, area, description, items, quarterEnd, getText }: {
  name: string;
  area: PortfolioArea;
  description?: string;
  items: QuarterlyMilestone[];
  quarterEnd: string;
  getText: (key: string, fallback: string) => string;
}): JSX.Element {
  const sorted = [...items].sort((a, b) => a.targetDate.localeCompare(b.targetDate));
  const label = getText(initKey(area, name), name);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "160px 1fr",
      columnGap: 10,
      alignItems: "start",
      padding: "7px 0",
      borderBottom: "1px solid #f0f0f0",
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 1 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#1a1a2e", wordBreak: "break-word", lineHeight: 1.3 }}>
          {label}
        </span>
        {description && (
          <span style={{ fontSize: 9.5, color: "#888", lineHeight: 1.3 }}>{description}</span>
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {sorted.map((m) => (
          <ExportChip
            key={m.id}
            milestone={m.milestone}
            milestoneId={m.id}
            dateLabel={m.dateLabel ?? m.targetDate.slice(0, 7)}
            muted={m.targetDate > quarterEnd}
            getText={getText}
          />
        ))}
      </div>
    </div>
  );
}

function ExportAreaCard({ area, items, quarterEnd, getText }: {
  area: PortfolioArea;
  items: QuarterlyMilestone[];
  quarterEnd: string;
  getText: (key: string, fallback: string) => string;
}): JSX.Element {
  const color = AREA_COLORS[area];
  const areaTitle = getText(areaKey(area), area);

  // Split into main initiatives and sub-groups
  const main = new Map<string, QuarterlyMilestone[]>();
  const subGroups = new Map<string, Map<string, QuarterlyMilestone[]>>();

  for (const m of items) {
    if (m.subGroup) {
      if (!subGroups.has(m.subGroup)) subGroups.set(m.subGroup, new Map());
      const g = subGroups.get(m.subGroup)!;
      if (!g.has(m.initiative)) g.set(m.initiative, []);
      g.get(m.initiative)!.push(m);
    } else {
      if (!main.has(m.initiative)) main.set(m.initiative, []);
      main.get(m.initiative)!.push(m);
    }
  }

  return (
    <div style={{
      background: "#fff",
      borderRadius: 10,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      minHeight: 0,
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "8px 14px 7px",
        borderBottom: "1px solid #f0f0f0",
        flexShrink: 0,
      }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.3px", textTransform: "uppercase", color }}>
          {areaTitle}
        </span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: "4px 14px 8px", overflowY: "hidden" }}>
        {[...main.entries()].map(([name, ms]) => (
          <ExportInitiativeRow
            key={name}
            name={name}
            area={area}
            description={ms[0]?.initiativeDescription}
            items={ms}
            quarterEnd={quarterEnd}
            getText={getText}
          />
        ))}

        {[...subGroups.entries()].map(([label, initiatives]) => (
          <div key={label} style={{ marginTop: 4 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 0 4px", borderBottom: "1px solid #ebebeb",
            }}>
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", color: "#888" }}>
                {label}
              </span>
              <span style={{ flex: 1, height: 1, backgroundColor: "#ebebeb" }} />
            </div>
            {[...initiatives.entries()].map(([name, ms]) => (
              <ExportInitiativeRow
                key={name}
                name={name}
                area={area}
                description={ms[0]?.initiativeDescription}
                items={ms}
                quarterEnd={quarterEnd}
                getText={getText}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface QuarterlyExportViewProps {
  visibleMilestones: QuarterlyMilestone[];
  quarter: QuarterInfo;
  textOverrides: Map<string, string>;
}

export const QuarterlyExportView = forwardRef<HTMLDivElement, QuarterlyExportViewProps>(
  ({ visibleMilestones, quarter, textOverrides }, ref) => {

    const getText = (key: string, fallback: string) => textOverrides.get(key) ?? fallback;

    const byArea = useMemo(() => {
      const map = new Map<PortfolioArea, QuarterlyMilestone[]>();
      for (const area of QUARTERLY_PORTFOLIO_AREAS) {
        const items = visibleMilestones.filter(m => m.portfolioArea === area);
        if (items.length > 0) map.set(area, items);
      }
      return map;
    }, [visibleMilestones]);

    const areaCount = byArea.size;

    const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const startMonth = MONTH_ABBR[parseInt(quarter.start.slice(5, 7), 10) - 1];
    const endMonth   = MONTH_ABBR[parseInt(quarter.end.slice(5, 7),   10) - 1];
    const [sm, em] = [parseInt(quarter.start.slice(5, 7), 10) - 1, parseInt(quarter.end.slice(5, 7), 10) - 1];
    const periodMonths: string[] = [];
    for (let i = sm; i <= em; i++) periodMonths.push(MONTH_ABBR[i]!);

    return (
      <div
        ref={ref}
        style={{
          width: 1280,
          height: 720,
          display: "grid",
          gridTemplateColumns: "150px 1fr",
          fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
          overflow: "hidden",
          background: "#f0f2f5",
        }}
      >
        {/* ── Sidebar ── */}
        <div style={{
          background: "#0e1f3d",
          display: "flex",
          flexDirection: "column",
          padding: "24px 16px",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: "#C1272D",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 800, fontSize: 14,
            marginBottom: 10, flexShrink: 0,
          }}>FD</div>

          <div style={{ color: "#fff", fontSize: 12, fontWeight: 700, marginBottom: 28, lineHeight: 1.3 }}>
            Frontline Digital
          </div>

          <div style={{
            color: "rgba(255,255,255,0.4)", fontSize: 9, fontWeight: 600,
            letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 10,
          }}>
            Portfolio Update
          </div>

          <div style={{ color: "#fff", fontSize: 24, fontWeight: 800, lineHeight: 1.2, marginBottom: 6 }}>
            {quarter.label}
          </div>

          <div style={{ color: "#C1272D", fontSize: 13, fontWeight: 700, marginBottom: 32 }}>
            {periodMonths.join(" · ")}
          </div>

          <div style={{ width: 32, height: 2, background: "rgba(255,255,255,0.12)", marginBottom: 24 }} />

          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, lineHeight: 1.6 }}>
            <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>
              {areaCount} portfolio area{areaCount !== 1 ? "s" : ""}
            </span>
            <br />
            {quarter.start.slice(0, 4)} · {startMonth}–{endMonth}
            <br /><br />
            Milestones shown
            <br />within quarter.
            <br />Later dates noted
            <br />where relevant.
          </div>
        </div>

        {/* ── Card grid ── */}
        <div style={{
          background: "#f0f2f5",
          padding: "14px 16px 14px 12px",
          display: "grid",
          gridTemplateColumns: areaCount <= 1 ? "1fr" : "1fr 1fr",
          gridAutoRows: areaCount <= 2 ? "1fr" : "1fr 1fr",
          gap: 10,
          overflow: "hidden",
        }}>
          {[...byArea.entries()].map(([area, items]) => (
            <ExportAreaCard
              key={area}
              area={area}
              items={items}
              quarterEnd={quarter.end}
              getText={getText}
            />
          ))}
        </div>
      </div>
    );
  }
);

QuarterlyExportView.displayName = "QuarterlyExportView";
