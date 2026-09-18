import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { SchematicCard } from "../../components/SchematicCard";
import { colors, fonts, radius, spacing } from "../../constants/theme";
import { listExpiringSoon, listFridgeEntries } from "../../db/queries/fridge";
import { generateRecipes, type RecipeSuggestion } from "../../services/ai/recipeAI";

export default function RecipesScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<RecipeSuggestion[]>([]);
  const [ingredientCount, setIngredientCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      listFridgeEntries()
        .then((entries) => setIngredientCount(entries.length))
        .catch((err) => console.warn("[recipes] failed to load fridge entries", err));
    }, [])
  );

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const [all, expiring] = await Promise.all([listFridgeEntries(), listExpiringSoon()]);
      const suggestions = await generateRecipes({
        availableIngredients: all.map((e) => e.name),
        expiringItems: expiring.map((e) => e.name),
      });
      setRecipes(suggestions);
    } catch (err) {
      setError(
        "Kunde inte hämta recept. Kontrollera din AI-nyckel i Inställningar eller försök igen senare."
      );
      console.warn("[recipes] generation failed", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recept</Text>
        <Text style={styles.headerMono}>{ingredientCount} ingredienser hemma</Text>
      </View>

      <Pressable style={styles.generateButton} onPress={handleGenerate} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.generateButtonText}>Föreslå recept från det du har hemma</Text>
        )}
      </Pressable>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={recipes}
        keyExtractor={(item, index) => `${item.title}-${index}`}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <SchematicCard style={styles.card} showCorners>
            <Text style={styles.recipeTitle}>{item.title}</Text>
            {item.usesExpiringItems.length > 0 && (
              <Text style={styles.usesExpiring}>
                Använder: {item.usesExpiringItems.join(", ")}
              </Text>
            )}
            <Text style={styles.subheading}>Ingredienser</Text>
            {item.ingredients.map((ing, i) => (
              <Text key={i} style={styles.listLine}>
                · {ing}
              </Text>
            ))}
            <Text style={styles.subheading}>Gör så här</Text>
            {item.steps.map((step, i) => (
              <Text key={i} style={styles.listLine}>
                {i + 1}. {step}
              </Text>
            ))}
          </SchematicCard>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>
              Tryck på knappen ovan för att få receptförslag baserat på vad som finns hemma —
              och vad som snart går ut.
            </Text>
          ) : null
        }
      />
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
    marginTop: 2,
  },
  generateButton: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  generateButtonText: {
    fontFamily: fonts.displayMedium,
    fontSize: 15,
    color: colors.white,
  },
  error: {
    marginHorizontal: spacing.lg,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.coral,
    marginBottom: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  card: {
    marginBottom: spacing.md,
  },
  recipeTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.graphite,
  },
  usesExpiring: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.coral,
    marginTop: 4,
  },
  subheading: {
    fontFamily: fonts.displayMedium,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.graphiteMuted,
    marginTop: spacing.sm,
  },
  listLine: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.graphite,
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
