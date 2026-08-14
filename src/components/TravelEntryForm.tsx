/**
 * TravelEntryForm — slide-in drawer for creating and editing travel entries.
 *
 * Note: Live flight data lookup is not available in this version.
 * The flight number field is stored for display and is the foundation
 * for future API integration.
 */
import { useState, useEffect, useMemo } from "react";
import {
  OverlayDrawer,
  DrawerHeader,
  DrawerHeaderTitle,
  DrawerBody,
  Button,
  Field,
  Input,
  Textarea,
  Select,
  Divider,
  Text,
  Spinner,
  Checkbox,
  makeStyles,
  shorthands,
  tokens,
} from "@fluentui/react-components";
import { Icon } from "./Icon";
import { PeoplePicker } from "./PeoplePicker";
import type { TravelEntry, Project, PersonRef } from "../types/models";
import { SITES, WORK_AREAS, TRAVEL_STATUSES, personName } from "../types/models";
import { formatDate } from "../lib/format";

const useStyles = makeStyles({
  body: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("4px"),
    paddingBottom: "100px",
  },
  section: {
    marginTop: "16px",
    marginBottom: "4px",
    fontWeight: 600,
    fontSize: "13px",
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    ...shorthands.gap("12px"),
  },
  footer: {
    position: "sticky",
    bottom: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderTop("1px", "solid", tokens.colorNeutralStroke2),
    ...shorthands.padding("16px", "20px"),
    display: "flex",
    justifyContent: "flex-end",
    ...shorthands.gap("8px"),
    zIndex: 1,
  },
  errorBox: {
    ...shorthands.padding("10px", "14px"),
    ...shorthands.borderRadius("6px"),
    backgroundColor: tokens.colorStatusDangerBackground1,
    color: tokens.colorStatusDangerForeground1,
    marginTop: "8px",
    fontSize: "13px",
  },
  flightHint: {
    color: tokens.colorNeutralForeground3,
    fontSize: "11px",
    marginTop: "2px",
    fontStyle: "italic",
  },
  deleteBtn: {
    marginRight: "auto",
  },
  assocList: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("4px"),
    marginTop: "4px",
    maxHeight: "200px",
    overflowY: "auto",
    ...shorthands.padding("4px", "0"),
  },
  assocOption: {
    display: "flex",
    flexDirection: "column",
    paddingLeft: "4px",
  },
  assocMeta: {
    fontSize: "11px",
    color: tokens.colorNeutralForeground3,
    marginLeft: "24px",
    marginTop: "-2px",
  },
  assocEmpty: {
    fontSize: "12px",
    color: tokens.colorNeutralForeground3,
    fontStyle: "italic",
    ...shorthands.padding("4px", "0"),
  },
});

type FormState = {
  person: PersonRef;
  initiativeId: string;
  site: string;
  workArea: string;
  team: string;
  departureDate: string;
  returnDate: string;
  flightNumber: string;
  description: string;
  status: string;
  associatedWith: string[];
};

const BLANK: FormState = {
  person: { name: "", email: "", corpId: "" },
  initiativeId: "",
  site: "MDO",
  workArea: "OE/BI",
  team: "",
  departureDate: "",
  returnDate: "",
  flightNumber: "",
  description: "",
  status: "Planned",
  associatedWith: [],
};

interface Props {
  open: boolean;
  entry?: TravelEntry | null;
  projects: Project[];
  allEntries: TravelEntry[];
  onSave: (entry: Omit<TravelEntry, "id"> & { id?: string }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onClose: () => void;
}

/** Add / remove an id from an array, returning a new array. */
function toggleId(arr: string[], id: string): string[] {
  return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
}

/** Add 'days' calendar days to an ISO date string. */
function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function TravelEntryForm({
  open,
  entry,
  projects,
  allEntries,
  onSave,
  onDelete,
  onClose,
}: Props): JSX.Element {
  const s = useStyles();
  const isEdit = !!entry;

  const [form, setForm] = useState<FormState>(BLANK);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when entry changes
  useEffect(() => {
    if (entry) {
      const person: PersonRef =
        typeof entry.person === "string"
          ? { name: entry.person as unknown as string, email: "", corpId: "" }
          : entry.person;
      setForm({
        person,
        initiativeId: entry.initiativeId,
        site: entry.site,
        workArea: entry.workArea,
        team: entry.team,
        departureDate: entry.departureDate,
        returnDate: entry.returnDate,
        flightNumber: entry.flightNumber ?? "",
        description: entry.description,
        status: entry.status,
        associatedWith: entry.associatedWith ?? [],
      });
    } else {
      setForm(BLANK);
    }
    setError(null);
  }, [entry, open]);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  /**
   * Candidate entries for "Travelling with":
   * - Same site as the currently selected site, OR
   * - Date ranges overlap or are within ±7 days of each other
   * - Excludes the entry being edited
   */
  const associationCandidates = useMemo(() => {
    const currentId = entry?.id ?? "";
    const dep = form.departureDate;
    const ret = form.returnDate;

    return allEntries.filter((e) => {
      if (e.id === currentId) return false; // exclude self

      const sameSite = e.site === form.site;

      let nearbyDates = false;
      if (dep && ret) {
        const windowStart = addDays(dep, -7);
        const windowEnd = addDays(ret, 7);
        nearbyDates = e.departureDate <= windowEnd && e.returnDate >= windowStart;
      } else if (dep) {
        nearbyDates = e.departureDate <= addDays(dep, 7) && e.returnDate >= addDays(dep, -7);
      }

      return sameSite || nearbyDates;
    });
  }, [allEntries, entry?.id, form.site, form.departureDate, form.returnDate]);

  const validate = (): string | null => {
    if (!form.person.name.trim()) return "Person name is required.";
    if (!form.departureDate) return "Departure date is required.";
    if (!form.returnDate) return "Return date is required.";
    if (form.returnDate < form.departureDate) return "Return date must be on or after departure date.";
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        ...(entry?.id ? { id: entry.id } : {}),
        person: form.person,
        initiativeId: form.initiativeId,
        site: form.site as TravelEntry["site"],
        workArea: form.workArea as TravelEntry["workArea"],
        team: form.team.trim(),
        departureDate: form.departureDate,
        returnDate: form.returnDate,
        flightNumber: form.flightNumber.trim() || undefined,
        description: form.description.trim(),
        status: form.status as TravelEntry["status"],
        associatedWith: form.associatedWith,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!entry?.id || !onDelete) return;
    setDeleting(true);
    try {
      await onDelete(entry.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <OverlayDrawer
      open={open}
      position="end"
      size="medium"
      onOpenChange={(_, { open: o }) => { if (!o) onClose(); }}
    >
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            <Button appearance="subtle" icon={<Icon name="close" size={18} />} onClick={onClose} />
          }
        >
          {isEdit ? "Edit travel entry" : "Log travel"}
        </DrawerHeaderTitle>
      </DrawerHeader>

      <DrawerBody>
        <div className={s.body}>
          <Text className={s.section}>Person &amp; trip</Text>

          <Field label="Person" required>
            <PeoplePicker
              value={form.person}
              onChange={(p) => set({ person: p })}
              placeholder="Search by name or email…"
              required
            />
          </Field>

          <Field label="Project / initiative">
            <Select
              value={form.initiativeId}
              onChange={(_, d) => set({ initiativeId: d.value })}
            >
              <option value="">— None —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </Select>
          </Field>

          <Text className={s.section}>Location</Text>

          <div className={s.row}>
            <Field label="Site" required>
              <Select value={form.site} onChange={(_, d) => set({ site: d.value })}>
                {SITES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Work area">
              <Select value={form.workArea} onChange={(_, d) => set({ workArea: d.value })}>
                {WORK_AREAS.map((w) => <option key={w} value={w}>{w}</option>)}
              </Select>
            </Field>
          </div>

          <Field label="Team">
            <Input
              value={form.team}
              onChange={(_, d) => set({ team: d.value })}
              placeholder="e.g. OE/BI Team"
            />
          </Field>

          <Text className={s.section}>Dates &amp; travel details</Text>

          <div className={s.row}>
            <Field label="Departure date" required>
              <Input
                type="date"
                value={form.departureDate}
                onChange={(_, d) => set({ departureDate: d.value })}
              />
            </Field>
            <Field label="Return date" required>
              <Input
                type="date"
                value={form.returnDate}
                onChange={(_, d) => set({ returnDate: d.value })}
              />
            </Field>
          </div>

          <Field label="Flight number">
            <Input
              value={form.flightNumber}
              onChange={(_, d) => set({ flightNumber: d.value })}
              placeholder="e.g. QF712"
            />
          </Field>
          <span className={s.flightHint}>
            Flight number is stored for reference. Live flight tracking is not available in this version.
          </span>

          <div className={s.row}>
            <Field label="Status">
              <Select value={form.status} onChange={(_, d) => set({ status: d.value })}>
                {TRAVEL_STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
              </Select>
            </Field>
          </div>

          <Divider style={{ marginTop: "16px" }} />

          {/* Association picker */}
          <Text className={s.section}>Travelling with</Text>
          <Field
            label="Select colleagues sharing this trip"
            hint={
              associationCandidates.length === 0
                ? "No nearby entries — fill in site and dates to see suggestions."
                : `${associationCandidates.length} entr${associationCandidates.length === 1 ? "y" : "ies"} at the same site or within ±7 days`
            }
          >
            <div className={s.assocList}>
              {associationCandidates.length === 0 ? (
                <span className={s.assocEmpty}>
                  No entries match the current site / date range.
                </span>
              ) : (
                associationCandidates.map((e) => {
                  const checked = form.associatedWith.includes(e.id);
                  const label = personName(e.person);
                  const meta = `${e.site} · ${formatDate(e.departureDate)} – ${formatDate(e.returnDate)}`;
                  return (
                    <div key={e.id} className={s.assocOption}>
                      <Checkbox
                        checked={checked}
                        onChange={() =>
                          set({ associatedWith: toggleId(form.associatedWith, e.id) })
                        }
                        label={label}
                      />
                      <span className={s.assocMeta}>{meta}</span>
                    </div>
                  );
                })
              )}
            </div>
          </Field>

          <Divider style={{ marginTop: "8px" }} />

          <Field label="Description / reason for trip">
            <Textarea
              value={form.description}
              onChange={(_, d) => set({ description: d.value })}
              placeholder="Purpose of visit, activities planned, etc."
              rows={4}
            />
          </Field>

          {error ? <div className={s.errorBox}>{error}</div> : null}
        </div>

        <div className={s.footer}>
          {isEdit && onDelete ? (
            <Button
              className={s.deleteBtn}
              appearance="subtle"
              disabled={deleting || saving}
              onClick={handleDelete}
            >
              {deleting ? <Spinner size="tiny" /> : null}
              Delete
            </Button>
          ) : null}
          <Button appearance="secondary" onClick={onClose} disabled={saving || deleting}>
            Cancel
          </Button>
          <Button appearance="primary" onClick={handleSave} disabled={saving || deleting}>
            {saving ? <Spinner size="tiny" /> : null}
            {isEdit ? "Save changes" : "Log travel"}
          </Button>
        </div>
      </DrawerBody>
    </OverlayDrawer>
  );
}
