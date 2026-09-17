import { useCallback, useMemo, useState } from "react";
import { Pressable, SectionList, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { ShoppingListItem } from "../../components/ShoppingListItem";
import { colors, fonts, radius, spacing } from "../../constants/theme";
import { findOrCreateItem } from "../../db/queries/fridge";
import {
  addToShoppingList,
  clearChecked,
  listShoppingList,
  removeFromShoppingList,
  setChecked,
  type ShoppingListRow,
} from "../../db/queries/shoppingList";

export default function ShoppingListScreen() {
  const [rows, setRows] = useState<ShoppingListRow[]>([]);
  const [newItemName, setNewItemName] = useState("");

  const load = useCallback(async () => {
    setRows(await listShoppingList());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const sections = useMemo(() => {
    const groups = new Map<string, ShoppingListRow[]>();
    for (const row of rows) {
      const key = row.department_name ?? "Övrigt";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }
    return Array.from(groups.entries()).map(([title, data]) => ({ title, data }));
  }, [rows]);

  const checkedCount = rows.filter((r) => r.checked).length;

  async function handleAdd() {
    const trimmed = newItemName.trim();
    if (!trimmed) return;
    const item = await findOrCreateItem({
      name: trimmed,
      category: "Övrigt",
      defaultShelfLifeDays: 7,
    });
    await addToShoppingList(item.id);
    setNewItemName("");
    load();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inköpslista</Text>
        <Text style={styles.headerMono}>
          {rows.length - checkedCount} kvar · {checkedCount} klara
        </Text>
      </View>

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          value={newItemName}
          onChangeText={setNewItemName}
          placeholder="Lägg till vara…"
          placeholderTextColor={colors.graphiteMuted}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <Pressable style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addButtonText}>Lägg till</Text>
        </Pressable>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <ShoppingListItem
            row={item}
            onToggle={async () => {
              await setChecked(item.id, !item.checked);
              load();
            }}
            onRemove={async () => {
              await removeFromShoppingList(item.id);
              load();
            }}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>Listan är tom.</Text>}
      />

      {checkedCount > 0 && (
        <Pressable
          style={styles.clearButton}
          onPress={async () => {
            await clearChecked();
            load();
          }}
        >
          <Text style={styles.clearButtonText}>Rensa {checkedCount} avbockade</Text>
        </Pressable>
      )}
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
    fontSize: 12,
    color: colors.graphiteMuted,
  },
  addRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
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
  addButton: {
    backgroundColor: colors.teal,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },
  addButtonText: {
    fontFamily: fonts.displayMedium,
    fontSize: 13,
    color: colors.white,
  },
  listContent: {
    paddingBottom: 100,
  },
  sectionTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.graphiteMuted,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.graphiteMuted,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  clearButton: {
    position: "absolute",
    bottom: spacing.xl,
    alignSelf: "center",
    backgroundColor: colors.graphite,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  clearButtonText: {
    fontFamily: fonts.displayMedium,
    fontSize: 13,
    color: colors.white,
  },
});
