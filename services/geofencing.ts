import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { getStore, listStores } from "../db/queries/stores";
import { listShoppingList } from "../db/queries/shoppingList";

/**
 * NOTE: this does not run inside Expo Go — background location + task
 * manager require a real compiled build (any EAS profile — development,
 * preview or production all work; it's specifically the generic Expo Go
 * client that can't run custom background tasks).
 * iOS also hard-caps background region monitoring at ~20 regions, so we
 * only geofence stores the user has actually added.
 */
export const GEOFENCE_TASK = "kyl2ai-store-geofence";

TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  if (error) {
    console.warn("[geofencing] task error", error);
    return;
  }
  const event = data as { eventType: Location.GeofencingEventType; region: Location.LocationRegion };
  if (event?.eventType === Location.GeofencingEventType.Enter) {
    await onEnterStoreRegion(event.region);
  }
});

async function onEnterStoreRegion(region: Location.LocationRegion): Promise<void> {
  try {
    const storeId = Number(region.identifier);
    const [store, shoppingList] = await Promise.all([getStore(storeId), listShoppingList()]);
    const unchecked = shoppingList.filter((row) => !row.checked);
    if (unchecked.length === 0) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: store ? `Du är nära ${store.name}` : "Du är nära en butik",
        body: `${unchecked.length} vara${unchecked.length === 1 ? "" : "r"} kvar på inköpslistan.`,
        data: { storeId },
      },
      trigger: null,
    });
  } catch (err) {
    console.warn("[geofencing] failed to notify on region enter", err);
  }
}

export async function requestBackgroundLocationPermission(): Promise<boolean> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== "granted") return false;
  const background = await Location.requestBackgroundPermissionsAsync();
  return background.status === "granted";
}

/** (Re)starts geofencing for every store that has coordinates set. */
export async function syncStoreGeofences(radiusMeters = 150): Promise<void> {
  const hasPermission = await requestBackgroundLocationPermission();
  if (!hasPermission) return;

  const stores = await listStores();
  const regions: Location.LocationRegion[] = stores
    .filter((s) => s.lat != null && s.lng != null)
    .slice(0, 20) // iOS region cap
    .map((s) => ({
      identifier: String(s.id),
      latitude: s.lat as number,
      longitude: s.lng as number,
      radius: radiusMeters,
      notifyOnEnter: true,
      notifyOnExit: false,
    }));

  const alreadyStarted = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK);
  if (alreadyStarted) {
    await Location.stopGeofencingAsync(GEOFENCE_TASK);
  }
  if (regions.length > 0) {
    await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
  }
}

export async function stopStoreGeofences(): Promise<void> {
  const alreadyStarted = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK);
  if (alreadyStarted) {
    await Location.stopGeofencingAsync(GEOFENCE_TASK);
  }
}
