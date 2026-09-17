import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DraggableFlatList, { type RenderItemParams } from "react-native-draggable-flatlist";
import { colors, fonts, radius, spacing } from "../../../constants/theme";
import { getStore, listDepartments, updateDepartmentOrder } from "../../../db/queries/stores";

type Department = { id: number; name: string; sort_order: number };

export default function StoreEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const storeId = Number(id);
  const [ordered, setOrdered] = useState<Department[]>([]);

  const load = useCallback(async () => {
    if (!Number.isFinite(storeId)) return;
    try {
      const [store, allDepartments] = await Promise.all([getStore(storeId), listDepartments()]);
      if (!store) return;
      const byId = new Map(allDepartments.map((d) => [d.id, d]));
      const inOrder = store.department_order
        .map((deptId) => byId.get(deptId))
        .filter(Boolean) as Department[];
      const missing = allDepartments.filter((d) => !store.department_order.includes(d.id));
      setOrdered([...inOrder, ...missing]);
    } catch (error) {
      console.warn("[stores/edit] failed to load", error);
    }
  }, [storeId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleReorder(data: Department[]) {
    setOrdered(data);
    try {
      await updateDepartmentOrder(storeId, data.map((d) => d.id));
    } catch (error) {
      console.warn("[stores/edit] failed to save order", error);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        Dra avdelningarna i den ordning du går genom butiken — inköpslistan sorteras efter detta.
      </Text>
      <DraggableFlatList
        data={ordered}
        keyExtractor={(item) => String(item.id)}
        onDragEnd={({ data }) => handleReorder(data)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, drag, isActive }: RenderItemParams<Department>) => (
          <View style={[styles.row, isActive && styles.rowActive]}>
            <Text style={styles.name}>{item.name}</Text>
            <Ionicons
              name="reorder-three"
              size={20}
              color={colors.graphiteMuted}
              onPressIn={drag}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.graphiteMuted,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowActive: {
    borderColor: colors.teal,
    backgroundColor: colors.tealMuted,
  },
  name: {
    fontFamily: fonts.displayMedium,
    fontSize: 15,
    color: colors.graphite,
  },
});
