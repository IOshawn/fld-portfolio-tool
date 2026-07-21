/**
 * InlineEdit — renders text normally, swaps to a controlled input on click.
 *
 * Usage: wrap any editable string with this component.
 * - Click enters edit mode
 * - Enter/blur commits the new value
 * - Escape cancels
 * - stopPropagation prevents parent click handlers (e.g. row toggles) from firing
 */
import { useState, useEffect, useRef } from "react";

export interface InlineEditProps {
  /** The current resolved value (already apply any override). */
  value: string;
  /** Called with the trimmed new value when the user commits. */
  onCommit: (value: string) => void;
  /** Shows a small blue dot and italic text to signal the value has been overridden. */
  isEdited?: boolean;
  /** className forwarded to the display <span> for text styling. */
  className?: string;
  /** Extra inline styles applied to both the span and the input. */
  style?: React.CSSProperties;
  /**
   * When true, the input is sized to content width (for inline contexts like chips).
   * When false (default), the input fills its container width.
   */
  inline?: boolean;
}

export function InlineEdit({
  value,
  onCommit,
  isEdited,
  className,
  style,
  inline = false,
}: InlineEditProps): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep draft in sync when external value changes (e.g. reset)
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation(); // Don't fire parent row toggle
    setDraft(value);
    setEditing(true);
  };

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed) onCommit(trimmed);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation(); // Don't trigger row keyboard handler
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { e.preventDefault(); cancel(); }
        }}
        style={{
          ...style,
          // Layout
          display: inline ? "inline" : "block",
          width: inline ? `${Math.max(draft.length + 2, 10)}ch` : "100%",
          minWidth: inline ? "6ch" : undefined,
          boxSizing: "border-box",
          // Reset
          border: "none",
          outline: "none",
          margin: 0,
          // Underline-only focus indicator
          borderBottom: "1.5px solid #0078d4",
          borderRadius: "2px 2px 0 0",
          background: "rgba(0,120,212,0.05)",
          padding: inline ? "0 1px" : "1px 2px",
          // Inherit typography
          font: "inherit",
          fontWeight: "inherit",
          fontSize: "inherit",
          fontStyle: "normal",
          color: "inherit",
          letterSpacing: "inherit",
          textTransform: "inherit",
        }}
      />
    );
  }

  return (
    <span
      className={className}
      onClick={startEditing}
      title="Click to edit"
      style={{
        ...style,
        cursor: "text",
        fontStyle: isEdited ? "italic" : undefined,
      }}
    >
      {value}
      {isEdited && (
        <span
          aria-label="edited"
          style={{
            display: "inline-block",
            width: 5,
            height: 5,
            borderRadius: "50%",
            backgroundColor: "#0078d4",
            marginLeft: 4,
            verticalAlign: "middle",
            flexShrink: 0,
          }}
        />
      )}
    </span>
  );
}
