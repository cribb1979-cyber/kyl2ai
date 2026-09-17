import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import type { FridgeEntry } from "../db/queries/fridge";
import { colors, expiryStatus, fonts, spacing } from "../constants/theme";
import { CountdownBadge } from "./CountdownBadge";
import { SchematicCard } from "./SchematicCard";

export function FridgeItemCard({ entry }: { entry: FridgeEntry }) {
  const status = expiryStatus(entry.days_left);

  return (
    <SchematicCard
      onPress={() => router.push(`/item/${entry.id}`)}
      showCorners={status === "soon" || status === "expired"}
      style={styles.card}
    >
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.name}>{entry.name}</Text>
          <Text style={styles.meta}>
            {entry.category} · {entry.quantity} st · {entry.location === "fridge" ? "Kylskåp" : "Skafferi"}
          </Text>
        </View>
        <CountdownBadge daysLeft={entry.days_left} />
      </View>
    </SchematicCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  info: {
    flex: 1,
    marginRight: spacing.sm,
  },
  name: {
    fontFamily: fonts.displayMedium,
    fontSize: 16,
    color: colors.graphite,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.graphiteMuted,
    marginTop: 2,
  },
});
