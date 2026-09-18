import { Component, type ErrorInfo, type PropsWithChildren } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, spacing } from "../constants/theme";

type State = { error: Error | null; info: ErrorInfo | null };

/**
 * Without this, an uncaught render-time JS error terminates the whole app
 * in a release build (no redbox in production Hermes) — exactly the
 * "closes with no error screen" symptom this is meant to catch and surface.
 */
export class ErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ErrorBoundary] caught", error, info.componentStack);
    this.setState({ info });
  }

  render() {
    if (this.state.error) {
      return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Något gick fel</Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
          {!!this.state.info?.componentStack && (
            <Text style={styles.stack}>{this.state.info.componentStack}</Text>
          )}
          <Pressable
            style={styles.button}
            onPress={() => this.setState({ error: null, info: null })}
          >
            <Text style={styles.buttonText}>Försök igen</Text>
          </Pressable>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xxl,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.coral,
    marginBottom: spacing.sm,
  },
  message: {
    fontFamily: fonts.mono,
    fontSize: 14,
    color: colors.graphite,
    marginBottom: spacing.md,
  },
  stack: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.graphiteMuted,
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  buttonText: {
    fontFamily: fonts.displayMedium,
    fontSize: 15,
    color: colors.white,
  },
});
