import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { fonts, useColors, type ThemeColors } from "@/theme";

type Variant = "display" | "title" | "heading" | "body" | "small" | "caption" | "eyebrow";
type Tone = keyof Pick<
  ThemeColors,
  "ink" | "inkSoft" | "inkFaint" | "signal" | "signalDim" | "rose" | "amberDim" | "mintDim" | "violetDim" | "onSignal"
>;

const VARIANTS: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.display, fontSize: 30, lineHeight: 40, fontWeight: "600" },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 32, fontWeight: "600" },
  heading: { fontFamily: fonts.display, fontSize: 17, lineHeight: 24, fontWeight: "600" },
  body: { fontSize: 15, lineHeight: 23 },
  small: { fontSize: 13, lineHeight: 20 },
  caption: { fontSize: 11.5, lineHeight: 16 },
  eyebrow: { fontSize: 11, lineHeight: 14, fontWeight: "600", letterSpacing: 2, textTransform: "uppercase" },
};

const DEFAULT_TONE: Record<Variant, Tone> = {
  display: "ink",
  title: "ink",
  heading: "ink",
  body: "inkSoft",
  small: "inkSoft",
  caption: "inkFaint",
  eyebrow: "signal",
};

export function Text({
  variant = "body",
  tone,
  weight,
  center,
  style,
  ...props
}: TextProps & { variant?: Variant; tone?: Tone; weight?: TextStyle["fontWeight"]; center?: boolean }) {
  const colors = useColors();
  return (
    <RNText
      {...props}
      style={[
        VARIANTS[variant],
        { color: colors[tone ?? DEFAULT_TONE[variant]] },
        weight ? { fontWeight: weight } : null,
        center ? { textAlign: "center" } : null,
        style,
      ]}
    />
  );
}
