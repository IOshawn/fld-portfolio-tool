import { Link } from "react-router-dom";
import { makeStyles, shorthands, tokens, Text } from "@fluentui/react-components";
import type { Milestone, Engagement, Project } from "../types/models";
import { personName } from "../types/models";
import { MilestoneStatusBadge, StatusBadge, EngagementStageBadge } from "./Badges";
import { Icon } from "./Icon";
import { formatDate, relativeDay } from "../lib/format";

const useStyles = makeStyles({
  row: {
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
  icon: {
    display: "grid",
    placeItems: "center",
    width: "30px",
    height: "30px",
    flexShrink: 0,
    ...shorthands.borderRadius("8px"),
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground3,
  },
  body: { minWidth: 0, flexGrow: 1, display: "flex", flexDirection: "column", rowGap: "1px" },
  primary: {
    fontWeight: 600,
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    ...shorthands.overflow("hidden"),
  },
  secondary: {
    color: tokens.colorNeutralForeground3,
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    ...shorthands.overflow("hidden"),
  },
  right: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    rowGap: "4px",
    flexShrink: 0,
  },
  date: { fontVariantNumeric: "tabular-nums", color: tokens.colorNeutralForeground2, whiteSpace: "nowrap" },
});

export function MilestoneListItem({
  milestone,
  projectTitle,
}: {
  milestone: Milestone;
  projectTitle: string;
}): JSX.Element {
  const s = useStyles();
  return (
    <Link to={`/projects/${milestone.projectId}`} className={s.row}>
      <span className={s.icon}>
        <Icon name="flag" size={16} />
      </span>
      <div className={s.body}>
        <Text size={300} className={s.primary}>
          {milestone.name}
        </Text>
        <Text size={200} className={s.secondary}>
          {projectTitle}
        </Text>
      </div>
      <div className={s.right}>
        <Text size={200} className={s.date}>
          {formatDate(milestone.date)}
        </Text>
        <MilestoneStatusBadge status={milestone.status} />
      </div>
    </Link>
  );
}

type EngagementMode = "default" | "site" | "initiative";

export function EngagementListItem({
  engagement,
  initiativeTitle,
  mode = "default",
}: {
  engagement: Engagement;
  initiativeTitle: string;
  mode?: EngagementMode;
}): JSX.Element {
  const s = useStyles();
  const e = engagement;

  let primary: string;
  let secondary: string;
  if (mode === "site") {
    primary = `${initiativeTitle}`;
    secondary = `${e.workArea} · ${e.purpose}`;
  } else if (mode === "initiative") {
    primary = `${e.site} · ${e.workArea}`;
    secondary = e.purpose;
  } else {
    primary = `${e.site} · ${e.workArea}`;
    secondary = `${initiativeTitle} — ${e.purpose}`;
  }

  return (
    <Link to={`/projects/${e.initiativeId}`} className={s.row}>
      <span className={s.icon}>
        <Icon name="location" size={16} />
      </span>
      <div className={s.body}>
        <Text size={300} className={s.primary}>
          {primary}
        </Text>
        <Text size={200} className={s.secondary}>
          {secondary}
        </Text>
      </div>
      <div className={s.right}>
        <EngagementStageBadge stage={e.stage} />
        <Text size={200} className={s.date}>
          {formatDate(e.startDate)} · {e.status}
        </Text>
      </div>
    </Link>
  );
}

export function ProjectMiniRow({ project }: { project: Project }): JSX.Element {
  const s = useStyles();
  return (
    <Link to={`/projects/${project.id}`} className={s.row}>
      <div className={s.body}>
        <Text size={300} className={s.primary}>
          {project.title}
        </Text>
        <Text size={200} className={s.secondary}>
          {personName(project.owner)} · updated {relativeDay(project.lastUpdated)}
        </Text>
      </div>
      <div className={s.right}>
        <StatusBadge status={project.status} />
      </div>
    </Link>
  );
}
