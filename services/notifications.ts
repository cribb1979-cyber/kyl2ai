import * as Notifications from "expo-notifications";
import { listFridgeEntries } from "../db/queries/fridge";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/**
 * Re-schedules a local "expiring soon" reminder for every fridge entry.
 * Cheap to call after any fridge mutation: cancels and rebuilds from scratch
 * so entries that were removed/edited never leave stale notifications behind.
 */
export async function rescheduleExpiryNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const granted = await requestNotificationPermission();
  if (!granted) return;

  const entries = await listFridgeEntries();
  const now = new Date();

  for (const entry of entries) {
    if (entry.days_left < 0 || entry.days_left > 3) continue;

    const triggerDate = new Date(entry.expiry_date + "T09:00:00");
    triggerDate.setDate(triggerDate.getDate() - 1);
    if (triggerDate.getTime() <= now.getTime()) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Går snart ut",
        body: `${entry.name} går ut ${entry.expiry_date}. Dags att använda den!`,
        data: { fridgeEntryId: entry.id },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
    });
  }
}
