import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, spacing } from "../constants/theme";

/**
 * A card with hairline borders and drafting-style corner marks — the
 * "blueprint" motif used sparingly across the app for emphasis.
 */
export function SchematicCard({
  children,
  onPress,
  showCorners = false,
  style,
}: PropsWithChildren<{
  onPress?: () => void;
  showCorners?: boolean;
  style?: StyleProp<ViewStyle>;
}>) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper style={[styles.card, style]} onPress={onPress}>
      {children}
      {showCorners && (
        <>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </>
      )}
    </Wrapper>
  );
}

const CORNER_SIZE = 10;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: colors.teal,
  },
  cornerTL: {
    top: -1,
    left: -1,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: radius.sm,
  },
  cornerBR: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: radius.sm,
  },
});
