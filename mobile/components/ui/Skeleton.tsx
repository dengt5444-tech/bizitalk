import React, { useEffect, useState } from "react";
import { Animated, View, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

export function Skeleton({ style }: { style?: ViewStyle }) {
  const theme = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { backgroundColor: theme.colors.paperDim, borderRadius: 8, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  const theme = useTheme();
  return (
    <View
      style={{
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.line,
        backgroundColor: theme.colors.surface,
        padding: theme.spacing(6),
        gap: 10,
      }}
    >
      <Skeleton style={{ height: 14, width: "60%" }} />
      <Skeleton style={{ height: 12, width: "90%" }} />
      <Skeleton style={{ height: 12, width: "75%" }} />
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}
