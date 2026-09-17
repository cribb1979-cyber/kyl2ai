import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from "@expo-google-fonts/jetbrains-mono";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { IntroAnimation } from "../components/IntroAnimation";
import { colors } from "../constants/theme";
import { getDb } from "../db/client";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "SpaceGrotesk-Bold": SpaceGrotesk_700Bold,
    "SpaceGrotesk-Medium": SpaceGrotesk_500Medium,
    "SpaceGrotesk-Regular": SpaceGrotesk_400Regular,
    "JetBrainsMono-Regular": JetBrainsMono_400Regular,
    "JetBrainsMono-Medium": JetBrainsMono_500Medium,
  });
  const [dbReady, setDbReady] = useState(false);
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    getDb()
      .then(() => setDbReady(true))
      .catch((error) => {
        console.error("[db] init failed", error);
        setDbReady(true);
      });
  }, []);

  const ready = fontsLoaded && dbReady;

  const onLayoutRootView = useCallback(async () => {
    if (ready) {
      await SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.flex} onLayout={onLayoutRootView}>
      <View style={styles.flex}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="item/[id]"
            options={{ headerShown: true, title: "Vara", presentation: "modal" }}
          />
          <Stack.Screen name="stores/index" options={{ headerShown: true, title: "Butiker" }} />
          <Stack.Screen
            name="stores/[id]/edit"
            options={{ headerShown: true, title: "Avdelningsordning" }}
          />
          <Stack.Screen
            name="scan"
            options={{ headerShown: true, title: "Skanna", presentation: "modal" }}
          />
        </Stack>
        {!introDone && <IntroAnimation onFinish={() => setIntroDone(true)} />}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
