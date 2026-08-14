import { makeStyles, tokens } from "@fluentui/react-components";

const useStyles = makeStyles({
  root: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "240px",
    width: "100%",
  },
  spinner: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    border: `3px solid ${tokens.colorNeutralStroke2}`,
    borderTopColor: tokens.colorBrandBackground,
    animationName: {
      from: { transform: "rotate(0deg)" },
      to: { transform: "rotate(360deg)" },
    },
    animationDuration: "0.7s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
  },
});

export function PageLoader(): JSX.Element {
  const s = useStyles();
  return (
    <div className={s.root} aria-label="Loading page…" role="status">
      <div className={s.spinner} />
    </div>
  );
}
