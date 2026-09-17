import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { colors, fonts } from "../constants/theme";

const DOOR_OPEN_DEG = -108;
const FOOD_DOTS = [
  { top: "22%", left: "20%", color: colors.teal },
  { top: "22%", left: "62%", color: colors.coral },
  { top: "22%", left: "40%", color: colors.amber },
  { top: "48%", left: "30%", color: colors.amber },
  { top: "48%", left: "70%", color: colors.teal },
  { top: "72%", left: "24%", color: colors.coral },
  { top: "72%", left: "55%", color: colors.teal },
] as const;

export function IntroAnimation({ onFinish }: { onFinish: () => void }) {
  const doorRotation = useSharedValue(0);
  const interiorOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(16);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    interiorOpacity.value = withDelay(150, withTiming(1, { duration: 500 }));
    doorRotation.value = withDelay(
      450,
      withTiming(DOOR_OPEN_DEG, { duration: 750, easing: Easing.out(Easing.cubic) })
    );
    titleOpacity.value = withDelay(950, withTiming(1, { duration: 450 }));
    titleTranslateY.value = withDelay(950, withTiming(0, { duration: 450, easing: Easing.out(Easing.quad) }));

    containerOpacity.value = withDelay(
      1900,
      withSequence(
        withTiming(0, { duration: 350 }, (finished) => {
          if (finished) runOnJS(onFinish)();
        })
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doorStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { translateX: -70 },
      { rotateY: `${doorRotation.value}deg` },
      { translateX: 70 },
    ],
  }));

  const interiorStyle = useAnimatedStyle(() => ({ opacity: interiorOpacity.value }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({ opacity: containerOpacity.value }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <View style={styles.cabinet}>
        <Animated.View style={[styles.interior, interiorStyle]}>
          <View style={styles.shelfLine} />
          <View style={[styles.shelfLine, { top: "60%" }]} />
          {FOOD_DOTS.map((dot, i) => (
            <View
              key={i}
              style={[styles.foodDot, { top: dot.top, left: dot.left, backgroundColor: dot.color }]}
            />
          ))}
        </Animated.View>

        <Animated.View style={[styles.door, doorStyle]}>
          <View style={styles.doorHandle} />
          <View style={styles.cornerMark} />
        </Animated.View>
      </View>

      <Animated.View style={titleStyle}>
        <Text style={styles.title}>KYL2AI</Text>
        <Text style={styles.subtitle}>skafferiet, digitaliserat</Text>
      </Animated.View>
    </Animated.View>
  );
}

const CABINET_SIZE = 220;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  cabinet: {
    width: CABINET_SIZE,
    height: CABINET_SIZE * 1.3,
    marginBottom: 32,
  },
  interior: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.tealMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: "hidden",
  },
  shelfLine: {
    position: "absolute",
    top: "32%",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.hairline,
  },
  foodDot: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  door: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.graphite,
    borderRadius: 12,
    justifyContent: "center",
  },
  doorHandle: {
    position: "absolute",
    right: 14,
    top: "40%",
    width: 6,
    height: "20%",
    borderRadius: 3,
    backgroundColor: colors.teal,
  },
  cornerMark: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 14,
    height: 14,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: colors.teal,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    letterSpacing: 2,
    color: colors.graphite,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.graphiteMuted,
    textAlign: "center",
    marginTop: 4,
  },
});
