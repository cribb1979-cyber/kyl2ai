import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { addFridgeEntry, findOrCreateItem } from "../db/queries/fridge";
import { rescheduleExpiryNotifications } from "../services/notifications";
import { recognizeReceipt, recognizeShelfPhoto, type RecognizedItem } from "../services/ai/visionAI";
import { colors, fonts, radius, spacing } from "../constants/theme";

const MODES = [
  { key: "shelf", label: "Kylskåp/hylla", helper: "Fota en hylla — AI känner igen varorna på den." },
  { key: "receipt", label: "Kvitto", helper: "Fota kvittot — AI läser ut vad du köpt." },
] as const;

type Mode = (typeof MODES)[number]["key"];

export default function ScanScreen() {
  const [mode, setMode] = useState<Mode>("shelf");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RecognizedItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  async function pickImage(fromCamera: boolean) {
    try {
      const permission = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Behörighet saknas", "Ge appen tillgång i Inställningar för att fortsätta.");
        return;
      }

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
      if (result.canceled || !result.assets?.[0]) return;

      const uri = result.assets[0].uri;
      setImageUri(uri);
      setResults([]);
      setSelected(new Set());
      setError(null);
      await runRecognition(uri);
    } catch (err) {
      console.warn("[scan] image picker failed", err);
      Alert.alert("Något gick fel", "Kunde inte öppna kameran/bildbiblioteket. Försök igen.");
    }
  }

  async function runRecognition(uri: string) {
    setLoading(true);
    setError(null);
    try {
      const items = mode === "receipt" ? await recognizeReceipt(uri) : await recognizeShelfPhoto(uri);
      setResults(items);
      setSelected(new Set(items.map((_, i) => i)));
      if (items.length === 0) {
        setError("Kunde inte hitta några varor i bilden. Prova en tydligare bild.");
      }
    } catch (err) {
      setError(
        "Kunde inte tolka bilden. Kontrollera din AI-nyckel i Inställningar eller försök igen senare."
      );
      console.warn("[scan] recognition failed", err);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelected(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function handleAddSelected() {
    setSaving(true);
    try {
      for (const index of selected) {
        const recognized = results[index];
        const item = await findOrCreateItem({
          name: recognized.name,
          category: recognized.category || "Övrigt",
          defaultShelfLifeDays: 7,
        });
        await addFridgeEntry({
          itemId: item.id,
          quantity: recognized.estimatedQuantity || 1,
          location: "fridge",
          shelfLifeDays: item.default_shelf_life_days,
        });
      }
      await rescheduleExpiryNotifications();
      router.back();
    } catch (err) {
      Alert.alert("Kunde inte spara", "Något gick fel när varorna skulle läggas till.");
      console.warn("[scan] failed to add items", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.pillRow}>
        {MODES.map((m) => (
          <Pressable
            key={m.key}
            style={[styles.pill, mode === m.key && styles.pillActive]}
            onPress={() => {
              setMode(m.key);
              setResults([]);
              setSelected(new Set());
              setImageUri(null);
              setError(null);
            }}
          >
            <Text style={[styles.pillText, mode === m.key && styles.pillTextActive]}>{m.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.helper}>{MODES.find((m) => m.key === mode)?.helper}</Text>

      <View style={styles.actionRow}>
        <Pressable style={styles.actionButton} onPress={() => pickImage(true)}>
          <Ionicons name="camera" size={20} color={colors.white} />
          <Text style={styles.actionButtonText}>Ta foto</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, styles.actionButtonSecondary]} onPress={() => pickImage(false)}>
          <Ionicons name="image" size={20} color={colors.graphite} />
          <Text style={styles.actionButtonTextSecondary}>Välj bild</Text>
        </Pressable>
      </View>

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.teal} />
          <Text style={styles.loadingText}>Analyserar bilden…</Text>
        </View>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}

      {results.length > 0 && (
        <View style={styles.resultsCard}>
          <Text style={styles.resultsTitle}>Hittade varor</Text>
          {results.map((item, index) => (
            <Pressable key={index} style={styles.resultRow} onPress={() => toggleSelected(index)}>
              <View style={[styles.checkbox, selected.has(index) && styles.checkboxChecked]}>
                {selected.has(index) && <Ionicons name="checkmark" size={14} color={colors.white} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultName}>{item.name}</Text>
                <Text style={styles.resultMeta}>
                  {item.category} · {item.estimatedQuantity} st
                </Text>
              </View>
            </Pressable>
          ))}

          <Pressable
            style={[styles.saveButton, (selected.size === 0 || saving) && styles.saveButtonDisabled]}
            onPress={handleAddSelected}
            disabled={selected.size === 0 || saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? "Lägger till…" : `Lägg till ${selected.size} vara${selected.size === 1 ? "" : "r"}`}
            </Text>
          </Pressable>
        </View>
      )}
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
    paddingBottom: spacing.xxl,
  },
  pillRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
    fontSize: 14,
    color: colors.graphiteMuted,
  },
  pillTextActive: {
    color: colors.graphite,
  },
  helper: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.graphiteMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  actionButtonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  actionButtonText: {
    fontFamily: fonts.displayMedium,
    fontSize: 14,
    color: colors.white,
  },
  actionButtonTextSecondary: {
    fontFamily: fonts.displayMedium,
    fontSize: 14,
    color: colors.graphite,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.graphiteMuted,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.coral,
    marginTop: spacing.lg,
  },
  resultsCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
  },
  resultsTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.graphiteMuted,
    marginBottom: spacing.sm,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
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
  resultName: {
    fontFamily: fonts.displayMedium,
    fontSize: 15,
    color: colors.graphite,
  },
  resultMeta: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.graphiteMuted,
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.md,
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
