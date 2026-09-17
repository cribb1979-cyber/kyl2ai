import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ShoppingListRow } from "../db/queries/shoppingList";
import { colors, fonts, radius, spacing } from "../constants/theme";

export function ShoppingListItem({
  row,
  onToggle,
  onRemove,
}: {
  row: ShoppingListRow;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.container}>
      <Pressable style={styles.checkRow} onPress={onToggle} hitSlop={8}>
        <View style={[styles.checkbox, row.checked ? styles.checkboxChecked : null]}>
          {!!row.checked && <Ionicons name="checkmark" size={14} color={colors.white} />}
        </View>
        <Text style={[styles.name, row.checked ? styles.nameChecked : null]}>{row.name}</Text>
      </Pressable>
      <Pressable onPress={onRemove} hitSlop={8}>
        <Ionicons name="close" size={18} color={colors.graphiteMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.teal,
    marginRight: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.teal,
  },
  name: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.graphite,
  },
  nameChecked: {
    color: colors.graphiteMuted,
    textDecorationLine: "line-through",
  },
});
