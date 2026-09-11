import OpenAI from "openai";

export function createOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
}

// Used for the turn-based text-mode fallback's TTS voice (when the browser
// doesn't support the Realtime API).
export const TTS_MODEL = "tts-1-hd";

// Used for the AI conversation partner's replies in the turn-based
// text-mode fallback.
export const CHAT_MODEL = "gpt-4o-mini";

// Speech-to-speech model behind the primary, real-time voice conversation
// mode (WebRTC). See src/app/api/conversation/sessions/[id]/realtime-token.
export const REALTIME_MODEL = "gpt-realtime";

// End-of-session feedback is a single call per conversation, not a
// per-turn cost, so it's worth spending on a stronger model for accuracy.
export const FEEDBACK_MODEL = "gpt-4o";
