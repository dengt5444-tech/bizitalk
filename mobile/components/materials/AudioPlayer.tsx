import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus, type AudioSource } from "expo-audio";
import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { authedAudioSource } from "@/lib/api";
import { useTheme } from "@/theme/ThemeProvider";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function Player({ source, onLoadError }: { source: AudioSource; onLoadError: (message: string) => void }) {
  const theme = useTheme();
  const player = useAudioPlayer(source);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (status.error) onLoadError(status.error);
  }, [status.error, onLoadError]);

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

const LOAD_TIMEOUT_MS = 15_000;

export function AudioPlayer({ materialId }: { materialId: string }) {
  const [source, setSource] = useState<AudioSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(() => {
      if (!cancelled) setError("音声の読み込みに時間がかかりすぎています。通信環境をご確認ください。");
    }, LOAD_TIMEOUT_MS);

    authedAudioSource(`/api/materials/${materialId}/audio`)
      .then((src) => {
        if (cancelled) return;
        clearTimeout(timer);
        setSource(src);
      })
      .catch((err) => {
        if (cancelled) return;
        clearTimeout(timer);
        setError(err instanceof Error ? err.message : "音声を読み込めませんでした。");
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [materialId, attempt]);

  if (error) {
    return (
      <View style={{ gap: 8 }}>
        <Text size={13} color="rose">
          {error}
        </Text>
        <Button label="再読み込み" variant="secondary" onPress={() => setAttempt((a) => a + 1)} />
      </View>
    );
  }

  if (!source) {
    return (
      <Text size={13} color="inkFaint">
        音声を読み込み中...
      </Text>
    );
  }

  return <Player source={source} onLoadError={setError} />;
}
