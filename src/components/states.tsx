import type { ReactNode } from "react";
import { makeStyles, shorthands, tokens, Spinner, Text, Button } from "@fluentui/react-components";
import { Icon, type IconName } from "./Icon";

const useStyles = makeStyles({
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    rowGap: "10px",
    ...shorthands.padding("48px", "24px"),
    textAlign: "center",
  },
  iconWrap: {
    display: "grid",
    placeItems: "center",
    width: "44px",
    height: "44px",
    ...shorthands.borderRadius("50%"),
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground3,
  },
  muted: {
    color: tokens.colorNeutralForeground3,
    maxWidth: "420px",
  },
});

export function LoadingState({ label = "Loading portfolio…" }: { label?: string }): JSX.Element {
  const s = useStyles();
  return (
    <div className={s.center}>
      <Spinner size="medium" label={label} />
    </div>
  );
}

export function EmptyState({
  icon = "search",
  title,
  message,
  action,
}: {
  icon?: IconName;
  title: string;
  message?: string;
  action?: ReactNode;
}): JSX.Element {
  const s = useStyles();
  return (
    <div className={s.center}>
      <span className={s.iconWrap}>
        <Icon name={icon} size={22} />
      </span>
      <Text size={400} weight="semibold">
        {title}
      </Text>
      {message ? (
        <Text size={300} className={s.muted}>
          {message}
        </Text>
      ) : null}
      {action}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}): JSX.Element {
  const s = useStyles();
  return (
    <div className={s.center}>
      <span className={s.iconWrap} style={{ color: tokens.colorPaletteRedForeground1 }}>
        <Icon name="warning" size={22} />
      </span>
      <Text size={400} weight="semibold">
        Something went wrong
      </Text>
      <Text size={300} className={s.muted}>
        {message}
      </Text>
      {onRetry ? (
        <Button appearance="primary" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
