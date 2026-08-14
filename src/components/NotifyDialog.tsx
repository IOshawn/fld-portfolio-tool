/**
 * NotifyDialog — compose and send a notification email via Microsoft Graph.
 *
 * Opens a Fluent UI Dialog pre-filled with recipient, subject, and body.
 * On send, calls graphSendMail and shows a toast. Falls back gracefully
 * when Graph / sendMail is unavailable (e.g. in Replit dev environment).
 */
import { useState } from "react";
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  Button,
  Field,
  Input,
  Textarea,
  Text,
  makeStyles,
  shorthands,
  tokens,
  Spinner,
} from "@fluentui/react-components";
import { Icon } from "./Icon";
import { graphSendMail, GraphPermissionError } from "../services/graphClient";

const useStyles = makeStyles({
  form: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("12px"),
    marginTop: "4px",
  },
  toRow: {
    display: "flex",
    alignItems: "center",
    columnGap: "8px",
  },
  toLabel: {
    color: tokens.colorNeutralForeground3,
    fontSize: "12px",
    minWidth: "56px",
    flexShrink: 0,
  },
  toValue: {
    fontSize: "13px",
    color: tokens.colorNeutralForeground1,
  },
  success: {
    display: "flex",
    alignItems: "center",
    columnGap: "8px",
    color: "#0e700e",
    fontWeight: 600,
    ...shorthands.padding("8px", "0"),
  },
  error: {
    color: tokens.colorStatusDangerForeground1,
    fontSize: "13px",
  },
  hint: {
    color: tokens.colorNeutralForeground3,
    fontSize: "11px",
  },
});

export interface NotifyDialogProps {
  open: boolean;
  onClose: () => void;
  /** Recipient name (display only) */
  recipientName: string;
  /** Recipient email address */
  recipientEmail: string;
  /** Pre-filled subject */
  defaultSubject: string;
  /** Pre-filled body */
  defaultBody: string;
}

export function NotifyDialog({
  open,
  onClose,
  recipientName,
  recipientEmail,
  defaultSubject,
  defaultBody,
}: NotifyDialogProps): JSX.Element {
  const s = useStyles();
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Reset form state when dialog opens
  const handleOpen = () => {
    setSubject(defaultSubject);
    setBody(defaultBody);
    setSending(false);
    setSent(false);
    setError(null);
    setPermissionDenied(false);
  };

  const handleSend = async () => {
    if (!recipientEmail) {
      setError("No email address available for this person.");
      return;
    }
    setSending(true);
    setError(null);
    setPermissionDenied(false);
    try {
      await graphSendMail({ to: recipientEmail, subject, body });
      setSent(true);
    } catch (err) {
      if (err instanceof GraphPermissionError) {
        setPermissionDenied(true);
        setError(
          "Graph Mail.Send permission is not configured for this app. " +
            'Use your mail client to send this message — click "Open mail client" below.'
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to send email. Make sure you are signed in with an account that has mail permissions."
        );
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(_, { open: o }) => {
        if (o) handleOpen();
        if (!o && !sending) onClose();
      }}
    >
      <DialogSurface style={{ maxWidth: "520px" }}>
        <DialogTitle>
          <div style={{ display: "flex", alignItems: "center", columnGap: "8px" }}>
            <Icon name="send" size={18} />
            Notify {recipientName}
          </div>
        </DialogTitle>
        <DialogBody>
          {sent ? (
            <div className={s.success}>
              <Icon name="check" size={18} />
              Email sent to {recipientName}.
            </div>
          ) : (
            <div className={s.form}>
              <div className={s.toRow}>
                <span className={s.toLabel}>To</span>
                <span className={s.toValue}>
                  {recipientName}
                  {recipientEmail ? ` <${recipientEmail}>` : ""}
                </span>
              </div>

              {!recipientEmail && (
                <Text className={s.hint}>
                  ⚠ No email address stored for this person. You can still compose a message, but
                  sending via Graph will fail. Use the mailto link instead.
                </Text>
              )}

              <Field label="Subject">
                <Input
                  value={subject}
                  onChange={(_, d) => setSubject(d.value)}
                  disabled={sending}
                />
              </Field>

              <Field label="Message">
                <Textarea
                  value={body}
                  onChange={(_, d) => setBody(d.value)}
                  resize="vertical"
                  rows={8}
                  disabled={sending}
                />
              </Field>

              {error && <Text className={s.error}>{error}</Text>}

              <Text className={s.hint}>
                Sends via Microsoft Graph (POST /me/sendMail). Requires Mail.Send permission.
                In development / Replit environments this will fail gracefully.
              </Text>
            </div>
          )}
        </DialogBody>
        <DialogActions>
          {sent ? (
            <Button appearance="primary" onClick={onClose}>
              Close
            </Button>
          ) : (
            <>
              <Button appearance="secondary" onClick={onClose} disabled={sending}>
                Cancel
              </Button>
              {recipientEmail && (
                <Button
                  as="a"
                  href={`mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
                  appearance={permissionDenied ? "primary" : "subtle"}
                  icon={<Icon name="mail" size={14} />}
                  disabled={sending}
                >
                  Open mail client
                </Button>
              )}
              {!permissionDenied && (
                <Button
                  appearance="primary"
                  onClick={handleSend}
                  disabled={sending || !recipientEmail}
                  icon={sending ? <Spinner size="tiny" /> : <Icon name="send" size={14} />}
                >
                  {sending ? "Sending…" : "Send via Graph"}
                </Button>
              )}
            </>
          )}
        </DialogActions>
      </DialogSurface>
    </Dialog>
  );
}
