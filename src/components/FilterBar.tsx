import type { ReactNode } from "react";
import { makeStyles, shorthands, tokens, Dropdown, Option, Input, Field } from "@fluentui/react-components";
import { Icon } from "./Icon";

const useStyles = makeStyles({
  bar: {
    display: "flex",
    alignItems: "flex-end",
    columnGap: "12px",
    rowGap: "12px",
    flexWrap: "wrap",
    marginBottom: "20px",
    "@media (max-width: 640px)": {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
    },
  },
  search: {
    flexGrow: 1,
    minWidth: "220px",
    maxWidth: "360px",
    "@media (max-width: 640px)": {
      gridColumn: "1 / -1",
      minWidth: "unset",
      maxWidth: "unset",
    },
  },
  filter: {
    minWidth: "168px",
    "@media (max-width: 640px)": {
      minWidth: "unset",
      width: "100%",
    },
  },
  spacer: {
    flexGrow: 1,
    "@media (max-width: 640px)": {
      display: "none",
    },
  },
  count: {
    color: tokens.colorNeutralForeground3,
    fontSize: "13px",
    ...shorthands.padding("0", "0", "6px", "0"),
    whiteSpace: "nowrap",
    "@media (max-width: 640px)": {
      gridColumn: "1 / -1",
      paddingBottom: "0",
    },
  },
});

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  label = "Search",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
}): JSX.Element {
  const s = useStyles();
  return (
    <Field label={label} className={s.search}>
      <Input
        value={value}
        onChange={(_, data) => onChange(data.value)}
        placeholder={placeholder}
        contentBefore={<Icon name="search" size={16} />}
      />
    </Field>
  );
}

export function SelectFilter({
  label,
  value,
  options,
  onChange,
  allLabel,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  allLabel: string;
}): JSX.Element {
  const s = useStyles();
  const displayText = value === "" ? allLabel : value;
  return (
    <Field label={label} className={s.filter}>
      <Dropdown
        value={displayText}
        selectedOptions={[value]}
        onOptionSelect={(_, data) => onChange(data.optionValue ?? "")}
      >
        <Option value="" text={allLabel}>
          {allLabel}
        </Option>
        {options.map((opt) => (
          <Option key={opt} value={opt} text={opt}>
            {opt}
          </Option>
        ))}
      </Dropdown>
    </Field>
  );
}

export function SelectFilterKV({
  label,
  value,
  options,
  onChange,
  allLabel,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  allLabel: string;
}): JSX.Element {
  const s = useStyles();
  const displayText = value === "" ? allLabel : options.find((o) => o.value === value)?.label ?? value;
  return (
    <Field label={label} className={s.filter}>
      <Dropdown
        value={displayText}
        selectedOptions={[value]}
        onOptionSelect={(_, data) => onChange(data.optionValue ?? "")}
      >
        <Option value="" text={allLabel}>
          {allLabel}
        </Option>
        {options.map((opt) => (
          <Option key={opt.value} value={opt.value} text={opt.label}>
            {opt.label}
          </Option>
        ))}
      </Dropdown>
    </Field>
  );
}

export function FilterBar({ children }: { children: ReactNode }): JSX.Element {
  const s = useStyles();
  return <div className={s.bar}>{children}</div>;
}

export function ResultCount({ count, noun }: { count: number; noun: string }): JSX.Element {
  const s = useStyles();
  return (
    <>
      <div className={s.spacer} />
      <div className={s.count}>
        {count} {noun}
        {count === 1 ? "" : "s"}
      </div>
    </>
  );
}
