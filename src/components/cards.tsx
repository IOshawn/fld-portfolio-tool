import type { ReactNode } from "react";
import { makeStyles, shorthands, tokens, Text } from "@fluentui/react-components";
import { Icon, type IconName } from "./Icon";

const useStyles = makeStyles({
  surface: {
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
    ...shorthands.borderRadius("12px"),
    boxShadow: tokens.shadow2,
  },
  section: {
    display: "flex",
    flexDirection: "column",
  },
  sectionHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    columnGap: "12px",
    ...shorthands.padding("16px", "20px"),
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke2),
  },
  sectionHeadLeft: {
    display: "flex",
    alignItems: "center",
    columnGap: "10px",
    minWidth: 0,
  },
  sectionIcon: {
    color: tokens.colorBrandForeground2,
    display: "inline-flex",
  },
  sectionBody: {
    ...shorthands.padding("8px", "20px", "16px", "20px"),
  },
  bodyFlush: {
    ...shorthands.padding("0"),
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    rowGap: "4px",
    ...shorthands.padding("18px", "20px"),
  },
  statValue: {
    fontSize: "34px",
    lineHeight: 1,
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
    color: tokens.colorNeutralForeground1,
  },
  statLabel: {
    color: tokens.colorNeutralForeground3,
    fontWeight: 500,
  },
  statHint: {
    color: tokens.colorNeutralForeground3,
  },
  accentBar: {
    height: "3px",
    width: "36px",
    ...shorthands.borderRadius("3px"),
    marginBottom: "10px",
  },
});

interface SectionCardProps {
  title: string;
  icon?: IconName;
  action?: ReactNode;
  /** Remove body padding (for tables/lists that manage their own spacing). */
  flush?: boolean;
  children: ReactNode;
}

export function SectionCard({
  title,
  icon,
  action,
  flush,
  children,
}: SectionCardProps): JSX.Element {
  const s = useStyles();
  return (
    <section className={`${s.surface} ${s.section}`}>
      <div className={s.sectionHead}>
        <div className={s.sectionHeadLeft}>
          {icon ? (
            <span className={s.sectionIcon}>
              <Icon name={icon} size={18} />
            </span>
          ) : null}
          <Text size={400} weight="semibold">
            {title}
          </Text>
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      <div className={flush ? s.bodyFlush : s.sectionBody}>{children}</div>
    </section>
  );
}

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  accentColor?: string;
}

export function StatCard({ label, value, hint, accentColor }: StatCardProps): JSX.Element {
  const s = useStyles();
  return (
    <div className={`${s.surface} ${s.stat}`}>
      {accentColor ? (
        <span className={s.accentBar} style={{ backgroundColor: accentColor }} aria-hidden />
      ) : null}
      <span className={s.statValue}>{value}</span>
      <Text size={300} className={s.statLabel}>
        {label}
      </Text>
      {hint ? (
        <Text size={200} className={s.statHint}>
          {hint}
        </Text>
      ) : null}
    </div>
  );
}
