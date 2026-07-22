/**
 * TravelEntryForm — slide-in drawer for creating and editing travel entries.
 *
 * Note: Live flight data lookup is not available in this version.
 * The flight number field is stored for display and is the foundation
 * for future API integration.
 */
import { useState, useEffect } from "react";
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
  makeStyles,
  shorthands,
  tokens,
} from "@fluentui/react-components";
import { Icon } from "./Icon";
import type { TravelEntry, Project } from "../types/models";
import { SITES, WORK_AREAS, TRAVEL_STATUSES } from "../types/models";

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
});

type FormState = {
  person: string;
  initiativeId: string;
  site: string;
  workArea: string;
  team: string;
  departureDate: string;
  returnDate: string;
  flightNumber: string;
  description: string;
  status: string;
};

const BLANK: FormState = {
  person: "",
  initiativeId: "",
  site: "MDO",
  workArea: "OE/BI",
  team: "",
  departureDate: "",
  returnDate: "",
  flightNumber: "",
  description: "",
  status: "Planned",
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

export function TravelEntryForm({
  open,
  entry,
  projects,
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
      setForm({
        person: entry.person,
        initiativeId: entry.initiativeId,
        site: entry.site,
        workArea: entry.workArea,
        team: entry.team,
        departureDate: entry.departureDate,
        returnDate: entry.returnDate,
        flightNumber: entry.flightNumber ?? "",
        description: entry.description,
        status: entry.status,
      });
    } else {
      setForm(BLANK);
    }
    setError(null);
  }, [entry, open]);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const validate = (): string | null => {
    if (!form.person.trim()) return "Person name is required.";
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
        person: form.person.trim(),
        initiativeId: form.initiativeId,
        site: form.site as TravelEntry["site"],
        workArea: form.workArea as TravelEntry["workArea"],
        team: form.team.trim(),
        departureDate: form.departureDate,
        returnDate: form.returnDate,
        flightNumber: form.flightNumber.trim() || undefined,
        description: form.description.trim(),
        status: form.status as TravelEntry["status"],
        associatedWith: entry?.associatedWith ?? [],
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
            <Input
              value={form.person}
              onChange={(_, d) => set({ person: d.value })}
              placeholder="e.g. Sarah Chen"
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
