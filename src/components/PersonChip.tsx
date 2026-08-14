/**
 * PersonChip — small inline display for a PersonRef or a bare name string.
 *
 * Renders an initials avatar badge + name when a full PersonRef is available.
 * Falls back to plain text for legacy string-only records.
 *
 * When an email address is available the name is wrapped in a mailto: link
 * so clicking it opens the user's email client pre-addressed to that person.
 */
import { makeStyles, shorthands, tokens } from "@fluentui/react-components";
import type { PersonRef } from "../types/models";
import { personName } from "../types/models";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const useStyles = makeStyles({
  chip: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: "6px",
  },
  avatar: {
    width: "22px",
    height: "22px",
    ...shorthands.borderRadius("50%"),
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    display: "grid",
    placeItems: "center",
    fontSize: "9px",
    fontWeight: 700,
    flexShrink: 0,
    lineHeight: 1,
  },
  name: {
    fontSize: "inherit",
    color: "inherit",
  },
  link: {
    textDecorationLine: "none",
    color: "inherit",
    ":hover": {
      textDecorationLine: "underline",
      color: tokens.colorBrandForeground1,
    },
  },
});

interface Props {
  person: PersonRef | string | null | undefined;
  /** When true, always render plain text even for full PersonRef (compact contexts). */
  textOnly?: boolean;
}

export function PersonChip({ person, textOnly }: Props): JSX.Element {
  const s = useStyles();
  const name = personName(person);

  if (!name) return <span />;

  const hasFullRef = typeof person === "object" && person !== null && (person.email || person.corpId);
  const email = typeof person === "object" && person !== null ? person.email : "";

  if (textOnly || !hasFullRef) {
    return <span className={s.name}>{name}</span>;
  }

  const nameEl = (
    <span className={s.chip}>
      <span className={s.avatar} aria-hidden="true">{initials(name)}</span>
      {email ? (
        <a
          href={`mailto:${email}`}
          className={s.link}
          title={`Email ${name} (${email})`}
          onClick={(e) => e.stopPropagation()}
        >
          {name}
        </a>
      ) : (
        <span className={s.name}>{name}</span>
      )}
    </span>
  );

  return nameEl;
}
