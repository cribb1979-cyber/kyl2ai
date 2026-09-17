import { StyleSheet, Text, View } from "react-native";
import { colors, expiryColor, expiryStatus, fonts, radius, spacing } from "../constants/theme";

export function CountdownBadge({ daysLeft }: { daysLeft: number }) {
  const status = expiryStatus(daysLeft);
  const color = expiryColor(status);
  const label = status === "expired" ? `${Math.abs(daysLeft)}d sedan` : `${daysLeft}d kvar`;

  return (
    <View style={[styles.badge, { backgroundColor: color + "22", borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  text: {
    fontFamily: fonts.mono,
    fontSize: 12,
  },
});
