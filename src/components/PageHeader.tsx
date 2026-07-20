import type { ReactNode } from "react";
import { makeStyles, shorthands, tokens, Text } from "@fluentui/react-components";

const useStyles = makeStyles({
  root: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    columnGap: "16px",
    rowGap: "12px",
    flexWrap: "wrap",
    marginBottom: "20px",
    "@media (max-width: 640px)": {
      alignItems: "flex-start",
      flexDirection: "column",
      rowGap: "10px",
      marginBottom: "16px",
    },
  },
  titles: {
    display: "flex",
    flexDirection: "column",
    rowGap: "4px",
    minWidth: 0,
  },
  eyebrow: {
    color: tokens.colorBrandForeground2,
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  title: {
    margin: 0,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    columnGap: "8px",
    flexWrap: "wrap",
    "@media (max-width: 640px)": {
      width: "100%",
      "& > *": {
        flexGrow: 1,
      },
    },
  },
  divider: {
    height: "1px",
    backgroundColor: tokens.colorNeutralStroke2,
    ...shorthands.margin("0", "0", "24px", "0"),
    "@media (max-width: 640px)": {
      ...shorthands.margin("0", "0", "16px", "0"),
    },
  },
});

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, subtitle, actions }: PageHeaderProps): JSX.Element {
  const s = useStyles();
  return (
    <>
      <div className={s.root}>
        <div className={s.titles}>
          {eyebrow ? (
            <Text size={200} className={s.eyebrow}>
              {eyebrow}
            </Text>
          ) : null}
          <h1 className={s.title}>
            {/* size={700} on desktop, size={600} on mobile via CSS override */}
            <Text
              size={700}
              weight="bold"
              style={{ lineHeight: 1.15 }}
            >
              {title}
            </Text>
          </h1>
          {subtitle ? (
            <Text size={300} style={{ color: tokens.colorNeutralForeground3 }}>
              {subtitle}
            </Text>
          ) : null}
        </div>
        {actions ? <div className={s.actions}>{actions}</div> : null}
      </div>
      <div className={s.divider} />
    </>
  );
}
