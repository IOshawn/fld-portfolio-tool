import { makeStyles, shorthands, tokens, Text } from "@fluentui/react-components";

export interface BarItem {
  label: string;
  count: number;
  color: string;
}

const useStyles = makeStyles({
  list: {
    display: "flex",
    flexDirection: "column",
    rowGap: "12px",
    ...shorthands.padding("8px", "0"),
  },
  row: {
    display: "grid",
    gridTemplateColumns: "108px 1fr 28px",
    alignItems: "center",
    columnGap: "12px",
  },
  label: {
    color: tokens.colorNeutralForeground2,
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    ...shorthands.overflow("hidden"),
  },
  track: {
    height: "10px",
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.borderRadius("6px"),
    ...shorthands.overflow("hidden"),
  },
  fill: {
    height: "100%",
    ...shorthands.borderRadius("6px"),
    minWidth: "2px",
    transitionProperty: "width",
    transitionDuration: tokens.durationNormal,
  },
  count: {
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
  },
});

export function BarList({ items }: { items: BarItem[] }): JSX.Element {
  const s = useStyles();
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className={s.list}>
      {items.map((item) => (
        <div className={s.row} key={item.label}>
          <Text size={300} className={s.label}>
            {item.label}
          </Text>
          <div className={s.track}>
            <div
              className={s.fill}
              style={{
                width: `${(item.count / max) * 100}%`,
                backgroundColor: item.color,
                opacity: item.count === 0 ? 0.25 : 1,
              }}
            />
          </div>
          <span className={s.count}>{item.count}</span>
        </div>
      ))}
    </div>
  );
}
