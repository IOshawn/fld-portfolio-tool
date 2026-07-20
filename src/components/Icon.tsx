/**
 * Lightweight inline-SVG icon set (24px grid, 1.5 stroke, currentColor).
 * Kept dependency-free and self-contained so the icon surface is fully owned
 * by the app. Swap for @fluentui/react-icons later if a richer set is wanted.
 */
import * as React from "react";

export type IconName =
  | "home"
  | "roadmap"
  | "projects"
  | "sites"
  | "updates"
  | "search"
  | "filter"
  | "warning"
  | "check"
  | "chevronRight"
  | "add"
  | "person"
  | "flag"
  | "location"
  | "calendar"
  | "clock"
  | "engagements"
  | "grid"
  | "team"
  | "link"
  | "value"
  | "edit"
  | "close";

const PATHS: Record<IconName, React.ReactNode> = {
  home: <path d="M4 11.5 12 5l8 6.5M6 10.5V19h12v-8.5" />,
  roadmap: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="8" cy="7" r="1.4" />
      <circle cx="15" cy="12" r="1.4" />
      <circle cx="10" cy="17" r="1.4" />
    </>
  ),
  projects: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.2" />
      <rect x="13" y="4" width="7" height="7" rx="1.2" />
      <rect x="4" y="13" width="7" height="7" rx="1.2" />
      <rect x="13" y="13" width="7" height="7" rx="1.2" />
    </>
  ),
  sites: (
    <>
      <path d="M12 21s6-5.3 6-10a6 6 0 1 0-12 0c0 4.7 6 10 6 10Z" />
      <circle cx="12" cy="11" r="2.2" />
    </>
  ),
  updates: (
    <>
      <path d="M5 19h14M7 15.5 16 6.5l2 2-9 9-2.6.6.6-2.6Z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.2-3.2" />
    </>
  ),
  filter: <path d="M4 6h16l-6 7v5l-4 1.5V13L4 6Z" />,
  warning: (
    <>
      <path d="M12 4 21 19H3L12 4Z" />
      <path d="M12 10v4M12 16.5v.5" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="m8.5 12 2.3 2.3 4.7-4.7" />
    </>
  ),
  chevronRight: <path d="m9 6 6 6-6 6" />,
  add: <path d="M12 5v14M5 12h14" />,
  person: (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
    </>
  ),
  flag: <path d="M6 21V4m0 1h11l-2 3.5L17 12H6" />,
  location: (
    <>
      <path d="M12 21s6-5.3 6-10a6 6 0 1 0-12 0c0 4.7 6 10 6 10Z" />
      <circle cx="12" cy="11" r="2.2" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14" rx="1.6" />
      <path d="M4 9.5h16M8 4v3M16 4v3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.2l2.6 1.6" />
    </>
  ),
  engagements: (
    <>
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="18" cy="6" r="2.2" />
      <circle cx="12" cy="18" r="2.2" />
      <path d="M7.6 7.4 10.6 16M16.4 7.4 13.4 16M8 6h8" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="1.6" />
      <path d="M3.5 9.5h17M3.5 15h17M9.5 3.5v17M15 3.5v17" />
    </>
  ),
  team: (
    <>
      <circle cx="9" cy="9" r="2.8" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 7.2a2.6 2.6 0 0 1 0 5M17 14.2a5 5 0 0 1 3.5 4.8" />
    </>
  ),
  link: (
    <>
      <path d="M9.5 14.5 14.5 9.5" />
      <path d="M11 7.5 12.5 6a3.2 3.2 0 0 1 4.5 4.5l-1.5 1.5" />
      <path d="M13 16.5 11.5 18A3.2 3.2 0 0 1 7 13.5L8.5 12" />
    </>
  ),
  value: (
    <>
      <path d="M12 3v18" />
      <path d="M16 6.5c-1-1-2.4-1.5-4-1.5-2.2 0-4 1-4 3s1.8 2.6 4 3 4 1 4 3-1.8 3-4 3c-1.6 0-3-.5-4-1.5" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4l10.5-10.5-4-4L4 16v4Z" />
      <path d="m14.5 5.5 4 4" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  title?: string;
}

export function Icon({ name, size = 20, className, title }: IconProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  );
}
