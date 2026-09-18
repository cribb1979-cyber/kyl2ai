import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SchematicCard } from "../../components/SchematicCard";
import { colors, fonts, radius, spacing } from "../../constants/theme";
import {
  clearApiKey,
  getApiKey,
  getSavedProvider,
  saveApiKey,
  type AiProvider,
} from "../../services/ai/keyStore";
import { requestNotificationPermission } from "../../services/notifications";

const PROVIDERS: { key: AiProvider; label: string }[] = [
  { key: "anthropic", label: "Anthropic (Claude)" },
  { key: "openai", label: "OpenAI (GPT)" },
];

export default function SettingsScreen() {
  const [provider, setProvider] = useState<AiProvider>("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [hasSavedKey, setHasSavedKey] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [savedKey, savedProvider] = await Promise.all([getApiKey(), getSavedProvider()]);
        if (savedKey) {
          setApiKey(savedKey);
          setHasSavedKey(true);
        }
        if (savedProvider) setProvider(savedProvider);
      } catch (error) {
        console.warn("[settings] failed to load saved key", error);
      }
    })();
  }, []);

  async function handleSave() {
    if (!apiKey.trim()) return;
    try {
      await saveApiKey(provider, apiKey.trim());
      setHasSavedKey(true);
      Alert.alert("Sparat", "Din API-nyckel är sparad säkert på enheten.");
    } catch (error) {
      console.warn("[settings] failed to save key", error);
      Alert.alert("Kunde inte spara", "Något gick fel när nyckeln skulle sparas.");
    }
  }

  async function handleClear() {
    try {
      await clearApiKey();
      setApiKey("");
      setHasSavedKey(false);
    } catch (error) {
      console.warn("[settings] failed to clear key", error);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>Inställningar</Text>

      <Text style={styles.sectionLabel}>AI-läge</Text>
      <SchematicCard style={styles.card}>
        <Text style={styles.body}>
          {hasSavedKey
            ? "Eget läge: recept och bildigenkänning använder din egen nyckel, direkt mot leverantören."
            : "Standardläge: recept och bildigenkänning går via vår gemensamma backend, ingen egen nyckel behövs."}
        </Text>

        <Text style={styles.label}>Leverantör</Text>
        <View style={styles.pillRow}>
          {PROVIDERS.map((p) => (
            <Pressable
              key={p.key}
              style={[styles.pill, provider === p.key && styles.pillActive]}
              onPress={() => setProvider(p.key)}
            >
              <Text style={[styles.pillText, provider === p.key && styles.pillTextActive]}>
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>API-nyckel</Text>
        <TextInput
          style={styles.input}
          value={apiKey}
          onChangeText={setApiKey}
          placeholder="sk-…"
          placeholderTextColor={colors.graphiteMuted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.hint}>
          Nyckeln lagras krypterat på enheten (Keychain/Keystore) och skickas endast direkt till
          leverantörens API.
        </Text>

        <View style={styles.row}>
          <Pressable style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Spara nyckel</Text>
          </Pressable>
          {hasSavedKey && (
            <Pressable style={styles.clearButton} onPress={handleClear}>
              <Text style={styles.clearButtonText}>Ta bort</Text>
            </Pressable>
          )}
        </View>
      </SchematicCard>

      <Text style={styles.sectionLabel}>Butiker</Text>
      <SchematicCard onPress={() => router.push("/stores")} style={styles.card}>
        <View style={styles.linkRow}>
          <Text style={styles.body}>Hantera butiker och avdelningsordning</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.graphiteMuted} />
        </View>
      </SchematicCard>

      <Text style={styles.sectionLabel}>Notiser</Text>
      <SchematicCard
        onPress={() => requestNotificationPermission().catch((error) => console.warn("[settings] notif permission failed", error))}
        style={styles.card}
      >
        <View style={styles.linkRow}>
          <Text style={styles.body}>Aktivera hållbarhetspåminnelser</Text>
          <Ionicons name="notifications" size={18} color={colors.teal} />
        </View>
      </SchematicCard>
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
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.graphite,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontFamily: fonts.displayMedium,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.graphiteMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  card: {
    marginBottom: spacing.sm,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.graphite,
    lineHeight: 20,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.graphiteMuted,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  pillRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
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
  input: {
    fontFamily: fonts.mono,
    fontSize: 14,
    color: colors.graphite,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.graphiteMuted,
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.teal,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  saveButtonText: {
    fontFamily: fonts.displayMedium,
    fontSize: 14,
    color: colors.white,
  },
  clearButton: {
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.coral,
  },
  clearButtonText: {
    fontFamily: fonts.displayMedium,
    fontSize: 14,
    color: colors.coral,
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
