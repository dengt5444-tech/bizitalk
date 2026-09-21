import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus, type AudioSource } from "expo-audio";
import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { authedAudioSource } from "@/lib/api";
import { useTheme } from "@/theme/ThemeProvider";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function Player({ source }: { source: AudioSource }) {
  const theme = useTheme();
  const player = useAudioPlayer(source);
  const status = useAudioPlayerStatus(player);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Pressable
        onPress={() => (status.playing ? player.pause() : player.play())}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: theme.colors.signal,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={status.playing ? "pause" : "play"} color={theme.colors.paper} size={20} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <View
          style={{
            height: 4,
            borderRadius: 2,
            backgroundColor: theme.colors.line,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: "100%",
              width: `${status.duration ? Math.min(100, (status.currentTime / status.duration) * 100) : 0}%`,
              backgroundColor: theme.colors.signal,
            }}
          />
        </View>
        <Text size={11} color="inkFaint" style={{ marginTop: 4 }}>
          {formatTime(status.currentTime)} / {formatTime(status.duration)}
        </Text>
      </View>
    </View>
  );
}

export function AudioPlayer({ materialId }: { materialId: string }) {
  const [source, setSource] = useState<AudioSource | null>(null);

  useEffect(() => {
    let cancelled = false;
    authedAudioSource(`/api/materials/${materialId}/audio`).then((src) => {
      if (!cancelled) setSource(src);
    });
    return () => {
      cancelled = true;
    };
  }, [materialId]);

  if (!source) {
    return (
      <Text size={13} color="inkFaint">
        音声を読み込み中...
      </Text>
    );
  }

  return <Player source={source} />;
}
