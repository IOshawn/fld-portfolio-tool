/**
 * DependencyGraph — visual node-link graph for a project's dependency relationships.
 *
 * Layout: upstream deps → current project (centre) → downstream dependents
 * Each node is clickable and navigates to that project's detail page.
 * Uses CSS flexbox columns with SVG fork connectors for multi-node branches.
 */
import { useNavigate } from "react-router-dom";
import { useRef, useLayoutEffect, useState, useCallback } from "react";
import { makeStyles, shorthands, tokens } from "@fluentui/react-components";
import type { Project } from "../types/models";

const useStyles = makeStyles({
  outerWrapper: {
    overflowX: "auto",
    paddingTop: "8px",
    paddingBottom: "8px",
  },
  root: {
    display: "flex",
    alignItems: "stretch",
    justifyContent: "center",
    minWidth: "fit-content",
  },
  column: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    ...shorthands.gap("12px"),
    minWidth: "140px",
    // Vertical centering of the column relative to the centre node
    justifyContent: "center",
  },
  columnLabel: {
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: tokens.colorNeutralForeground3,
    marginBottom: "4px",
  },
  svgConnector: {
    flexShrink: 0,
    alignSelf: "stretch",
  },
  node: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    ...shorthands.padding("10px", "14px"),
    ...shorthands.border("1.5px", "solid", tokens.colorNeutralStroke2),
    ...shorthands.borderRadius("10px"),
    backgroundColor: tokens.colorNeutralBackground2,
    cursor: "pointer",
    width: "130px",
    minHeight: "56px",
    boxSizing: "border-box",
    transition: "box-shadow 0.15s, border-color 0.15s",
    ":hover": {
      borderTopColor: tokens.colorBrandStroke1,
      borderRightColor: tokens.colorBrandStroke1,
      borderBottomColor: tokens.colorBrandStroke1,
      borderLeftColor: tokens.colorBrandStroke1,
      boxShadow: tokens.shadow4,
    },
  },
  nodeCenter: {
    ...shorthands.border("2px", "solid", tokens.colorBrandStroke1),
    backgroundColor: tokens.colorBrandBackground2,
    cursor: "default",
    ":hover": {
      borderTopColor: tokens.colorBrandStroke1,
      borderRightColor: tokens.colorBrandStroke1,
      borderBottomColor: tokens.colorBrandStroke1,
      borderLeftColor: tokens.colorBrandStroke1,
      boxShadow: "none",
    },
  },
  nodeAbbrev: {
    fontSize: "11px",
    fontWeight: 700,
    color: tokens.colorNeutralForeground3,
    letterSpacing: "0.04em",
  },
  nodeAbbrevCenter: {
    color: tokens.colorBrandForeground2,
  },
  nodeTitle: {
    fontSize: "12px",
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
    lineHeight: "1.3",
    marginTop: "2px",
    // Clamp to 2 lines
    display: "-webkit-box",
    WebkitLineClamp: "2",
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  legend: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    ...shorthands.gap("24px"),
    marginTop: "16px",
    flexWrap: "wrap",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap("6px"),
    fontSize: "11px",
    color: tokens.colorNeutralForeground3,
  },
  legendDot: {
    width: "10px",
    height: "10px",
    ...shorthands.borderRadius("2px"),
    ...shorthands.border("1.5px", "solid", tokens.colorNeutralStroke2),
    backgroundColor: tokens.colorNeutralBackground2,
    flexShrink: 0,
  },
  legendDotCenter: {
    ...shorthands.border("2px", "solid", tokens.colorBrandStroke1),
    backgroundColor: tokens.colorBrandBackground2,
  },
});

interface NodeProps {
  project: Project;
  isCenter?: boolean;
  onClick?: () => void;
  nodeRef?: React.Ref<HTMLDivElement>;
}

function GraphNode({ project, isCenter, onClick, nodeRef }: NodeProps): JSX.Element {
  const s = useStyles();
  return (
    <div
      ref={nodeRef}
      className={isCenter ? `${s.node} ${s.nodeCenter}` : s.node}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
      aria-label={project.title}
    >
      <span className={isCenter ? `${s.nodeAbbrev} ${s.nodeAbbrevCenter}` : s.nodeAbbrev}>
        {project.abbrev}
      </span>
      <span className={s.nodeTitle}>{project.title}</span>
    </div>
  );
}

// ─── SVG fork connector ───────────────────────────────────────────────────────

interface ForkConnectorProps {
  /**
   * Measured midpoint Y positions of each node relative to the connector SVG's
   * top edge (in px). When null, the SVG renders an invisible placeholder and
   * positions are measured after mount.
   */
  nodeMidpoints: number[] | null;
  /** Total height of the SVG (same as the column height). */
  height: number;
  /**
   * Direction of the arrow.
   * "right" → arrow points from left to right (upstream → centre).
   * "left"  → arrow points from right to left (centre → downstream).
   * Wait — upstream arrow should point RIGHT (deps flow into centre).
   * Downstream arrow should also point RIGHT (centre flows into dependents).
   */
  direction: "upstream" | "downstream";
  width?: number;
}

const CONNECTOR_WIDTH = 56;
const STROKE_COLOR = "#9E9E9E"; // matches tokens.colorNeutralStroke2 approximately
const STROKE_W = 2;
const ARROW_SIZE = 8;

/**
 * Draws a branching SVG fork connector.
 *
 * upstream  (deps → centre):
 *   nodes are on the LEFT, centre is on the RIGHT.
 *   A vertical spine runs along x = SPINE_X from top node mid to bottom node mid.
 *   Horizontal branches go from each node's right edge (x=0) to the spine.
 *   A single horizontal line from the spine to the right edge with arrowhead.
 *
 * downstream (centre → deps):
 *   nodes are on the RIGHT, centre is on the LEFT.
 *   Mirror of upstream.
 */
function ForkConnector({
  nodeMidpoints,
  height,
  direction,
  width = CONNECTOR_WIDTH,
}: ForkConnectorProps): JSX.Element {
  if (!nodeMidpoints || nodeMidpoints.length === 0 || height === 0) {
    // Render invisible placeholder while measuring
    return (
      <svg
        width={width}
        height={height || 60}
        style={{ display: "block", flexShrink: 0 }}
        aria-hidden
      />
    );
  }

  const midY = height / 2; // Y of the centre node (SVG is stretched to column height)
  const topY = nodeMidpoints[0];
  const bottomY = nodeMidpoints[nodeMidpoints.length - 1];

  const paths: React.ReactNode[] = [];

  if (direction === "upstream") {
    // Nodes are on the LEFT side. Connector is to their RIGHT, centre is further right.
    // Spine runs vertically at x = SPINE_X
    const spineX = width * 0.35;
    const nodeEdgeX = 0; // left edge of connector = right edge of node column
    const centerEdgeX = width; // right edge of connector = left edge of centre column

    // Vertical spine from topY to bottomY (only if multiple nodes)
    if (nodeMidpoints.length > 1) {
      paths.push(
        <line
          key="spine"
          x1={spineX} y1={topY}
          x2={spineX} y2={bottomY}
          stroke={STROKE_COLOR} strokeWidth={STROKE_W}
        />
      );
    }

    // Horizontal branch from each node's mid to the spine
    for (let i = 0; i < nodeMidpoints.length; i++) {
      paths.push(
        <line
          key={`branch-${i}`}
          x1={nodeEdgeX} y1={nodeMidpoints[i]}
          x2={spineX} y2={nodeMidpoints[i]}
          stroke={STROKE_COLOR} strokeWidth={STROKE_W}
        />
      );
    }

    // Horizontal trunk from spine to right edge (at the centre node's Y)
    paths.push(
      <line
        key="trunk"
        x1={spineX} y1={midY}
        x2={centerEdgeX - ARROW_SIZE} y2={midY}
        stroke={STROKE_COLOR} strokeWidth={STROKE_W}
      />
    );

    // Arrowhead pointing RIGHT at right edge
    paths.push(
      <polygon
        key="arrow"
        points={`${centerEdgeX - ARROW_SIZE},${midY - 5} ${centerEdgeX},${midY} ${centerEdgeX - ARROW_SIZE},${midY + 5}`}
        fill={STROKE_COLOR}
      />
    );
  } else {
    // direction === "downstream"
    // Nodes are on the RIGHT side. Connector is to their LEFT, centre is further left.
    // Spine runs vertically at x = spineX
    const spineX = width * 0.65;
    const nodeEdgeX = width; // right edge of connector = left edge of node column
    const centerEdgeX = 0; // left edge of connector = right edge of centre column

    // Horizontal trunk from left edge (centre) to spine (at midY)
    paths.push(
      <line
        key="trunk"
        x1={centerEdgeX} y1={midY}
        x2={spineX} y2={midY}
        stroke={STROKE_COLOR} strokeWidth={STROKE_W}
      />
    );

    // Vertical spine from topY to bottomY (only if multiple nodes)
    if (nodeMidpoints.length > 1) {
      paths.push(
        <line
          key="spine"
          x1={spineX} y1={topY}
          x2={spineX} y2={bottomY}
          stroke={STROKE_COLOR} strokeWidth={STROKE_W}
        />
      );
    }

    // Horizontal branch from spine to each node's left edge, with arrowhead
    for (let i = 0; i < nodeMidpoints.length; i++) {
      const ny = nodeMidpoints[i];
      paths.push(
        <line
          key={`branch-${i}`}
          x1={spineX} y1={ny}
          x2={nodeEdgeX - ARROW_SIZE} y2={ny}
          stroke={STROKE_COLOR} strokeWidth={STROKE_W}
        />
      );
      // Arrowhead at the node's left edge
      paths.push(
        <polygon
          key={`arrow-${i}`}
          points={`${nodeEdgeX - ARROW_SIZE},${ny - 5} ${nodeEdgeX},${ny} ${nodeEdgeX - ARROW_SIZE},${ny + 5}`}
          fill={STROKE_COLOR}
        />
      );
    }
  }

  return (
    <svg
      width={width}
      height={height}
      style={{ display: "block", flexShrink: 0, overflow: "visible" }}
      aria-hidden
    >
      {paths}
    </svg>
  );
}

// ─── Measured column ──────────────────────────────────────────────────────────

interface MeasuredColumnProps {
  nodes: Project[];
  label: string;
  onMeasure: (midpoints: number[], height: number) => void;
  onNavigate: (id: string) => void;
}

function MeasuredColumn({ nodes, label, onMeasure, onNavigate }: MeasuredColumnProps): JSX.Element {
  const s = useStyles();
  const columnRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Ensure nodeRefs array has the right length
  nodeRefs.current = nodeRefs.current.slice(0, nodes.length);
  while (nodeRefs.current.length < nodes.length) nodeRefs.current.push(null);

  useLayoutEffect(() => {
    const col = columnRef.current;
    if (!col) return;

    const measure = () => {
      const colRect = col.getBoundingClientRect();
      const midpoints = nodeRefs.current.map((el) => {
        if (!el) return 0;
        const r = el.getBoundingClientRect();
        return r.top + r.height / 2 - colRect.top;
      });
      onMeasure(midpoints, colRect.height);
    };

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(col);
    nodeRefs.current.forEach((el) => { if (el) ro.observe(el); });
    return () => ro.disconnect();
  }, [nodes.length, onMeasure]);

  return (
    <div ref={columnRef} className={s.column}>
      <span className={s.columnLabel}>{label}</span>
      {nodes.map((p, i) => (
        <GraphNode
          key={p.id}
          project={p}
          nodeRef={(el) => { nodeRefs.current[i] = el as HTMLDivElement | null; }}
          onClick={() => onNavigate(p.id)}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  /** The project whose graph we are showing. */
  project: Project;
  /** All portfolio projects (used to resolve IDs and find downstreams). */
  allProjects: Project[];
  /** Resolved upstream dependency projects (this project depends on them). */
  upstreams: Project[];
}

export function DependencyGraph({ project, allProjects, upstreams }: Props): JSX.Element | null {
  const s = useStyles();
  const navigate = useNavigate();

  // Downstream: projects that list THIS project as a dependency (by ID or title).
  // The mock data (src/data/projects.json) is already migrated to use IDs, so the
  // title-fallback exists only for backward compatibility with external data sources
  // such as SharePoint, which may still store dependency values as display titles.
  const downstreams = allProjects.filter(
    (p) =>
      p.id !== project.id &&
      p.dependencies.some(
        (dep) => dep === project.id || dep.toLowerCase() === project.title.toLowerCase()
      )
  );

  // Measured positions
  const [upstreamMeasure, setUpstreamMeasure] = useState<{ midpoints: number[]; height: number } | null>(null);
  const [downstreamMeasure, setDownstreamMeasure] = useState<{ midpoints: number[]; height: number } | null>(null);
  const [centreHeight, setCentreHeight] = useState<number>(0);

  const centreRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = centreRef.current;
    if (!el) return;
    const measure = () => setCentreHeight(el.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleUpstreamMeasure = useCallback((midpoints: number[], height: number) => {
    setUpstreamMeasure({ midpoints, height });
  }, []);

  const handleDownstreamMeasure = useCallback((midpoints: number[], height: number) => {
    setDownstreamMeasure({ midpoints, height });
  }, []);

  if (upstreams.length === 0 && downstreams.length === 0) return null;

  // The SVG connector must be as tall as the taller of the side column and the centre column
  // so that it can bridge from the midY (centre node) to the node midpoints.
  const upConnectorHeight = upstreamMeasure
    ? Math.max(upstreamMeasure.height, centreHeight)
    : centreHeight || 80;
  const downConnectorHeight = downstreamMeasure
    ? Math.max(downstreamMeasure.height, centreHeight)
    : centreHeight || 80;

  // Translate upstream midpoints: they are relative to the upstream column top.
  // The SVG connector is aligned to the taller of the two. We need to offset
  // the midpoints by (connectorHeight - upstreamMeasure.height) / 2 if centre is taller,
  // OR keep them as is if upstream is taller.
  const upAdjust = upstreamMeasure
    ? Math.max(0, (centreHeight - upstreamMeasure.height) / 2)
    : 0;
  const downAdjust = downstreamMeasure
    ? Math.max(0, (centreHeight - downstreamMeasure.height) / 2)
    : 0;

  const upMidpoints = upstreamMeasure
    ? upstreamMeasure.midpoints.map((m) => m + upAdjust)
    : null;
  const downMidpoints = downstreamMeasure
    ? downstreamMeasure.midpoints.map((m) => m + downAdjust)
    : null;

  return (
    <div>
      <div className={s.outerWrapper}>
        <div className={s.root}>
          {/* Upstream column */}
          {upstreams.length > 0 && (
            <>
              <MeasuredColumn
                nodes={upstreams}
                label="Depends on"
                onMeasure={handleUpstreamMeasure}
                onNavigate={(id) => navigate(`/projects/${id}`)}
              />

              {/* Fork connector: upstream → centre */}
              <ForkConnector
                nodeMidpoints={upMidpoints}
                height={upConnectorHeight}
                direction="upstream"
              />
            </>
          )}

          {/* Centre node */}
          <div ref={centreRef} className={s.column}>
            <span className={s.columnLabel}>This project</span>
            <GraphNode project={project} isCenter />
          </div>

          {/* Fork connector: centre → downstream */}
          {downstreams.length > 0 && (
            <>
              <ForkConnector
                nodeMidpoints={downMidpoints}
                height={downConnectorHeight}
                direction="downstream"
              />

              <MeasuredColumn
                nodes={downstreams}
                label="Used by"
                onMeasure={handleDownstreamMeasure}
                onNavigate={(id) => navigate(`/projects/${id}`)}
              />
            </>
          )}
        </div>
      </div>

      <div className={s.legend}>
        <span className={s.legendItem}>
          <span className={`${s.legendDot} ${s.legendDotCenter}`} />
          This project
        </span>
        {upstreams.length > 0 && (
          <span className={s.legendItem}>
            <span className={s.legendDot} />
            Upstream dependency
          </span>
        )}
        {downstreams.length > 0 && (
          <span className={s.legendItem}>
            <span className={s.legendDot} />
            Downstream dependent
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Resolves a dependency entry (may be project ID or legacy title) to a Project.
 * Tries ID match first, then case-insensitive title match.
 */
export function resolveDep(dep: string, allProjects: Project[]): Project | undefined {
  return (
    allProjects.find((p) => p.id === dep) ||
    allProjects.find((p) => p.title.toLowerCase() === dep.toLowerCase())
  );
}
