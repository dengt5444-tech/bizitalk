import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Pause, Play, RotateCcw, RotateCw } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { Text } from "@/components/ui";
import { apiUrl } from "@/lib/api";
import { useColors } from "@/theme";

const RATES = [0.75, 1, 1.25] as const;

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Streams the same /api/materials/[id]/audio endpoint the web player uses
// (it redirects to a cached file on Supabase Storage, generating it once on
// first request).
export function AudioPlayer({ materialId }: { materialId: string }) {
  const colors = useColors();
  const player = useAudioPlayer({ uri: apiUrl(`/api/materials/${materialId}/audio`) }, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const [rate, setRate] = useState<(typeof RATES)[number]>(1);
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  const duration = status.duration || 0;
  const progress = duration > 0 ? Math.min(1, status.currentTime / duration) : 0;

  function toggle() {
    if (status.playing) {
      player.pause();
    } else {
      if (status.didJustFinish || (duration > 0 && status.currentTime >= duration - 0.2)) player.seekTo(0);
      player.play();
    }
  }

  function skip(delta: number) {
    player.seekTo(Math.max(0, Math.min(duration, status.currentTime + delta)));
  }

  function cycleRate() {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    setRate(next);
    player.setPlaybackRate(next);
  }

  return (
    <View style={{ gap: 12 }}>
      <Pressable
        onLayout={(e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width)}
        onPress={(e) => {
          if (barWidth > 0 && duration > 0) player.seekTo((e.nativeEvent.locationX / barWidth) * duration);
        }}
        accessibilityRole="adjustable"
        accessibilityLabel="再生位置"
        style={[styles.track, { backgroundColor: colors.paperDim }]}
      >
        <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: colors.signal }]} />
      </Pressable>
      <View style={styles.times}>
        <Text variant="caption">{formatTime(status.currentTime)}</Text>
        <Text variant="caption">{formatTime(duration)}</Text>
      </View>
      <View style={styles.controls}>
        <Pressable onPress={() => skip(-10)} accessibilityLabel="10秒戻る" hitSlop={8}>
          <RotateCcw size={24} color={colors.inkSoft} />
        </Pressable>
        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel={status.playing ? "一時停止" : "再生"}
          style={[styles.play, { backgroundColor: colors.signal }]}
        >
          {!status.isLoaded ? (
            <ActivityIndicator color={colors.onSignal} />
          ) : status.playing ? (
            <Pause size={26} color={colors.onSignal} fill={colors.onSignal} />
          ) : (
            <Play size={26} color={colors.onSignal} fill={colors.onSignal} style={{ marginLeft: 3 }} />
          )}
        </Pressable>
        <Pressable onPress={() => skip(10)} accessibilityLabel="10秒進む" hitSlop={8}>
          <RotateCw size={24} color={colors.inkSoft} />
        </Pressable>
        <Pressable
          onPress={cycleRate}
          accessibilityLabel={`再生速度 ${rate}倍`}
          style={[styles.rate, { borderColor: colors.line }]}
        >
          <Text variant="caption" tone="ink" weight="600">
            {rate}x
          </Text>
        </Pressable>
      </View>
      {!status.isLoaded && (
        <Text variant="caption" center>
          音声を準備しています...(初回は少し時間がかかることがあります)
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
  times: { flexDirection: "row", justifyContent: "space-between", marginTop: -6 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 28 },
  play: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  rate: { position: "absolute", right: 0, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
});
