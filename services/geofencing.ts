import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { listStores } from "../db/queries/stores";

/**
 * NOTE: this does not run inside Expo Go — background location + task
 * manager require a development build (`eas build --profile development`).
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
  // Hook point: fire a local notification pointing at the shopping list
  // when the user enters a known store's radius. Kept side-effect free here
  // so it can be unit tested; wire actual notification dispatch in the
  // caller once this is exercised on a device.
  console.log("[geofencing] entered region", region.identifier);
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
