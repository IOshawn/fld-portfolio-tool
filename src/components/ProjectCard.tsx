import { Link } from "react-router-dom";
import { makeStyles, shorthands, tokens, Text, Avatar, Badge } from "@fluentui/react-components";
import type { Project, Milestone, Portfolio } from "../types/models";
import { PORTFOLIO_SHORT_NAMES, personName } from "../types/models";
import { StatusBadge, StageBadge } from "./Badges";
import { Icon } from "./Icon";
import { formatDate } from "../lib/format";
import { statusBarColor } from "../lib/theme";

const useStyles = makeStyles({
  card: {
    display: "flex",
    flexDirection: "column",
    rowGap: "12px",
    ...shorthands.padding("16px", "18px"),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
    ...shorthands.borderRadius("12px"),
    boxShadow: tokens.shadow2,
    textDecorationLine: "none",
    color: "inherit",
    transitionProperty: "transform, box-shadow, border-color",
    transitionDuration: tokens.durationFast,
    ":hover": {
      boxShadow: tokens.shadow8,
      ...shorthands.borderColor(tokens.colorNeutralStroke1),
      transform: "translateY(-2px)",
    },
    ":active": {
      transform: "translateY(0)",
    },
  },
  topRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    columnGap: "10px",
  },
  title: {
    fontWeight: 600,
    lineHeight: 1.2,
  },
  code: {
    color: tokens.colorNeutralForeground3,
    fontVariantNumeric: "tabular-nums",
  },
  stages: {
    display: "flex",
    flexWrap: "wrap",
    gap: "4px",
    paddingTop: "4px",
  },
  stageChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "11px",
    color: tokens.colorNeutralForeground2,
  },
  stageDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  chips: {
    display: "flex",
    alignItems: "center",
    columnGap: "8px",
    flexWrap: "wrap",
  },
  owner: {
    display: "flex",
    alignItems: "center",
    columnGap: "8px",
  },
  ownerText: {
    color: tokens.colorNeutralForeground2,
  },
  footer: {
    display: "flex",
    alignItems: "center",
    columnGap: "8px",
    ...shorthands.padding("10px", "0", "0", "0"),
    ...shorthands.borderTop("1px", "solid", tokens.colorNeutralStroke2),
    color: tokens.colorNeutralForeground3,
  },
  nextLabel: {
    color: tokens.colorNeutralForeground3,
  },
  nextValue: {
    color: tokens.colorNeutralForeground2,
    fontWeight: 500,
    minWidth: 0,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    ...shorthands.overflow("hidden"),
  },
});

export function ProjectCard({
  project,
  nextMilestone,
}: {
  project: Project;
  nextMilestone?: Milestone;
}): JSX.Element {
  const s = useStyles();
  return (
    <Link to={`/projects/${project.id}`} className={s.card}>
      <div className={s.topRow}>
        <div style={{ minWidth: 0 }}>
          <Text size={400} className={s.title} block>
            {project.title}
          </Text>
          {project.nOrPCode && (
            <Text size={200} className={s.code}>
              {project.nOrPCode}
            </Text>
          )}
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className={s.chips}>
        <StageBadge stage={project.stage} />
        <Badge appearance="tint" color="brand" shape="rounded">
          {PORTFOLIO_SHORT_NAMES[project.portfolio as Portfolio] ?? project.portfolio}
        </Badge>
      </div>

      {(project.projectStages ?? []).length > 0 && (
        <div className={s.stages}>
          {project.projectStages.map((ps) => (
            <span key={ps.id} className={s.stageChip}>
              <span
                className={s.stageDot}
                style={{ backgroundColor: statusBarColor(ps.status) }}
              />
              {ps.label}
            </span>
          ))}
        </div>
      )}

      <div className={s.owner}>
        <Avatar name={personName(project.owner)} size={24} color="colorful" />
        <Text size={300} className={s.ownerText}>
          {personName(project.owner)}
        </Text>
      </div>

      <div className={s.footer}>
        <Icon name="flag" size={16} />
        <Text size={200} className={s.nextLabel}>
          Next:
        </Text>
        <Text size={200} className={s.nextValue}>
          {nextMilestone
            ? `${nextMilestone.name} · ${formatDate(nextMilestone.date)}`
            : "No upcoming milestone"}
        </Text>
      </div>
    </Link>
  );
}
