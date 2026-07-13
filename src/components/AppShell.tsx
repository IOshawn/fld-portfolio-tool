import { NavLink, Outlet } from "react-router-dom";
import {
  makeStyles,
  shorthands,
  tokens,
  mergeClasses,
  Text,
  Badge,
} from "@fluentui/react-components";
import { Icon, type IconName } from "./Icon";

const NAV: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: "/", label: "Home", icon: "home", end: true },
  { to: "/roadmap", label: "Portfolio Roadmap", icon: "roadmap" },
  { to: "/projects", label: "Projects", icon: "projects" },
  { to: "/engagements", label: "Engagements", icon: "engagements" },
  { to: "/sites", label: "Sites", icon: "sites" },
  { to: "/updates", label: "Updates", icon: "updates" },
];

const useStyles = makeStyles({
  root: {
    display: "grid",
    gridTemplateColumns: "256px 1fr",
    minHeight: "100vh",
    backgroundColor: tokens.colorNeutralBackground3,
    "@media (max-width: 820px)": {
      gridTemplateColumns: "1fr",
    },
  },
  aside: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRight("1px", "solid", tokens.colorNeutralStroke2),
    position: "sticky",
    top: 0,
    height: "100vh",
    "@media (max-width: 820px)": {
      position: "static",
      height: "auto",
      ...shorthands.borderRight("0"),
      ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke2),
    },
  },
  brand: {
    display: "flex",
    flexDirection: "column",
    rowGap: "2px",
    ...shorthands.padding("20px", "20px", "16px", "20px"),
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke2),
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    columnGap: "10px",
  },
  brandMark: {
    display: "grid",
    placeItems: "center",
    width: "30px",
    height: "30px",
    ...shorthands.borderRadius("8px"),
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    fontWeight: 700,
    fontSize: "14px",
    flexShrink: 0,
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    rowGap: "2px",
    ...shorthands.padding("12px"),
    "@media (max-width: 820px)": {
      flexDirection: "row",
      ...shorthands.overflow("auto", "hidden"),
    },
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    columnGap: "12px",
    ...shorthands.padding("9px", "12px"),
    ...shorthands.borderRadius("8px"),
    color: tokens.colorNeutralForeground2,
    textDecorationLine: "none",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    whiteSpace: "nowrap",
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      color: tokens.colorNeutralForeground1,
    },
  },
  navItemActive: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground2,
    fontWeight: 600,
    ":hover": {
      backgroundColor: tokens.colorBrandBackground2,
      color: tokens.colorBrandForeground2,
    },
  },
  asideFooter: {
    marginTop: "auto",
    ...shorthands.padding("16px", "20px"),
    ...shorthands.borderTop("1px", "solid", tokens.colorNeutralStroke2),
    "@media (max-width: 820px)": {
      display: "none",
    },
  },
  main: {
    minWidth: 0,
    ...shorthands.overflow("auto"),
  },
  content: {
    width: "100%",
    maxWidth: "1240px",
    marginLeft: "auto",
    marginRight: "auto",
    ...shorthands.padding("28px", "32px", "56px", "32px"),
    "@media (max-width: 640px)": {
      ...shorthands.padding("20px", "16px", "40px", "16px"),
    },
  },
});

export function AppShell(): JSX.Element {
  const s = useStyles();
  return (
    <div className={s.root}>
      <aside className={s.aside}>
        <div className={s.brand}>
          <div className={s.brandRow}>
            <span className={s.brandMark} aria-hidden>
              FD
            </span>
            <div>
              <Text size={300} weight="semibold" block>
                Frontline Digital
              </Text>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                Portfolio Hub
              </Text>
            </div>
          </div>
        </div>

        <nav className={s.nav} aria-label="Primary">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                mergeClasses(s.navItem, isActive && s.navItemActive)
              }
            >
              <Icon name={item.icon} size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={s.asideFooter}>
          <Badge appearance="tint" color="informative" shape="rounded">
            Prototype · Mock data
          </Badge>
        </div>
      </aside>

      <main className={s.main}>
        <div className={s.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
