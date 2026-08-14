/**
 * TravelAlertBanner — dismissible warning banner shown on a project detail page
 * when the project's owner or sponsor has upcoming travel within 14 days.
 */
import { useState } from "react";
import {
  MessageBar,
  MessageBarBody,
  MessageBarActions,
  Button,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from "@fluentui/react-components";
import { Icon } from "./Icon";
import { NotifyDialog } from "./NotifyDialog";
import type { TravelAlert } from "../hooks/usePersonTravelAlerts";
import { formatDate } from "../lib/format";
import { readDismissed, writeDismissed } from "../lib/travelAlertDismissals";

const useStyles = makeStyles({
  wrap: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("8px"),
    marginBottom: "16px",
  },
  alertRow: {
    display: "flex",
    alignItems: "center",
    columnGap: "6px",
    flexWrap: "wrap" as const,
  },
  detail: {
    color: tokens.colorNeutralForeground2,
    fontSize: "13px",
  },
});

interface Props {
  alerts: TravelAlert[];
  projectTitle: string;
}

export function TravelAlertBanner({ alerts, projectTitle }: Props): JSX.Element | null {
  const s = useStyles();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(readDismissed);
  const [notifyAlert, setNotifyAlert] = useState<TravelAlert | null>(null);

  const visibleAlerts = alerts.filter((a) => !dismissedIds.has(a.entry.id));

  function dismissAll(): void {
    const next = new Set(dismissedIds);
    for (const a of visibleAlerts) next.add(a.entry.id);
    writeDismissed(next);
    setDismissedIds(next);
  }

  if (visibleAlerts.length === 0) return null;

  return (
    <div className={s.wrap}>
      <MessageBar intent="warning" layout="multiline">
        <MessageBarBody>
          <Text weight="semibold" block>
            Travel alert — key people are travelling soon
          </Text>
          {visibleAlerts.map((alert, i) => (
            <div key={i} className={s.alertRow}>
              <Icon name="plane" size={13} />
              <span className={s.detail}>
                <strong>{alert.person.name}</strong> ({alert.role}) is travelling to{" "}
                <strong>{alert.entry.site}</strong>{" "}
                {formatDate(alert.entry.departureDate)} – {formatDate(alert.entry.returnDate)}
              </span>
              {alert.person.email && (
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<Icon name="mail" size={12} />}
                  onClick={() => setNotifyAlert(alert)}
                  style={{ padding: "0 4px", minWidth: 0 }}
                >
                  Notify
                </Button>
              )}
            </div>
          ))}
        </MessageBarBody>
        <MessageBarActions
          containerAction={
            <Button
              appearance="subtle"
              size="small"
              aria-label="Dismiss"
              icon={<Icon name="close" size={14} />}
              onClick={dismissAll}
            />
          }
        />
      </MessageBar>

      {notifyAlert && (
        <NotifyDialog
          open={!!notifyAlert}
          onClose={() => setNotifyAlert(null)}
          recipientName={notifyAlert.person.name}
          recipientEmail={notifyAlert.person.email}
          defaultSubject={`Heads up: your upcoming travel overlaps with ${projectTitle}`}
          defaultBody={`Hi ${notifyAlert.person.name},\n\nI wanted to flag that your upcoming travel to ${notifyAlert.entry.site} (${formatDate(notifyAlert.entry.departureDate)} – ${formatDate(notifyAlert.entry.returnDate)}) overlaps with the ${projectTitle} project, where you are listed as ${notifyAlert.role}.\n\nPlease let me know if any project activities need to be rescheduled or if there's anything I can help with.\n\nThanks`}
        />
      )}
    </div>
  );
}
