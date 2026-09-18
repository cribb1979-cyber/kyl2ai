import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { SchematicCard } from "../../components/SchematicCard";
import { colors, fonts, radius, spacing } from "../../constants/theme";
import { createStore, listStores, updateStoreLocation, type Store } from "../../db/queries/stores";
import { syncStoreGeofences } from "../../services/geofencing";

export default function StoresScreen() {
  const [stores, setStores] = useState<Store[]>([]);
  const [newStoreName, setNewStoreName] = useState("");
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locatingRow, setLocatingRow] = useState<number | null>(null);
  const [locatingNew, setLocatingNew] = useState(false);

  const load = useCallback(async () => {
    try {
      setStores(await listStores());
    } catch (error) {
      console.warn("[stores] failed to load", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function getCurrentLatLng(): Promise<{ lat: number; lng: number } | null> {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Behörighet saknas", "Ge appen tillgång till plats i Inställningar för att fortsätta.");
      return null;
    }
    const position = await Location.getCurrentPositionAsync({});
    return { lat: position.coords.latitude, lng: position.coords.longitude };
  }

  async function handleCaptureForNewStore() {
    setLocatingNew(true);
    try {
      const location = await getCurrentLatLng();
      if (location) setPendingLocation(location);
    } catch (error) {
      console.warn("[stores] failed to get current location", error);
      Alert.alert("Kunde inte hämta plats", "Försök igen.");
    } finally {
      setLocatingNew(false);
    }
  }

  async function handleCreate() {
    const trimmed = newStoreName.trim();
    if (!trimmed) return;
    try {
      await createStore(trimmed, pendingLocation?.lat, pendingLocation?.lng);
      setNewStoreName("");
      setPendingLocation(null);
      await load();
      if (pendingLocation) {
        syncStoreGeofences().catch((error) => console.warn("[stores] geofence sync failed", error));
      }
    } catch (error) {
      console.warn("[stores] failed to create", error);
    }
  }

  async function handleCaptureForStore(storeId: number) {
    setLocatingRow(storeId);
    try {
      const location = await getCurrentLatLng();
      if (!location) return;
      await updateStoreLocation(storeId, location.lat, location.lng);
      await load();
      syncStoreGeofences().catch((error) => console.warn("[stores] geofence sync failed", error));
    } catch (error) {
      console.warn("[stores] failed to update location", error);
      Alert.alert("Kunde inte spara plats", "Försök igen.");
    } finally {
      setLocatingRow(null);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          value={newStoreName}
          onChangeText={setNewStoreName}
          placeholder="Ny butik, t.ex. ICA Maxi"
          placeholderTextColor={colors.graphiteMuted}
          onSubmitEditing={handleCreate}
          returnKeyType="done"
        />
        <Pressable
          style={[styles.locationButton, !!pendingLocation && styles.locationButtonActive]}
          onPress={handleCaptureForNewStore}
          disabled={locatingNew}
        >
          <Ionicons
            name={pendingLocation ? "location" : "location-outline"}
            size={20}
            color={pendingLocation ? colors.white : colors.graphite}
          />
        </Pressable>
        <Pressable style={styles.addButton} onPress={handleCreate}>
          <Ionicons name="add" size={20} color={colors.white} />
        </Pressable>
      </View>
      {!!pendingLocation && (
        <Text style={styles.hint}>Din nuvarande plats sparas med butiken.</Text>
      )}

      <FlatList
        data={stores}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <SchematicCard onPress={() => router.push(`/stores/${item.id}/edit`)} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.name}>{item.name}</Text>
              <View style={styles.rowActions}>
                <Pressable
                  hitSlop={8}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleCaptureForStore(item.id);
                  }}
                  disabled={locatingRow === item.id}
                >
                  <Ionicons
                    name={item.lat != null ? "location" : "location-outline"}
                    size={18}
                    color={item.lat != null ? colors.teal : colors.graphiteMuted}
                  />
                </Pressable>
                <Ionicons name="chevron-forward" size={18} color={colors.graphiteMuted} />
              </View>
            </View>
            <Text style={styles.meta}>
              {item.department_order.length} avdelningar ordnade
              {item.lat != null ? " · plats sparad" : " · ingen plats sparad"}
            </Text>
          </SchematicCard>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Lägg till dina butiker för att ordna inköpslistan efter hur du går i just den butiken.
            Tryck på platsikonen när du är i butiken, så kan appen påminna dig om inköpslistan när
            du är i närheten nästa gång.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing.md,
  },
  addRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.graphiteMuted,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  locationButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  locationButtonActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  addButton: {
    backgroundColor: colors.teal,
    borderRadius: radius.sm,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  name: {
    fontFamily: fonts.displayMedium,
    fontSize: 16,
    color: colors.graphite,
  },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.graphiteMuted,
    marginTop: 2,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.graphiteMuted,
    textAlign: "center",
    marginTop: spacing.xl,
  },
});
