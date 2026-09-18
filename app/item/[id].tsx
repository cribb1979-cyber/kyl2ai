import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CountdownBadge } from "../../components/CountdownBadge";
import { SchematicCard } from "../../components/SchematicCard";
import { colors, fonts, radius, spacing } from "../../constants/theme";
import {
  getFridgeEntry,
  removeFridgeEntry,
  updateFridgeEntry,
  type FridgeEntry,
} from "../../db/queries/fridge";
import { getItemPurchaseStats } from "../../db/queries/habits";
import { rescheduleExpiryNotifications } from "../../services/notifications";

const LOCATION_LABELS: Record<string, string> = {
  fridge: "Kylskåp",
  pantry: "Skafferi",
  freezer: "Frys",
};

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entryId = Number(id);
  const [entry, setEntry] = useState<FridgeEntry | null>(null);
  const [stats, setStats] = useState<{
    purchase_count: number;
    avg_interval_days: number | null;
    last_purchased: string | null;
  } | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(entryId)) return;
    try {
      const result = await getFridgeEntry(entryId);
      setEntry(result);
      if (result) {
        setStats(await getItemPurchaseStats(result.item_id));
      }
    } catch (error) {
      console.warn("[item] failed to load", error);
    }
  }, [entryId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!entry) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>Laddar…</Text>
      </View>
    );
  }

  async function adjustExpiry(deltaDays: number) {
    if (!entry) return;
    try {
      const date = new Date(entry.expiry_date + "T00:00:00");
      date.setDate(date.getDate() + deltaDays);
      await updateFridgeEntry(entry.id, { expiry_date: date.toISOString().slice(0, 10) });
      await rescheduleExpiryNotifications();
      await load();
    } catch (error) {
      console.warn("[item] failed to adjust expiry", error);
    }
  }

  async function adjustQuantity(delta: number) {
    if (!entry) return;
    try {
      const next = Math.max(0, entry.quantity + delta);
      await updateFridgeEntry(entry.id, { quantity: next });
      await load();
    } catch (error) {
      console.warn("[item] failed to adjust quantity", error);
    }
  }

  function handleDelete() {
    Alert.alert("Ta bort vara", `Ta bort ${entry?.name} från skafferiet?`, [
      { text: "Avbryt", style: "cancel" },
      {
        text: "Ta bort",
        style: "destructive",
        onPress: async () => {
          if (!entry) return;
          try {
            await removeFridgeEntry(entry.id);
            await rescheduleExpiryNotifications();
            router.back();
          } catch (error) {
            console.warn("[item] failed to delete", error);
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{entry.name}</Text>
      <Text style={styles.category}>
        {entry.category} · {LOCATION_LABELS[entry.location] ?? entry.location}
      </Text>

      <View style={styles.badgeRow}>
        <CountdownBadge daysLeft={entry.days_left} />
      </View>

      <SchematicCard style={styles.card}>
        <Text style={styles.label}>Bäst-före</Text>
        <View style={styles.stepperRow}>
          <Pressable style={styles.stepperButton} onPress={() => adjustExpiry(-1)}>
            <Ionicons name="remove" size={18} color={colors.graphite} />
          </Pressable>
          <Text style={styles.mono}>{entry.expiry_date}</Text>
          <Pressable style={styles.stepperButton} onPress={() => adjustExpiry(1)}>
            <Ionicons name="add" size={18} color={colors.graphite} />
          </Pressable>
        </View>

        <Text style={styles.label}>Antal</Text>
        <View style={styles.stepperRow}>
          <Pressable style={styles.stepperButton} onPress={() => adjustQuantity(-1)}>
            <Ionicons name="remove" size={18} color={colors.graphite} />
          </Pressable>
          <Text style={styles.mono}>{entry.quantity}</Text>
          <Pressable style={styles.stepperButton} onPress={() => adjustQuantity(1)}>
            <Ionicons name="add" size={18} color={colors.graphite} />
          </Pressable>
        </View>
      </SchematicCard>

      {stats && stats.purchase_count > 0 && (
        <SchematicCard style={styles.card}>
          <Text style={styles.label}>Köphistorik</Text>
          <Text style={styles.body}>{stats.purchase_count} tidigare köp</Text>
          {stats.avg_interval_days != null && (
            <Text style={styles.body}>Snitt {stats.avg_interval_days} dagar mellan köp</Text>
          )}
          {stats.last_purchased && (
            <Text style={styles.body}>Senast köpt {stats.last_purchased}</Text>
          )}
        </SchematicCard>
      )}

      <Pressable style={styles.deleteButton} onPress={handleDelete}>
        <Ionicons name="trash" size={16} color={colors.coral} />
        <Text style={styles.deleteButtonText}>Ta bort vara</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.graphite,
  },
  category: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.graphiteMuted,
    marginTop: 2,
  },
  badgeRow: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.graphiteMuted,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  stepperButton: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
    padding: spacing.xs,
  },
  mono: {
    fontFamily: fonts.mono,
    fontSize: 16,
    color: colors.graphite,
    minWidth: 90,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.graphite,
    marginTop: 2,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.coral,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  deleteButtonText: {
    fontFamily: fonts.displayMedium,
    fontSize: 14,
    color: colors.coral,
  },
});
