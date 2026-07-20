/**
 * DependencyGraph — visual node-link graph for a project's dependency relationships.
 *
 * Layout: upstream deps → current project (centre) → downstream dependents
 * Each node is clickable and navigates to that project's detail page.
 * Uses CSS flexbox (no external graph library required).
 */
import { useNavigate } from "react-router-dom";
import { makeStyles, shorthands, tokens } from "@fluentui/react-components";
import type { Project } from "../types/models";

const useStyles = makeStyles({
  root: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    ...shorthands.gap("0px"),
    overflowX: "auto",
    paddingTop: "8px",
    paddingBottom: "8px",
  },
  column: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    ...shorthands.gap("12px"),
    minWidth: "140px",
  },
  columnLabel: {
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: tokens.colorNeutralForeground3,
    marginBottom: "4px",
  },
  connector: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "48px",
    flexShrink: 0,
    position: "relative",
  },
  connectorLine: {
    width: "100%",
    height: "2px",
    backgroundColor: tokens.colorNeutralStroke2,
  },
  connectorArrow: {
    position: "absolute",
    right: 0,
    width: 0,
    height: 0,
    borderTop: "5px solid transparent",
    borderBottom: "5px solid transparent",
    borderLeft: `8px solid ${tokens.colorNeutralStroke2}`,
  },
  connectorArrowLeft: {
    position: "absolute",
    left: 0,
    width: 0,
    height: 0,
    borderTop: "5px solid transparent",
    borderBottom: "5px solid transparent",
    borderRight: `8px solid ${tokens.colorNeutralStroke2}`,
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
}

function GraphNode({ project, isCenter, onClick }: NodeProps): JSX.Element {
  const s = useStyles();
  return (
    <div
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

  // Downstream: projects that list THIS project as a dependency (by ID or title)
  const downstreams = allProjects.filter(
    (p) =>
      p.id !== project.id &&
      p.dependencies.some(
        (dep) => dep === project.id || dep.toLowerCase() === project.title.toLowerCase()
      )
  );

  if (upstreams.length === 0 && downstreams.length === 0) return null;

  return (
    <div>
      <div className={s.root}>
        {/* Upstream column */}
        {upstreams.length > 0 && (
          <>
            <div className={s.column}>
              <span className={s.columnLabel}>Depends on</span>
              {upstreams.map((p) => (
                <GraphNode
                  key={p.id}
                  project={p}
                  onClick={() => navigate(`/projects/${p.id}`)}
                />
              ))}
            </div>

            {/* Arrow pointing right (upstream → centre) */}
            <div className={s.connector}>
              <div className={s.connectorLine} />
              <div className={s.connectorArrow} />
            </div>
          </>
        )}

        {/* Centre node */}
        <div className={s.column}>
          <span className={s.columnLabel}>This project</span>
          <GraphNode project={project} isCenter />
        </div>

        {/* Arrow pointing right (centre → downstream) */}
        {downstreams.length > 0 && (
          <>
            <div className={s.connector}>
              <div className={s.connectorLine} />
              <div className={s.connectorArrow} />
            </div>

            <div className={s.column}>
              <span className={s.columnLabel}>Used by</span>
              {downstreams.map((p) => (
                <GraphNode
                  key={p.id}
                  project={p}
                  onClick={() => navigate(`/projects/${p.id}`)}
                />
              ))}
            </div>
          </>
        )}
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
