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

const NAV: { to: string; label: string; shortLabel: string; icon: IconName; end?: boolean; desktopOnly?: boolean }[] = [
  { to: "/", label: "Home", shortLabel: "Home", icon: "home", end: true },
  { to: "/roadmap", label: "Portfolio Roadmap", shortLabel: "Roadmap", icon: "roadmap" },
  { to: "/projects", label: "Projects", shortLabel: "Projects", icon: "projects" },
  { to: "/engagements", label: "Engagements", shortLabel: "Engage", icon: "engagements" },
  { to: "/travel", label: "Travel & Roster", shortLabel: "Travel", icon: "travel" },
  { to: "/sites", label: "Sites", shortLabel: "Sites", icon: "sites" },
  { to: "/updates", label: "Updates", shortLabel: "Updates", icon: "updates" },
  { to: "/quarterly", label: "Q3 Summary", shortLabel: "Q3", icon: "quarter" },
  { to: "/admin", label: "Admin", shortLabel: "Admin", icon: "admin", desktopOnly: true },
];

const useStyles = makeStyles({
  root: {
    display: "grid",
    gridTemplateColumns: "256px 1fr",
    minHeight: "100vh",
    backgroundColor: tokens.colorNeutralBackground3,
    "@media (max-width: 820px)": {
      gridTemplateColumns: "1fr",
      gridTemplateRows: "1fr",
    },
  },
  // ── Desktop sidebar ──────────────────────────────────────────────────────────
  aside: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRight("1px", "solid", tokens.colorNeutralStroke2),
    position: "sticky",
    top: 0,
    height: "100vh",
    "@media (max-width: 820px)": {
      display: "none",
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
  },
  // ── Main content area ────────────────────────────────────────────────────────
  main: {
    minWidth: 0,
    ...shorthands.overflow("auto"),
    "@media (max-width: 820px)": {
      // leave room for the fixed bottom nav bar (60px) + safe area
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    },
  },
  content: {
    width: "100%",
    maxWidth: "1240px",
    marginLeft: "auto",
    marginRight: "auto",
    ...shorthands.padding("28px", "32px", "56px", "32px"),
    "@media (max-width: 820px)": {
      // extra bottom padding so content isn't hidden behind the bottom nav
      ...shorthands.padding("20px", "16px", "84px", "16px"),
    },
    "@media (max-width: 640px)": {
      ...shorthands.padding("16px", "12px", "84px", "12px"),
    },
  },
  // ── Mobile bottom nav bar ────────────────────────────────────────────────────
  bottomNav: {
    display: "none",
    "@media (max-width: 820px)": {
      display: "flex",
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      backgroundColor: tokens.colorNeutralBackground1,
      ...shorthands.borderTop("1px", "solid", tokens.colorNeutralStroke2),
      boxShadow: tokens.shadow8,
      // safe-area for notched phones
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    },
  },
  bottomNavItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    rowGap: "3px",
    flexGrow: 1,
    flexBasis: 0,
    ...shorthands.padding("10px", "4px", "10px", "4px"),
    color: tokens.colorNeutralForeground3,
    textDecorationLine: "none",
    fontSize: "10px",
    fontWeight: 500,
    minWidth: 0,
    ":hover": {
      color: tokens.colorNeutralForeground1,
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  bottomNavItemActive: {
    color: tokens.colorBrandForeground2,
    fontWeight: 700,
  },
  bottomNavLabel: {
    textOverflow: "ellipsis",
    ...shorthands.overflow("hidden"),
    whiteSpace: "nowrap",
    maxWidth: "100%",
  },
});

export function AppShell(): JSX.Element {
  const s = useStyles();
  return (
    <div className={s.root}>
      {/* Desktop sidebar */}
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

      {/* Page content */}
      <main className={s.main}>
        <div className={s.content}>
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation bar (desktop-only items excluded) */}
      <nav className={s.bottomNav} aria-label="Primary">
        {NAV.filter((item) => !item.desktopOnly).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              mergeClasses(s.bottomNavItem, isActive && s.bottomNavItemActive)
            }
          >
            <Icon name={item.icon} size={22} />
            <span className={s.bottomNavLabel}>{item.shortLabel}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
