import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SchematicCard } from "../../components/SchematicCard";
import { colors, fonts, radius, spacing } from "../../constants/theme";
import { createStore, listStores, type Store } from "../../db/queries/stores";

export default function StoresScreen() {
  const [stores, setStores] = useState<Store[]>([]);
  const [newStoreName, setNewStoreName] = useState("");

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

  async function handleCreate() {
    const trimmed = newStoreName.trim();
    if (!trimmed) return;
    try {
      await createStore(trimmed);
      setNewStoreName("");
      await load();
    } catch (error) {
      console.warn("[stores] failed to create", error);
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
        <Pressable style={styles.addButton} onPress={handleCreate}>
          <Ionicons name="add" size={20} color={colors.white} />
        </Pressable>
      </View>

      <FlatList
        data={stores}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <SchematicCard onPress={() => router.push(`/stores/${item.id}/edit`)} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.name}>{item.name}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.graphiteMuted} />
            </View>
            <Text style={styles.meta}>{item.department_order.length} avdelningar ordnade</Text>
          </SchematicCard>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Lägg till dina butiker för att ordna inköpslistan efter hur du går i just den butiken.
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
    marginBottom: spacing.md,
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
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: spacing.lg,
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
