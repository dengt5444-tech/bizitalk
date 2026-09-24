import { Image } from "expo-image";
import type { StyleProp, ImageStyle } from "react-native";
import { SCENE_IMAGES, type SceneKey } from "@/lib/scenes";

export function SceneImage({ scene, style }: { scene: SceneKey; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={SCENE_IMAGES[scene]}
      style={[{ width: "100%", height: 130 }, style]}
      contentFit="cover"
      accessibilityIgnoresInvertColors
      transition={150}
    />
  );
}
