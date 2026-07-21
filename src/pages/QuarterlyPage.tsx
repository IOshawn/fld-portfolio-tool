import { useState, useMemo, useCallback, useRef, createContext, useContext } from "react";
import { makeStyles, shorthands, tokens, Text, Tooltip, Button } from "@fluentui/react-components";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/cards";
import { Icon } from "../components/Icon";
import { InlineEdit } from "../components/InlineEdit";
import { formatDate, formatDateLong, currentQuarter } from "../lib/format";
import {
  QUARTERLY_PORTFOLIO_AREAS,
  type PortfolioArea,
  type QuarterlyMilestone,
} from "../types/quarterly";
import { QuarterlyExportView } from "../components/QuarterlyExportView";
import rawData from "../data/quarterlyMilestones.json";

const milestones = rawData as QuarterlyMilestone[];
const quarter = currentQuarter();

/** Stable key for an initiative (used for both toggle state and text overrides). */
const initKey = (area: PortfolioArea, name: string) => `${area}|${name}`;
/** Stable key for a chip label override. */
const chipKey = (id: string) => `chip:${id}`;
/** Stable key for a portfolio area title override. */
const areaKey = (area: PortfolioArea) => `area:${area}`;

// ---------------------------------------------------------------------------
// Text-override context (avoids prop-drilling through 3+ levels)
// ---------------------------------------------------------------------------

interface TextOverrideCtx {
  textOverrides: Map<string, string>;
  getText: (key: string, fallback: string) => string;
  setTextOverride: (key: string, value: string) => void;
}

const TextOverrideContext = createContext<TextOverrideCtx>({
  textOverrides: new Map(),
  getText: (_, f) => f,
  setTextOverride: () => {},
});

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const useStyles = makeStyles({
  quarterBanner: {
    display: "flex",
    alignItems: "center",
    columnGap: "10px",
    ...shorthands.padding("10px", "16px"),
    ...shorthands.borderRadius("8px"),
    backgroundColor: tokens.colorBrandBackground2,
    ...shorthands.border("1px", "solid", tokens.colorBrandStroke2),
    marginBottom: "14px",
    flexWrap: "wrap",
    rowGap: "6px",
  },
  quarterBannerIcon: { color: tokens.colorBrandForeground2, display: "inline-flex", flexShrink: 0 },
  quarterBannerText: { color: tokens.colorBrandForeground2, fontWeight: 600 },
  quarterBannerDivider: { color: tokens.colorBrandStroke2 },
  quarterBannerSub: { color: tokens.colorBrandForeground2, opacity: 0.8 },

  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "20px",
    gap: "12px",
    flexWrap: "wrap",
  },
  toolbarLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  toolbarHint: {
    color: tokens.colorNeutralForeground3,
    fontStyle: "italic",
  },
  resetBtn: {
    background: "none",
    border: "none",
    padding: 0,
    color: tokens.colorBrandForeground1,
    cursor: "pointer",
    fontSize: "12px",
    textDecoration: "underline",
  },

  sections: {
    display: "flex",
    flexDirection: "column",
    rowGap: "20px",
  },
  initiativeList: {
    display: "flex",
    flexDirection: "column",
  },
  initiativeRow: {
    display: "grid",
    gridTemplateColumns: "200px 1fr auto",
    columnGap: "12px",
    alignItems: "start",
    ...shorthands.padding("10px", "4px"),
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke2),
    borderRadius: "4px",
    cursor: "pointer",
    transition: "background-color 0.1s, opacity 0.15s",
    "@media (max-width: 640px)": {
      gridTemplateColumns: "1fr",
      rowGap: "8px",
    },
    ":last-child": {
      borderBottom: "none",
      paddingBottom: "4px",
    },
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground2,
    },
  },
  initiativeRowHidden: {
    opacity: 0.3,
  },
  initiativeNameCell: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    paddingTop: "2px",
  },
  initiativeName: {
    color: tokens.colorNeutralForeground1,
    fontWeight: 500,
    wordBreak: "break-word",
  },
  initiativeNameHidden: {
    textDecoration: "line-through",
    color: tokens.colorNeutralForeground3,
  },
  initiativeDescription: {
    color: tokens.colorNeutralForeground3,
    fontSize: "11px",
    lineHeight: "1.3",
    wordBreak: "break-word",
  },
  chips: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    alignItems: "flex-start",
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: "5px",
    ...shorthands.padding("3px", "9px"),
    ...shorthands.borderRadius("999px"),
    ...shorthands.border("1px", "solid", "#d6d6d6"),
    backgroundColor: "#f3f3f3",
    color: "#333333",
    fontSize: "12px",
    fontWeight: 500,
    lineHeight: "1.4",
    cursor: "text",
    whiteSpace: "nowrap",
  },
  chipBeyondQ: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: "5px",
    ...shorthands.padding("3px", "9px"),
    ...shorthands.borderRadius("999px"),
    ...shorthands.border("1px", "solid", "#e0e0e0"),
    backgroundColor: "#fafafa",
    color: "#888888",
    fontSize: "12px",
    fontWeight: 500,
    lineHeight: "1.4",
    cursor: "text",
    whiteSpace: "nowrap",
  },
  chipDate: {
    opacity: 0.6,
    fontWeight: 400,
    marginLeft: "2px",
    cursor: "default",
    flexShrink: 0,
  },
  toggleHint: {
    fontSize: "11px",
    color: tokens.colorNeutralForeground4,
    whiteSpace: "nowrap",
    alignSelf: "center",
    paddingTop: "2px",
    userSelect: "none",
    cursor: "pointer",
  },

  emptyArea: {
    color: tokens.colorNeutralForeground3,
    ...shorthands.padding("12px", "0"),
    fontStyle: "italic",
  },
  subGroupHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    ...shorthands.padding("10px", "0", "4px"),
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke2),
  },
  subGroupLabel: {
    color: tokens.colorNeutralForeground2,
    fontWeight: 600,
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  subGroupDividerLine: {
    flex: 1,
    height: "1px",
    backgroundColor: tokens.colorNeutralStroke2,
  },
  subGroupBlock: {
    display: "flex",
    flexDirection: "column",
    marginTop: "4px",
  },
  offScreen: {
    position: "fixed",
    left: "-10000px",
    top: 0,
    zIndex: -9999,
    pointerEvents: "none",
  },
});

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MilestoneChip({ m }: { m: QuarterlyMilestone }): JSX.Element {
  const s = useStyles();
  const { getText, setTextOverride, textOverrides } = useContext(TextOverrideContext);
  const isBeyondQ = m.targetDate > quarter.end;
  const displayDate = m.dateLabel ?? formatDate(m.targetDate);
  const key = chipKey(m.id);
  const label = getText(key, m.milestone);

  return (
    <Tooltip
      content={
        <div style={{ maxWidth: 240 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{m.milestone}</div>
          <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 4 }}>{formatDate(m.targetDate)}</div>
          {m.notes ? <div style={{ fontSize: 12, opacity: 0.8 }}>{m.notes}</div> : null}
        </div>
      }
      relationship="description"
    >
      {/* stopPropagation: clicking a chip should not toggle the whole row */}
      <span
        className={isBeyondQ ? s.chipBeyondQ : s.chip}
        onClick={(e) => e.stopPropagation()}
      >
        <InlineEdit
          value={label}
          onCommit={(v) => setTextOverride(key, v)}
          isEdited={textOverrides.has(key)}
          inline
          style={{ fontSize: "inherit", fontWeight: "inherit", color: "inherit" }}
        />
        <span className={s.chipDate}>{displayDate}</span>
      </span>
    </Tooltip>
  );
}

function InitiativeRow({ name, area, description, items, isHidden, onToggle }: {
  name: string;
  area: PortfolioArea;
  description?: string;
  items: QuarterlyMilestone[];
  isHidden: boolean;
  onToggle: () => void;
}): JSX.Element {
  const s = useStyles();
  const { getText, setTextOverride, textOverrides } = useContext(TextOverrideContext);
  const sorted = [...items].sort((a, b) => a.targetDate.localeCompare(b.targetDate));
  const key = initKey(area, name);
  const label = getText(key, name);

  return (
    <div
      className={`${s.initiativeRow}${isHidden ? ` ${s.initiativeRowHidden}` : ""}`}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      aria-pressed={!isHidden}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); }
      }}
    >
      <div className={s.initiativeNameCell}>
        <InlineEdit
          value={label}
          onCommit={(v) => setTextOverride(key, v)}
          isEdited={textOverrides.has(key)}
          className={`${s.initiativeName}${isHidden ? ` ${s.initiativeNameHidden}` : ""}`}
          style={{ fontSize: "14px", fontWeight: "500" }}
        />
        {description && !isHidden && (
          <span className={s.initiativeDescription}>{description}</span>
        )}
      </div>

      <div className={s.chips}>
        {!isHidden && sorted.map((m) => <MilestoneChip key={m.id} m={m} />)}
      </div>

      <span className={s.toggleHint} style={{ opacity: isHidden ? 1 : undefined }}>
        {isHidden ? "Show" : "Hide"}
      </span>
    </div>
  );
}

function SubGroupBlock({ label, initiatives, hiddenInitiatives, onToggle, area }: {
  label: string;
  initiatives: Map<string, QuarterlyMilestone[]>;
  hiddenInitiatives: Set<string>;
  onToggle: (key: string) => void;
  area: PortfolioArea;
}): JSX.Element {
  const s = useStyles();
  return (
    <div className={s.subGroupBlock}>
      <div className={s.subGroupHeader}>
        <span className={s.subGroupLabel}>{label}</span>
        <span className={s.subGroupDividerLine} />
      </div>
      <div className={s.initiativeList}>
        {[...initiatives.entries()].map(([name, ms]) => {
          const key = initKey(area, name);
          return (
            <InitiativeRow
              key={name}
              name={name}
              area={area}
              description={ms[0]?.initiativeDescription}
              items={ms}
              isHidden={hiddenInitiatives.has(key)}
              onToggle={() => onToggle(key)}
            />
          );
        })}
      </div>
    </div>
  );
}

function PortfolioAreaSection({ area, items, hiddenInitiatives, onToggle }: {
  area: PortfolioArea;
  items: QuarterlyMilestone[];
  hiddenInitiatives: Set<string>;
  onToggle: (key: string) => void;
}): JSX.Element {
  const s = useStyles();
  const { getText, setTextOverride, textOverrides } = useContext(TextOverrideContext);

  const { mainInitiatives, subGroups } = useMemo(() => {
    const main = new Map<string, QuarterlyMilestone[]>();
    const groups = new Map<string, Map<string, QuarterlyMilestone[]>>();
    for (const m of items) {
      if (m.subGroup) {
        if (!groups.has(m.subGroup)) groups.set(m.subGroup, new Map());
        const g = groups.get(m.subGroup)!;
        if (!g.has(m.initiative)) g.set(m.initiative, []);
        g.get(m.initiative)!.push(m);
      } else {
        if (!main.has(m.initiative)) main.set(m.initiative, []);
        main.get(m.initiative)!.push(m);
      }
    }
    return { mainInitiatives: main, subGroups: groups };
  }, [items]);

  const icon =
    area === "Frontline Maintenance" ? "projects"
    : area === "Operations & Decision Intelligence" ? "value"
    : area === "Frontline HSE" ? "flag"
    : "team";

  const titleKey = areaKey(area);
  const titleLabel = getText(titleKey, area);
  const hasContent = mainInitiatives.size > 0 || subGroups.size > 0;

  return (
    <SectionCard
      icon={icon}
      title={
        <InlineEdit
          value={titleLabel}
          onCommit={(v) => setTextOverride(titleKey, v)}
          isEdited={textOverrides.has(titleKey)}
          style={{ fontWeight: "inherit", fontSize: "inherit" }}
        />
      }
    >
      {!hasContent ? (
        <Text className={s.emptyArea} size={300}>No milestones recorded for this area.</Text>
      ) : (
        <>
          {mainInitiatives.size > 0 && (
            <div className={s.initiativeList}>
              {[...mainInitiatives.entries()].map(([name, ms]) => {
                const key = initKey(area, name);
                return (
                  <InitiativeRow
                    key={name}
                    name={name}
                    area={area}
                    description={ms[0]?.initiativeDescription}
                    items={ms}
                    isHidden={hiddenInitiatives.has(key)}
                    onToggle={() => onToggle(key)}
                  />
                );
              })}
            </div>
          )}
          {[...subGroups.entries()].map(([lbl, initiatives]) => (
            <SubGroupBlock
              key={lbl}
              label={lbl}
              initiatives={initiatives}
              hiddenInitiatives={hiddenInitiatives}
              onToggle={onToggle}
              area={area}
            />
          ))}
        </>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function QuarterlyPage(): JSX.Element {
  const s = useStyles();
  const exportRef = useRef<HTMLDivElement>(null);

  // Visibility state
  const [hiddenInitiatives, setHiddenInitiatives] = useState<Set<string>>(new Set());
  // Text-override state
  const [textOverrides, setTextOverrides] = useState<Map<string, string>>(new Map());
  const [isCapturing, setIsCapturing] = useState<"png" | "pdf" | null>(null);

  const getText = useCallback(
    (key: string, fallback: string) => textOverrides.get(key) ?? fallback,
    [textOverrides]
  );
  const setTextOverride = useCallback((key: string, value: string) => {
    setTextOverrides(prev => new Map(prev).set(key, value));
  }, []);

  const ctxValue = useMemo<TextOverrideCtx>(
    () => ({ textOverrides, getText, setTextOverride }),
    [textOverrides, getText, setTextOverride]
  );

  const toggleInitiative = useCallback((key: string) => {
    setHiddenInitiatives(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    setHiddenInitiatives(new Set());
    setTextOverrides(new Map());
  }, []);

  const allInitiativeKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const m of milestones) keys.add(initKey(m.portfolioArea, m.initiative));
    return keys;
  }, []);

  const totalCount = allInitiativeKeys.size;
  const hiddenCount = hiddenInitiatives.size;
  const visibleCount = totalCount - hiddenCount;
  const textEditCount = textOverrides.size;
  const anyChanges = hiddenCount > 0 || textEditCount > 0;

  const hintParts: string[] = [];
  if (hiddenCount > 0) hintParts.push(`${visibleCount} of ${totalCount} visible`);
  if (textEditCount > 0) hintParts.push(`${textEditCount} label${textEditCount !== 1 ? "s" : ""} edited`);
  const hintText = hintParts.length > 0
    ? hintParts.join(" · ")
    : `${totalCount} initiatives — click rows to hide · click labels to rename`;

  const visibleMilestones = useMemo(
    () => milestones.filter(m => !hiddenInitiatives.has(initKey(m.portfolioArea, m.initiative))),
    [hiddenInitiatives]
  );

  const byArea = useMemo(() => {
    const map = new Map<PortfolioArea, QuarterlyMilestone[]>();
    for (const area of QUARTERLY_PORTFOLIO_AREAS) map.set(area, []);
    for (const m of milestones) map.get(m.portfolioArea)?.push(m);
    return map;
  }, []);

  /** Shared canvas capture — returns a canvas from the off-screen export view. */
  const captureCanvas = useCallback(async () => {
    const html2canvas = (await import("html2canvas")).default;
    return html2canvas(exportRef.current!, {
      scale: 2,
      width: 1280,
      height: 720,
      useCORS: true,
      backgroundColor: "#f0f2f5",
      windowWidth: 1920,
      windowHeight: 1080,
    });
  }, []);

  const handleExportPNG = useCallback(async () => {
    if (!exportRef.current || isCapturing) return;
    setIsCapturing("png");
    try {
      const canvas = await captureCanvas();
      const a = document.createElement("a");
      a.download = `Frontline-Digital-${quarter.label.replace(" ", "-")}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    } finally {
      setIsCapturing(null);
    }
  }, [isCapturing, captureCanvas]);

  const handleExportPDF = useCallback(async () => {
    if (!exportRef.current || isCapturing) return;
    setIsCapturing("pdf");
    try {
      const [canvas, { jsPDF }] = await Promise.all([
        captureCanvas(),
        import("jspdf"),
      ]);

      // A4 landscape: 297 × 210 mm. Fit the 16:9 (1280×720) image inside it.
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();   // 297
      const pageH = pdf.internal.pageSize.getHeight();  // 210

      const imgAspect = 1280 / 720;
      let imgW = pageW;
      let imgH = pageW / imgAspect;
      if (imgH > pageH) { imgH = pageH; imgW = pageH * imgAspect; }

      const x = (pageW - imgW) / 2;
      const y = (pageH - imgH) / 2;

      pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, y, imgW, imgH);
      pdf.save(`Frontline-Digital-${quarter.label.replace(" ", "-")}.pdf`);
    } finally {
      setIsCapturing(null);
    }
  }, [isCapturing, captureCanvas]);

  return (
    <TextOverrideContext.Provider value={ctxValue}>
      <>
        <PageHeader
          eyebrow="Quarterly Summary"
          title={`${quarter.label} · ${quarter.monthRange}`}
          subtitle="Click rows to hide from export · click any label to rename it."
        />

        {/* Quarter banner */}
        <div className={s.quarterBanner}>
          <span className={s.quarterBannerIcon}>
            <Icon name="calendar" size={16} />
          </span>
          <Text size={200} className={s.quarterBannerText}>{quarter.label}</Text>
          <Text size={200} className={s.quarterBannerDivider}>·</Text>
          <Text size={200} className={s.quarterBannerSub}>
            {formatDateLong(quarter.start)} – {formatDateLong(quarter.end)}
          </Text>
        </div>

        {/* Toolbar */}
        <div className={s.toolbar}>
          <div className={s.toolbarLeft}>
            <Text size={200} className={s.toolbarHint}>{hintText}</Text>
            {anyChanges && (
              <button className={s.resetBtn} onClick={resetAll}>Reset all</button>
            )}
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <Button
              appearance="primary"
              icon={
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 10.5 L3 5.5 h3.5 V1.5 h3 V5.5 h3.5 Z M2 13.5 h12 v-1.5 H2 Z" />
                </svg>
              }
              disabled={visibleCount === 0 || isCapturing !== null}
              onClick={handleExportPNG}
            >
              {isCapturing === "png" ? "Capturing…" : "Export PNG"}
            </Button>
            <Button
              appearance="outline"
              icon={
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 10.5 L3 5.5 h3.5 V1.5 h3 V5.5 h3.5 Z M2 13.5 h12 v-1.5 H2 Z" />
                </svg>
              }
              disabled={visibleCount === 0 || isCapturing !== null}
              onClick={handleExportPDF}
            >
              {isCapturing === "pdf" ? "Capturing…" : "Export PDF"}
            </Button>
          </div>
        </div>

        {/* Initiative sections */}
        <div className={s.sections}>
          {QUARTERLY_PORTFOLIO_AREAS.map((area) => (
            <PortfolioAreaSection
              key={area}
              area={area}
              items={byArea.get(area) ?? []}
              hiddenInitiatives={hiddenInitiatives}
              onToggle={toggleInitiative}
            />
          ))}
        </div>

        {/* Off-screen export view — always mounted so html2canvas can paint it immediately */}
        <div className={s.offScreen}>
          <QuarterlyExportView
            ref={exportRef}
            visibleMilestones={visibleMilestones}
            quarter={quarter}
            textOverrides={textOverrides}
          />
        </div>
      </>
    </TextOverrideContext.Provider>
  );
}
