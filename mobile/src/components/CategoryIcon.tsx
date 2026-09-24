import { Briefcase, Crown, Globe, Handshake, Plane, Users } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import type { ScenarioCategory } from "@/lib/scenarios";

// Same per-category gradient pairs as the web app's CategoryIllustration.
const GRADIENTS: Record<ScenarioCategory, [string, string]> = {
  teammates: ["#3b82f6", "#1d4ed8"],
  international: ["#2dd4bf", "#0d9488"],
  clients: ["#a78bfa", "#7c3aed"],
  leadership: ["#f0ad5e", "#b45309"],
  interview: ["#818cf8", "#4f46e5"],
  workingHoliday: ["#ec4899", "#db2777"],
};

const ICONS = {
  teammates: Users,
  international: Globe,
  clients: Handshake,
  leadership: Crown,
  interview: Briefcase,
  workingHoliday: Plane,
} satisfies Record<ScenarioCategory, unknown>;

export function CategoryIcon({ category, size = 48 }: { category: ScenarioCategory; size?: number }) {
  const [from, to] = GRADIENTS[category];
  const Icon = ICONS[category];
  const id = `grad-${category}`;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Icon color="#ffffff" size={size * 0.46} strokeWidth={2.1} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
});
