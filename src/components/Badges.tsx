import { Badge, makeStyles, shorthands } from "@fluentui/react-components";
import type {
  Status,
  Stage,
  MilestoneStatus,
  EngagementStage,
  EngagementStatus,
} from "../types/models";
import { statusColor, milestoneColor, engagementStatusColor, stageColor } from "../lib/theme";

/** Project RAG status — strong filled pill. */
export function StatusBadge({ status }: { status: Status }): JSX.Element {
  return (
    <Badge appearance="filled" color={statusColor(status)} shape="rounded">
      {status}
    </Badge>
  );
}

/** Project delivery stage — quiet outline chip. */
export function StageBadge({ stage }: { stage: Stage }): JSX.Element {
  return (
    <Badge appearance="outline" color="informative" shape="rounded">
      {stage}
    </Badge>
  );
}

export function MilestoneStatusBadge({ status }: { status: MilestoneStatus }): JSX.Element {
  return (
    <Badge appearance="filled" color={milestoneColor(status)} shape="rounded" size="small">
      {status}
    </Badge>
  );
}

/** Engagement activity status (Active / Planned / On Hold / Complete). */
export function EngagementStatusBadge({ status }: { status: EngagementStatus }): JSX.Element {
  return (
    <Badge appearance="tint" color={engagementStatusColor(status)} shape="rounded" size="small">
      {status}
    </Badge>
  );
}

const useStageStyles = makeStyles({
  chip: {
    display: "inline-flex",
    alignItems: "center",
    height: "20px",
    ...shorthands.padding("0", "8px"),
    ...shorthands.borderRadius("10px"),
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
});

/** Engagement deployment stage — colour from the stage ramp. */
export function EngagementStageBadge({ stage }: { stage: EngagementStage }): JSX.Element {
  const s = useStageStyles();
  return (
    <span className={s.chip} style={{ backgroundColor: stageColor(stage) }}>
      {stage}
    </span>
  );
}
