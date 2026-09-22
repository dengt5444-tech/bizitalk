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

// A flagged speech segment shorter than this is treated as noise, not a
// real (if brief) reply — see the speech_started/stopped handling below.
const MIN_SPEECH_DURATION_MS = 450;

// Without headphones, the AI's own voice playing through the speakers can
// leak back into the mic even with echoCancellation on, get transcribed,
// and look exactly like the learner said it — which then makes the AI
// reply to itself and the conversation appears to run on its own. A
// transcript that's essentially a fragment of what the AI just said is
// almost certainly this echo, not real speech, so it's filtered out below
// rather than trusted as a genuine user turn. Mirrors the web app's check
// in ConversationRoom.tsx.
function normalizeForEchoCheck(text: string) {
  return text
    .toLowerCase()
    .replace(/[.,!?;:"'’‘“”\-–—()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeSelfEcho(candidate: string, lastAssistantText: string) {
  const a = normalizeForEchoCheck(candidate);
  const b = normalizeForEchoCheck(lastAssistantText);
  if (!a || !b) return false;
  if (b.includes(a)) return true;
  const aWords = a.split(" ");
  const bWords = new Set(b.split(" "));
  const overlap = aWords.filter((w) => bWords.has(w)).length;
  return aWords.length >= 3 && overlap / aWords.length >= 0.75;
}

// Mirrors ConversationRoom.tsx's connectRealtime() on the web almost line
// for line — same ephemeral-token endpoint, same SDP POST to OpenAI, same
// data-channel event names and the same "don't let the learner interrupt
// mid-reply" mic-gating strategy, just using react-native-webrtc's API
// instead of the browser's. See that file for the fuller protocol writeup.
export async function connectRealtimeVoice(
  clientSecret: string,
  openingLine: string,
  callbacks: RealtimeCallbacks,
): Promise<RealtimeController> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- see file header
  const { RTCPeerConnection, RTCSessionDescription, mediaDevices } = require("react-native-webrtc");

  const pc = new RTCPeerConnection({});
  const micStream = await mediaDevices.getUserMedia({ audio: true });

  // The mic defaults to enabled the instant getUserMedia resolves — well
  // before dc.onopen fires and asks for the opening line. Locking it off
  // right here closes that startup window instead of leaving it open
  // until the first response-lifecycle event arrives.
  let assistantSpeaking = true;
  let userMuted = false;
  let inputDisabled = false;
  let lastAssistantText = "";
  let lastSpeechStartedAt: number | null = null;
  let lastSpeechDurationMs = 0;
  let speechOverlappedAssistant = false;
  let responseSafetyTimer: ReturnType<typeof setTimeout> | null = null;

  function syncMicEnabled() {
    const shouldBeEnabled = !userMuted && !inputDisabled && !assistantSpeaking;
    micStream.getTracks().forEach((track: { enabled: boolean }) => (track.enabled = shouldBeEnabled));
  }
  syncMicEnabled();

  micStream.getTracks().forEach((track: { enabled: boolean }) => pc.addTrack(track, micStream));

  const dc = pc.createDataChannel("oai-events");

  // Brackets the AI's whole reply (response.created → response.done), not
  // any single item within it — a response can stream its audio
  // transcript across more than one item, so gating on an item-level done
  // event can flip the mic back on in the brief gap between items while
  // the AI is still actively replying overall. The safety timeout is a
  // recovery path in case response.done never arrives for some reason.
  function beginAssistantResponse() {
    assistantSpeaking = true;
    callbacks.onAssistantSpeakingChange(true);
    syncMicEnabled();
    if (responseSafetyTimer) clearTimeout(responseSafetyTimer);
    responseSafetyTimer = setTimeout(() => {
      responseSafetyTimer = null;
      if (!assistantSpeaking) return;
      console.warn("realtime voice: response.done never arrived");
      endAssistantResponse();
    }, 20000);
  }

  function endAssistantResponse() {
    if (responseSafetyTimer) {
      clearTimeout(responseSafetyTimer);
      responseSafetyTimer = null;
    }
    assistantSpeaking = false;
    callbacks.onAssistantSpeakingChange(false);
    syncMicEnabled();
  }

  // Every place that asks the model for a reply goes through this instead
  // of sending response.create directly — disabling the mic on our own
  // intent to get a response, before the request even goes out, closes
  // the round-trip window to the server's own acknowledgment.
  function sendResponseCreate(extra?: Record<string, unknown>) {
    beginAssistantResponse();
    dc.send(JSON.stringify({ type: "response.create", ...extra }));
  }

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
        lastSpeechStartedAt = Date.now();
        speechOverlappedAssistant = assistantSpeaking;
        // No barge-in cancel here — the mic is already disabled for the
        // entire time the AI is speaking (see syncMicEnabled), so this
        // should never fire during a genuine AI turn in the first place.
        break;
      case "input_audio_buffer.speech_stopped":
        callbacks.onUserSpeakingChange(false);
        lastSpeechDurationMs = lastSpeechStartedAt ? Date.now() - lastSpeechStartedAt : 0;
        lastSpeechStartedAt = null;
        break;
      case "response.created":
        // The authoritative "AI is speaking" signal — brackets the whole
        // reply regardless of how many items/parts it streams across.
        beginAssistantResponse();
        break;
      case "response.output_audio_transcript.delta":
      case "response.audio_transcript.delta":
        // response.created already gates the mic; this is kept only as a
        // harmless, redundant nudge to the "AI speaking" UI indicator.
        callbacks.onAssistantSpeakingChange(true);
        break;
      case "response.output_audio_transcript.done":
      case "response.audio_transcript.done":
        // No longer touches the mic — see beginAssistantResponse/
        // endAssistantResponse (response.done below) for why.
        if (typeof msg.transcript === "string") {
          lastAssistantText = msg.transcript.trim();
          callbacks.onAssistantTurn(lastAssistantText, msg.item_id);
        }
        break;
      case "response.done":
        endAssistantResponse();
        break;
      case "conversation.item.input_audio_transcription.completed": {
        // Automatic response generation is turned off server-side
        // (realtime-token/route.ts) specifically so a noise blip or mic
        // echo can never make the AI speak on its own — the model only
        // ever replies to a transcript that passes the checks below, via
        // the explicit response.create calls here.
        const candidate = typeof msg.transcript === "string" ? msg.transcript.trim() : "";
        const isEcho = !!(lastAssistantText && looksLikeSelfEcho(candidate, lastAssistantText));
        const rejected =
          !candidate ||
          lastSpeechDurationMs < MIN_SPEECH_DURATION_MS ||
          isEcho ||
          speechOverlappedAssistant ||
          assistantSpeaking;

        if (rejected) {
          // The audio was still committed to the model's own conversation
          // history as an input item the instant speech_stopped fired,
          // before this rejection was even known — deleting it keeps the
          // model's view of the conversation clean.
          if (msg.item_id) {
            try {
              dc.send(JSON.stringify({ type: "conversation.item.delete", item_id: msg.item_id }));
            } catch {
              // ignore — worst case one stray item lingers in context
            }
          }
          break;
        }

        callbacks.onUserTurn(candidate, msg.item_id);
        try {
          sendResponseCreate();
        } catch {
          // ignore — the UI's own error state (if any) is driven elsewhere
        }
        break;
      }
      case "conversation.item.done":
        // Fallback in case the dedicated transcript-done event above isn't
        // recognized; item ids keep this from double-adding.
        if (msg.item?.role === "assistant") {
          lastAssistantText = extractItemText(msg.item);
          callbacks.onAssistantTurn(lastAssistantText, msg.item?.id);
        }
        break;
      case "error":
        console.error("realtime session error", msg);
        // An error can terminate the current response without a normal
        // response.done ever arriving — if that leaves assistantSpeaking
        // stuck true, the mic would stay disabled for the rest of the
        // session, so unconditionally recover here too.
        if (assistantSpeaking) endAssistantResponse();
        break;
      default:
        break;
    }
  };

  dc.onopen = () => {
    try {
      sendResponseCreate({
        response: {
          instructions: `Say this exact line out loud as your opening, naturally, with nothing added before or after it: "${openingLine}"`,
        },
      });
    } catch {
      // ignore
    }
  };

  pc.oniceconnectionstatechange = () => {
    // "disconnected" is often transient (a brief wifi<->cellular handoff)
    // and can recover on its own — only "failed" means the session is
    // truly unusable and callers should fall back to text mode.
    if (pc.iceConnectionState === "failed") {
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
    if (responseSafetyTimer) clearTimeout(responseSafetyTimer);
    pc.close();
    micStream.getTracks().forEach((track: { stop: () => void }) => track.stop());
    throw new Error("sdp_exchange_failed");
  }

  const answerSdp = await sdpRes.text();
  await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: answerSdp }));

  return {
    sendText(text: string) {
      if (dc.readyState !== "open") throw new Error("data_channel_not_open");
      dc.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: { type: "message", role: "user", content: [{ type: "input_text", text }] },
        }),
      );
      sendResponseCreate();
    },
    setMuted(muted: boolean) {
      userMuted = muted;
      syncMicEnabled();
    },
    disableFurtherInput() {
      if (inputDisabled) return;
      inputDisabled = true;
      syncMicEnabled();
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
      if (responseSafetyTimer) {
        clearTimeout(responseSafetyTimer);
        responseSafetyTimer = null;
      }
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
