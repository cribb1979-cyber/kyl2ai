import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AddFridgeItemModal } from "../../components/AddFridgeItemModal";
import { FridgeItemCard } from "../../components/FridgeItemCard";
import { SectionHeader } from "../../components/SectionHeader";
import { colors, fonts, radius, spacing } from "../../constants/theme";
import { listFridgeEntries, type FridgeEntry } from "../../db/queries/fridge";
import { getHabitSuggestions, type HabitSuggestion } from "../../db/queries/habits";
import { addToShoppingList } from "../../db/queries/shoppingList";
import { rescheduleExpiryNotifications } from "../../services/notifications";

const FILTERS = [
  { key: "all", label: "Alla" },
  { key: "fridge", label: "Kylskåp" },
  { key: "pantry", label: "Skafferi" },
  { key: "freezer", label: "Frys" },
] as const;

export default function FridgeScreen() {
  const [entries, setEntries] = useState<FridgeEntry[]>([]);
  const [habits, setHabits] = useState<HabitSuggestion[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [modalVisible, setModalVisible] = useState(false);

  const load = useCallback(async () => {
    const [fridgeEntries, habitSuggestions] = await Promise.all([
      listFridgeEntries(),
      getHabitSuggestions(),
    ]);
    setEntries(fridgeEntries);
    setHabits(habitSuggestions);
    rescheduleExpiryNotifications().catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = useMemo(
    () => (filter === "all" ? entries : entries.filter((e) => e.location === filter)),
    [entries, filter]
  );

  async function addHabitSuggestionToList(suggestion: HabitSuggestion) {
    await addToShoppingList(suggestion.item_id);
    setHabits((prev) => prev.filter((h) => h.item_id !== suggestion.item_id));
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Skafferiet</Text>
        <Text style={styles.headerMono}>{entries.length} varor</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {habits.length > 0 && (
              <>
                <SectionHeader title="Vaneförslag" mono={`${habits.length}`} />
                {habits.map((h) => (
                  <Pressable
                    key={h.item_id}
                    style={styles.habitRow}
                    onPress={() => addHabitSuggestionToList(h)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.habitName}>{h.name}</Text>
                      <Text style={styles.habitMeta}>
                        Vanligtvis var {h.avg_interval_days}:e dag · {h.days_since_last} dagar sedan
                      </Text>
                    </View>
                    <Ionicons name="add-circle" size={22} color={colors.teal} />
                  </Pressable>
                ))}
              </>
            )}

            <SectionHeader title="Skafferi" mono={new Date().toISOString().slice(0, 10)} />
            <View style={styles.filterRow}>
              {FILTERS.map((f) => (
                <Pressable
                  key={f.key}
                  style={[styles.filterPill, filter === f.key && styles.filterPillActive]}
                  onPress={() => setFilter(f.key)}
                >
                  <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        }
        renderItem={({ item }) => <FridgeItemCard entry={item} />}
        ListEmptyComponent={
          <Text style={styles.empty}>Inga varor här än. Tryck på + för att lägga till.</Text>
        }
      />

      <Pressable style={styles.scanFab} onPress={() => router.push("/scan")}>
        <Ionicons name="camera" size={22} color={colors.graphite} />
      </Pressable>

      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={28} color={colors.white} />
      </Pressable>

      <AddFridgeItemModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdded={load}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.graphite,
  },
  headerMono: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.graphiteMuted,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  filterPillActive: {
    backgroundColor: colors.tealMuted,
    borderColor: colors.teal,
  },
  filterText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.graphiteMuted,
  },
  filterTextActive: {
    color: colors.graphite,
  },
  habitRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.amberMuted,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  habitName: {
    fontFamily: fonts.displayMedium,
    fontSize: 14,
    color: colors.graphite,
  },
  habitMeta: {
    fontFamily: fonts.mono,
    fontSize: 11,
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
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.graphite,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  scanFab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.xl + 64,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.graphite,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
});
