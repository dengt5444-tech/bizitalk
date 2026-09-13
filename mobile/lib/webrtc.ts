import { NativeModules } from "react-native";

// react-native-webrtc's native module isn't present in plain Expo Go (or
// any build that didn't compile it in) — importing the package at all
// throws immediately in that case ("WebRTC native module not found").
// Check for the native module first and only require() the package (and
// only from inside connectRealtimeVoice, never at module scope) once we
// know it's actually linked, mirroring the web app's own feature
// detection (RTCPeerConnection-in-window check) for the same reason: fall
// back to text mode instead of crashing.
export function isRealtimeVoiceSupported(): boolean {
  return NativeModules.WebRTCModule != null;
}

export type RealtimeCallbacks = {
  onUserSpeakingChange: (speaking: boolean) => void;
  onAssistantSpeakingChange: (speaking: boolean) => void;
  onAssistantTurn: (text: string, itemId?: string) => void;
  onUserTurn: (text: string, itemId?: string) => void;
  onConnectionUnstable: () => void;
};

export type RealtimeController = {
  sendText: (text: string) => void;
  setMuted: (muted: boolean) => void;
  disableFurtherInput: () => void;
  close: () => void;
};

interface RealtimeItemContentPart {
  type?: string;
  text?: string;
  transcript?: string;
}
interface RealtimeConversationItem {
  id?: string;
  role?: string;
  content?: RealtimeItemContentPart[];
}
interface RealtimeServerEvent {
  type: string;
  transcript?: string;
  item_id?: string;
  item?: RealtimeConversationItem;
  [key: string]: unknown;
}

function extractItemText(item: RealtimeConversationItem): string {
  for (const part of item.content ?? []) {
    if (typeof part.transcript === "string" && part.transcript.trim()) return part.transcript.trim();
    if (typeof part.text === "string" && part.text.trim()) return part.text.trim();
  }
  return "";
}

// Mirrors ConversationRoom.tsx's connectRealtime() on the web almost line
// for line — same ephemeral-token endpoint, same SDP POST to OpenAI, same
// data-channel event names — just using react-native-webrtc's API instead
// of the browser's. See that file for the fuller protocol writeup.
export async function connectRealtimeVoice(
  clientSecret: string,
  openingLine: string,
  callbacks: RealtimeCallbacks,
): Promise<RealtimeController> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- see file header
  const { RTCPeerConnection, RTCSessionDescription, mediaDevices } = require("react-native-webrtc");

  const pc = new RTCPeerConnection({});
  const micStream = await mediaDevices.getUserMedia({ audio: true });
  micStream.getTracks().forEach((track: { enabled: boolean }) => pc.addTrack(track, micStream));

  const dc = pc.createDataChannel("oai-events");

  dc.onmessage = (event: { data: string }) => {
    let msg: RealtimeServerEvent;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }

    switch (msg.type) {
      case "input_audio_buffer.speech_started":
        callbacks.onUserSpeakingChange(true);
        break;
      case "input_audio_buffer.speech_stopped":
        callbacks.onUserSpeakingChange(false);
        break;
      case "response.output_audio_transcript.delta":
      case "response.audio_transcript.delta":
        callbacks.onAssistantSpeakingChange(true);
        break;
      case "response.output_audio_transcript.done":
      case "response.audio_transcript.done":
        callbacks.onAssistantSpeakingChange(false);
        if (typeof msg.transcript === "string") {
          callbacks.onAssistantTurn(msg.transcript.trim(), msg.item_id);
        }
        break;
      case "conversation.item.input_audio_transcription.completed":
        if (typeof msg.transcript === "string") {
          callbacks.onUserTurn(msg.transcript.trim(), msg.item_id);
        }
        break;
      case "conversation.item.done":
        if (msg.item?.role === "assistant") {
          callbacks.onAssistantTurn(extractItemText(msg.item), msg.item?.id);
        }
        break;
      case "error":
        console.error("realtime session error", msg);
        break;
      default:
        break;
    }
  };

  dc.onopen = () => {
    try {
      dc.send(
        JSON.stringify({
          type: "response.create",
          response: {
            instructions: `Say this exact line out loud as your opening, naturally, with nothing added before or after it: "${openingLine}"`,
          },
        }),
      );
    } catch {
      // ignore
    }
  };

  pc.oniceconnectionstatechange = () => {
    if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
      callbacks.onConnectionUnstable();
    }
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    body: offer.sdp,
    headers: {
      Authorization: `Bearer ${clientSecret}`,
      "Content-Type": "application/sdp",
    },
  });

  if (!sdpRes.ok) {
    pc.close();
    micStream.getTracks().forEach((track: { stop: () => void }) => track.stop());
    throw new Error("sdp_exchange_failed");
  }

  const answerSdp = await sdpRes.text();
  await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: answerSdp }));

  let inputDisabled = false;

  return {
    sendText(text: string) {
      if (dc.readyState !== "open") throw new Error("data_channel_not_open");
      dc.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: { type: "message", role: "user", content: [{ type: "input_text", text }] },
        }),
      );
      dc.send(JSON.stringify({ type: "response.create" }));
    },
    setMuted(muted: boolean) {
      micStream.getTracks().forEach((track: { enabled: boolean }) => (track.enabled = !muted));
    },
    disableFurtherInput() {
      if (inputDisabled) return;
      inputDisabled = true;
      micStream.getTracks().forEach((track: { enabled: boolean }) => (track.enabled = false));
      try {
        dc.send(
          JSON.stringify({
            type: "session.update",
            session: { type: "realtime", audio: { input: { turn_detection: null } } },
          }),
        );
      } catch {
        // ignore — the UI already disables further input
      }
    },
    close() {
      try {
        dc.close();
      } catch {
        // connection may already be gone
      }
      try {
        micStream.getTracks().forEach((track: { stop: () => void }) => track.stop());
      } catch {
        // ignore
      }
      try {
        pc.close();
      } catch {
        // ignore
      }
    },
  };
}
