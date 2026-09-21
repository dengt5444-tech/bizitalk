import {
  useFonts as useNotoSansJPFonts,
  NotoSansJP_400Regular,
  NotoSansJP_500Medium,
  NotoSansJP_600SemiBold,
  NotoSansJP_700Bold,
  NotoSansJP_900Black,
} from "@expo-google-fonts/noto-sans-jp";
import {
  useFonts as useZenOldMinchoFonts,
  ZenOldMincho_400Regular,
  ZenOldMincho_500Medium,
  ZenOldMincho_600SemiBold,
  ZenOldMincho_700Bold,
  ZenOldMincho_900Black,
} from "@expo-google-fonts/zen-old-mincho";

// Font family names, mirroring the weight aliases used across the web app's
// Tailwind classes (font-normal/medium/semibold/bold/black).
export const sans = {
  regular: "NotoSansJP_400Regular",
  medium: "NotoSansJP_500Medium",
  semibold: "NotoSansJP_600SemiBold",
  bold: "NotoSansJP_700Bold",
  black: "NotoSansJP_900Black",
} as const;

export const display = {
  regular: "ZenOldMincho_400Regular",
  medium: "ZenOldMincho_500Medium",
  semibold: "ZenOldMincho_600SemiBold",
  bold: "ZenOldMincho_700Bold",
  black: "ZenOldMincho_900Black",
} as const;

export function useHarborFonts() {
  const [notoLoaded] = useNotoSansJPFonts({
    NotoSansJP_400Regular,
    NotoSansJP_500Medium,
    NotoSansJP_600SemiBold,
    NotoSansJP_700Bold,
    NotoSansJP_900Black,
  });
  const [zenLoaded] = useZenOldMinchoFonts({
    ZenOldMincho_400Regular,
    ZenOldMincho_500Medium,
    ZenOldMincho_600SemiBold,
    ZenOldMincho_700Bold,
    ZenOldMincho_900Black,
  });
  return notoLoaded && zenLoaded;
}
