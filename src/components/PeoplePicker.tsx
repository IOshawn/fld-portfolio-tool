/**
 * PeoplePicker — single-select searchable people picker.
 *
 * Filters a local people.json directory as the user types. Shows display name
 * and corp email for each match. Selecting a person saves their canonical
 * display name. Allows free-text fallback if the person isn't in the list.
 *
 * Structured so the data source can be swapped for Microsoft Graph later
 * without changing the component's props or the fields that consume it.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { makeStyles, shorthands, tokens, Text } from "@fluentui/react-components";
import { Icon } from "./Icon";
import rawPeople from "../data/people.json";

interface Person {
  name: string;
  corpId: string;
  email: string;
}

const PEOPLE: Person[] = rawPeople as Person[];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const useStyles = makeStyles({
  root: {
    position: "relative",
  },
  inputWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    ...shorthands.padding("6px", "32px", "6px", "10px"),
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke1),
    ...shorthands.borderRadius("4px"),
    fontSize: "14px",
    fontFamily: "inherit",
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    outline: "none",
    ":focus": {
      borderTopColor: tokens.colorBrandStroke1,
      borderRightColor: tokens.colorBrandStroke1,
      borderBottomColor: tokens.colorBrandStroke1,
      borderLeftColor: tokens.colorBrandStroke1,
      boxShadow: `0 0 0 1px ${tokens.colorBrandStroke1}`,
    },
    "::placeholder": {
      color: tokens.colorNeutralForeground4,
    },
  },
  clearBtn: {
    position: "absolute",
    right: "8px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: tokens.colorNeutralForeground3,
    background: "none",
    border: "none",
    padding: 0,
    lineHeight: 1,
    ":hover": { color: tokens.colorNeutralForeground1 },
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
    ...shorthands.borderRadius("6px"),
    boxShadow: tokens.shadow8,
    zIndex: 200,
    maxHeight: "240px",
    overflowY: "auto",
  },
  option: {
    display: "flex",
    alignItems: "center",
    columnGap: "10px",
    ...shorthands.padding("8px", "12px"),
    cursor: "pointer",
    ":hover": { backgroundColor: tokens.colorNeutralBackground2 },
  },
  optionSelected: {
    backgroundColor: tokens.colorBrandBackground2,
    ":hover": { backgroundColor: tokens.colorBrandBackground2Hover },
  },
  avatar: {
    width: "30px",
    height: "30px",
    ...shorthands.borderRadius("50%"),
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    display: "grid",
    placeItems: "center",
    fontSize: "11px",
    fontWeight: 700,
    flexShrink: 0,
  },
  optionText: {
    display: "flex",
    flexDirection: "column",
    rowGap: "1px",
    minWidth: 0,
  },
  optionName: {
    fontSize: "13px",
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  optionEmail: {
    fontSize: "11px",
    color: tokens.colorNeutralForeground3,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  noResults: {
    ...shorthands.padding("10px", "12px"),
    color: tokens.colorNeutralForeground3,
    fontSize: "13px",
  },
  hint: {
    fontSize: "11px",
    color: tokens.colorNeutralForeground3,
    marginTop: "3px",
  },
});

interface Props {
  /** Current value — the display name string stored on the project. */
  value: string;
  /** Called whenever the value should change (on select or on free-text blur). */
  onChange: (name: string) => void;
  placeholder?: string;
  /** Mark field as required (passes through to the underlying input). */
  required?: boolean;
}

export function PeoplePicker({ value, onChange, placeholder = "Search by name or email…", required }: Props): JSX.Element {
  const s = useStyles();

  // query drives both the displayed input text and the dropdown filter
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync when the parent resets the value (e.g. drawer opens)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        // Commit whatever was typed as a free-text value
        onChange(query.trim());
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [query, onChange]);

  const filtered = PEOPLE.filter((p) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.corpId.toLowerCase().includes(q)
    );
  });

  const handleSelect = useCallback((person: Person) => {
    setQuery(person.name);
    onChange(person.name);
    setOpen(false);
  }, [onChange]);

  const handleClear = useCallback(() => {
    setQuery("");
    onChange("");
    setOpen(false);
  }, [onChange]);

  const isMatch = PEOPLE.some((p) => p.name === value);

  return (
    <div className={s.root} ref={containerRef}>
      <div className={s.inputWrap}>
        <input
          className={s.input}
          type="text"
          placeholder={placeholder}
          value={query}
          required={required}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onBlur={() => {
            // Delay so onMouseDown on an option fires first
            setTimeout(() => {
              onChange(query.trim());
            }, 150);
          }}
        />
        {query && (
          <button
            type="button"
            className={s.clearBtn}
            onMouseDown={(e) => { e.preventDefault(); handleClear(); }}
            aria-label="Clear"
          >
            <Icon name="close" size={14} />
          </button>
        )}
      </div>

      {!isMatch && query && (
        <div className={s.hint}>
          Not in directory — will be saved as entered.
        </div>
      )}

      {open && (
        <div className={s.dropdown}>
          {filtered.length === 0 ? (
            <div className={s.noResults}>
              <Text size={200}>No matches for "{query}" — name will be saved as entered.</Text>
            </div>
          ) : (
            filtered.map((p) => (
              <div
                key={p.corpId}
                className={`${s.option} ${p.name === value ? s.optionSelected : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur before click
                  handleSelect(p);
                }}
              >
                <span className={s.avatar} aria-hidden>{initials(p.name)}</span>
                <div className={s.optionText}>
                  <span className={s.optionName}>{p.name}</span>
                  <span className={s.optionEmail}>{p.email}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
