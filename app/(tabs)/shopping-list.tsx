import { useCallback, useMemo, useState } from "react";
import { Pressable, SectionList, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ShoppingListItem } from "../../components/ShoppingListItem";
import { colors, fonts, radius, spacing } from "../../constants/theme";
import { findOrCreateItem, searchItems } from "../../db/queries/fridge";
import {
  addToShoppingList,
  clearChecked,
  listShoppingList,
  removeFromShoppingList,
  setChecked,
  type ShoppingListRow,
} from "../../db/queries/shoppingList";

type SearchResult = { id: number; name: string; category: string; default_shelf_life_days: number };

export default function ShoppingListScreen() {
  const [rows, setRows] = useState<ShoppingListRow[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);

  const load = useCallback(async () => {
    try {
      setRows(await listShoppingList());
    } catch (error) {
      console.warn("[shopping-list] failed to load", error);
    }
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

  async function handleNameChange(text: string) {
    setNewItemName(text);
    if (text.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      setSuggestions(await searchItems(text.trim()));
    } catch (error) {
      console.warn("[shopping-list] failed to search items", error);
    }
  }

  async function addItem(name: string, category = "Övrigt", defaultShelfLifeDays = 7) {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const item = await findOrCreateItem({ name: trimmed, category, defaultShelfLifeDays });
      await addToShoppingList(item.id);
      setNewItemName("");
      setSuggestions([]);
      await load();
    } catch (error) {
      console.warn("[shopping-list] failed to add item", error);
    }
  }

  async function handleAdd() {
    await addItem(newItemName);
  }

  async function handleShare() {
    const unchecked = rows.filter((r) => !r.checked);
    if (unchecked.length === 0) return;
    try {
      const grouped = new Map<string, string[]>();
      for (const row of unchecked) {
        const key = row.department_name ?? "Övrigt";
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(row.name);
      }
      const body = Array.from(grouped.entries())
        .map(([dept, names]) => `${dept}\n${names.map((n) => `- ${n}`).join("\n")}`)
        .join("\n\n");
      await Share.share({ message: `Inköpslista:\n\n${body}` });
    } catch (error) {
      console.warn("[shopping-list] failed to share", error);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Inköpslista</Text>
          <Text style={styles.headerMono}>
            {rows.length - checkedCount} kvar · {checkedCount} klara
          </Text>
        </View>
        <Pressable onPress={handleShare} hitSlop={8}>
          <Ionicons name="share-outline" size={22} color={colors.graphite} />
        </Pressable>
      </View>

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          value={newItemName}
          onChangeText={handleNameChange}
          placeholder="Lägg till vara…"
          placeholderTextColor={colors.graphiteMuted}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <Pressable style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addButtonText}>Lägg till</Text>
        </Pressable>
      </View>

      {suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.map((s) => (
            <Pressable
              key={s.id}
              style={styles.suggestionRow}
              onPress={() => addItem(s.name, s.category, s.default_shelf_life_days)}
            >
              <Text style={styles.suggestionText}>{s.name}</Text>
              <Text style={styles.suggestionMeta}>{s.category}</Text>
            </Pressable>
          ))}
        </View>
      )}

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
              try {
                await setChecked(item.id, !item.checked);
                await load();
              } catch (error) {
                console.warn("[shopping-list] failed to toggle", error);
              }
            }}
            onRemove={async () => {
              try {
                await removeFromShoppingList(item.id);
                await load();
              } catch (error) {
                console.warn("[shopping-list] failed to remove", error);
              }
            }}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>Listan är tom.</Text>}
      />

      {checkedCount > 0 && (
        <Pressable
          style={styles.clearButton}
          onPress={async () => {
            try {
              await clearChecked();
              await load();
            } catch (error) {
              console.warn("[shopping-list] failed to clear checked", error);
            }
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
    alignItems: "center",
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
  suggestions: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  suggestionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  suggestionText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.graphite,
  },
  suggestionMeta: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.graphiteMuted,
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
