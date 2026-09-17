import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { addFridgeEntry, findOrCreateItem, searchItems } from "../db/queries/fridge";
import { colors, fonts, radius, spacing } from "../constants/theme";

type SearchResult = { id: number; name: string; category: string; default_shelf_life_days: number };

const LOCATIONS = [
  { key: "fridge", label: "Kylskåp" },
  { key: "pantry", label: "Skafferi" },
  { key: "freezer", label: "Frys" },
] as const;

const DATE_PRESETS = [
  { label: "+3d", days: 3 },
  { label: "+1v", days: 7 },
  { label: "+2v", days: 14 },
  { label: "+1mån", days: 30 },
] as const;

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysBetween(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const fromMidnight = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const toMidnight = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toMidnight.getTime() - fromMidnight.getTime()) / msPerDay);
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function AddFridgeItemModal({
  visible,
  onClose,
  onAdded,
}: {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [expiryDate, setExpiryDate] = useState(() => addDays(new Date(), 7));
  const [location, setLocation] = useState<(typeof LOCATIONS)[number]["key"]>("fridge");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      setName("");
      setResults([]);
      setSelected(null);
      setQuantity(1);
      setExpiryDate(addDays(new Date(), 7));
      setLocation("fridge");
    }
  }, [visible]);

  useEffect(() => {
    if (selected && selected.name === name) return;
    setSelected(null);
    if (name.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    searchItems(name.trim()).then((rows) => {
      if (!cancelled) setResults(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [name]);

  function pickResult(result: SearchResult) {
    setSelected(result);
    setName(result.name);
    setExpiryDate(addDays(new Date(), result.default_shelf_life_days));
    setResults([]);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const shelfLifeDays = daysBetween(new Date(), expiryDate);
      const item =
        selected ??
        (await findOrCreateItem({ name: name.trim(), category: "Övrigt", defaultShelfLifeDays: shelfLifeDays }));
      await addFridgeEntry({
        itemId: item.id,
        quantity,
        location,
        shelfLifeDays,
      });
      onAdded();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Lägg till vara</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.graphiteMuted} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Namn</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="t.ex. Mjölk"
              placeholderTextColor={colors.graphiteMuted}
            />
            {results.length > 0 && (
              <View style={styles.suggestions}>
                {results.map((r) => (
                  <Pressable key={r.id} style={styles.suggestionRow} onPress={() => pickResult(r)}>
                    <Text style={styles.suggestionText}>{r.name}</Text>
                    <Text style={styles.suggestionMeta}>{r.default_shelf_life_days}d hållbarhet</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={styles.label}>Plats</Text>
            <View style={styles.pillRow}>
              {LOCATIONS.map((loc) => (
                <Pressable
                  key={loc.key}
                  style={[styles.pill, location === loc.key && styles.pillActive]}
                  onPress={() => setLocation(loc.key)}
                >
                  <Text style={[styles.pillText, location === loc.key && styles.pillTextActive]}>
                    {loc.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Antal</Text>
            <Stepper value={quantity} onChange={setQuantity} min={1} />

            <Text style={styles.label}>Bäst-före-datum</Text>
            <View style={styles.dateRow}>
              <Pressable
                style={styles.stepperButton}
                onPress={() => setExpiryDate((d) => addDays(d, -1))}
              >
                <Ionicons name="remove" size={16} color={colors.graphite} />
              </Pressable>
              <Text style={styles.dateValue}>{formatDate(expiryDate)}</Text>
              <Pressable
                style={styles.stepperButton}
                onPress={() => setExpiryDate((d) => addDays(d, 1))}
              >
                <Ionicons name="add" size={16} color={colors.graphite} />
              </Pressable>
            </View>
            <View style={styles.pillRow}>
              {DATE_PRESETS.map((preset) => (
                <Pressable
                  key={preset.label}
                  style={styles.presetPill}
                  onPress={() => setExpiryDate(addDays(new Date(), preset.days))}
                >
                  <Text style={styles.presetPillText}>{preset.label}</Text>
                </Pressable>
              ))}
            </View>

          </ScrollView>

          <Pressable
            style={[styles.saveButton, (!name.trim() || saving) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!name.trim() || saving}
          >
            <Text style={styles.saveButtonText}>{saving ? "Sparar…" : "Lägg till"}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Stepper({
  value,
  onChange,
  min = 0,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable style={styles.stepperButton} onPress={() => onChange(Math.max(min, value - step))}>
        <Ionicons name="remove" size={16} color={colors.graphite} />
      </Pressable>
      <Text style={styles.stepperValue}>{value}</Text>
      <Pressable style={styles.stepperButton} onPress={() => onChange(value + step)}>
        <Ionicons name="add" size={16} color={colors.graphite} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(28,36,48,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: "85%",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.graphite,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.graphiteMuted,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.graphite,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  suggestions: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
    overflow: "hidden",
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
  pillRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  pillActive: {
    backgroundColor: colors.tealMuted,
    borderColor: colors.teal,
  },
  pillText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.graphiteMuted,
  },
  pillTextActive: {
    color: colors.graphite,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginBottom: spacing.sm,
  },
  dateValue: {
    fontFamily: fonts.mono,
    fontSize: 16,
    color: colors.graphite,
  },
  presetPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surfaceMuted,
  },
  presetPillText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.graphiteMuted,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  half: {
    flex: 1,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  stepperButton: {
    padding: spacing.xs,
  },
  stepperValue: {
    fontFamily: fonts.mono,
    fontSize: 15,
    color: colors.graphite,
  },
  saveButton: {
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontFamily: fonts.displayMedium,
    fontSize: 15,
    color: colors.white,
  },
});
