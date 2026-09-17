import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, spacing } from "../constants/theme";

export function SectionHeader({ title, mono }: { title: string; mono?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {!!mono && <Text style={styles.mono}>{mono}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.displayMedium,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.graphiteMuted,
  },
  mono: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.graphiteMuted,
  },
});
