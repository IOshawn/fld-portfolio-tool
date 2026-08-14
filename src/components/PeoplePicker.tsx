/**
 * PeoplePicker — single-select searchable people picker backed by Microsoft Graph.
 *
 * In production (Azure SWA with Entra ID): searches Azure AD live via Graph API
 * with debounced autocomplete, returning the full person identity (name, email, corpId).
 *
 * In Replit / offline: falls back to the local people.json directory automatically
 * when Graph is unavailable — no config change needed.
 *
 * Selecting a person always emits a full PersonRef. Free-text fallback emits
 * { name, email: "", corpId: "" } so callers always receive a consistent type.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { makeStyles, shorthands, tokens, Text, Spinner } from "@fluentui/react-components";
import { Icon } from "./Icon";
import type { PersonRef } from "../types/models";
import { personName } from "../types/models";
import { graphSearchUsers } from "../services/graphClient";
import rawPeople from "../data/people.json";

interface LocalPerson {
  name: string;
  corpId: string;
  email: string;
}

const LOCAL_PEOPLE: LocalPerson[] = rawPeople as LocalPerson[];

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
  spinnerWrap: {
    position: "absolute",
    right: "8px",
    display: "inline-flex",
    alignItems: "center",
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
  /** Current value — accepts a full PersonRef or a legacy bare-name string. */
  value: PersonRef | string;
  /** Called whenever the selected person changes. Always emits a full PersonRef. */
  onChange: (person: PersonRef) => void;
  placeholder?: string;
  /** Mark field as required (passes through to the underlying input). */
  required?: boolean;
}

const DEBOUNCE_MS = 280;

export function PeoplePicker({
  value,
  onChange,
  placeholder = "Search by name or email…",
  required,
}: Props): JSX.Element {
  const s = useStyles();

  const displayName = personName(value);

  // query drives the displayed input text and dropdown filter
  const [query, setQuery] = useState(displayName);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // Results: null = not yet searched, [] = no results
  const [graphResults, setGraphResults] = useState<PersonRef[] | null>(null);
  const [graphAvailable, setGraphAvailable] = useState<boolean | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync when the parent resets the value (e.g. drawer opens)
  useEffect(() => {
    setQuery(personName(value));
  }, [value]);

  // Close on outside click and commit free-text
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  /** Search Graph with debounce; fall back to local list on failure. */
  const doSearch = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setGraphResults(null);
      setLoading(false);
      return;
    }

    // If Graph already known unavailable, skip
    if (graphAvailable === false) {
      setGraphResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const results = await graphSearchUsers(q);
      setGraphResults(results);
      setGraphAvailable(true);
    } catch {
      // Graph unavailable (Replit dev, no auth token, etc.) — use local list
      setGraphAvailable(false);
      setGraphResults(null);
    } finally {
      setLoading(false);
    }
  }, [graphAvailable]);

  const handleQueryChange = (q: string) => {
    setQuery(q);
    setOpen(true);

    // Debounce Graph search
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), DEBOUNCE_MS);
  };

  // Compute displayed options: Graph results if available, otherwise local filter
  const options: PersonRef[] = (() => {
    if (graphAvailable && graphResults !== null) {
      return graphResults;
    }
    // Local fallback
    if (!query) return LOCAL_PEOPLE;
    const q = query.toLowerCase();
    return LOCAL_PEOPLE.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.corpId.toLowerCase().includes(q)
    );
  })();

  const handleSelect = useCallback(
    (person: PersonRef) => {
      setQuery(person.name);
      onChange(person);
      setOpen(false);
      setGraphResults(null);
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    onChange({ name: "", email: "", corpId: "" });
    setOpen(false);
    setGraphResults(null);
  }, [onChange]);

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      const trimmed = query.trim();
      if (!trimmed) {
        // User cleared the field — propagate empty so parent state matches displayed text
        onChange({ name: "", email: "", corpId: "" });
        return;
      }
      // Try to match exactly in local list first, then fall back to free-text
      const match = LOCAL_PEOPLE.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
      onChange(match ?? { name: trimmed, email: "", corpId: "" });
    }, 150);
  }, [query, onChange]);

  // Is the current value matched in directory (local or graph)?
  const isMatch =
    LOCAL_PEOPLE.some((p) => p.name === displayName) ||
    (graphAvailable === true && graphResults?.some((p) => p.name === displayName));

  const currentValueRef = typeof value === "object" ? value : null;
  const hasFullRef = currentValueRef && (currentValueRef.email || currentValueRef.corpId);

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
          onChange={(e) => handleQueryChange(e.target.value)}
          onBlur={handleBlur}
        />
        {loading ? (
          <span className={s.spinnerWrap}>
            <Spinner size="extra-tiny" />
          </span>
        ) : query ? (
          <button
            type="button"
            className={s.clearBtn}
            onMouseDown={(e) => {
              e.preventDefault();
              handleClear();
            }}
            aria-label="Clear"
          >
            <Icon name="close" size={14} />
          </button>
        ) : null}
      </div>

      {!isMatch && !hasFullRef && query && !loading && (
        <div className={s.hint}>Not in directory — will be saved as entered.</div>
      )}

      {open && (
        <div className={s.dropdown}>
          {options.length === 0 ? (
            <div className={s.noResults}>
              <Text size={200}>
                No matches for &ldquo;{query}&rdquo; — name will be saved as entered.
              </Text>
            </div>
          ) : (
            options.map((p, i) => (
              <div
                key={p.corpId || p.email || `${p.name}-${i}`}
                className={`${s.option} ${
                  p.name === displayName ? s.optionSelected : ""
                }`}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur before click
                  handleSelect(p);
                }}
              >
                <span className={s.avatar} aria-hidden>
                  {initials(p.name)}
                </span>
                <div className={s.optionText}>
                  <span className={s.optionName}>{p.name}</span>
                  {p.email && (
                    <span className={s.optionEmail}>{p.email}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
