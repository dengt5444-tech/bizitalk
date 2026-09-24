import { forwardRef, useImperativeHandle, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { API_BASE_URL } from "@/lib/env";
import { REALTIME_BRIDGE_HTML } from "./bridgeHtml";

export type BridgeCommand =
  | { type: "start"; openingLine: string }
  | { type: "answer"; sdp: string }
  | { type: "setMuted"; muted: boolean }
  | { type: "sendText"; text: string }
  | { type: "disableTurnDetection" }
  | { type: "stop" };

export type BridgeEvent =
  | { type: "ready" }
  | { type: "offer"; sdp: string }
  | { type: "micError"; message: string }
  | { type: "connected" }
  | { type: "turn"; role: "user" | "assistant"; text: string; itemId: string | null }
  | { type: "assistantSpeaking"; value: boolean }
  | { type: "userSpeaking"; value: boolean }
  | { type: "iceUnstable"; state: string }
  | { type: "error"; message: string }
  | { type: "log"; message: string; data: unknown };

export type RealtimeVoiceBridgeHandle = { send: (command: BridgeCommand) => void };

// An invisible WebView hosting the WebRTC side of the voice call (see
// bridgeHtml.ts). Loaded with the web app's own https origin as its base
// URL so WebKit treats the page as a secure context (required for the
// microphone); it makes no network requests of its own besides WebRTC.
export const RealtimeVoiceBridge = forwardRef<RealtimeVoiceBridgeHandle, { onEvent: (event: BridgeEvent) => void }>(
  function RealtimeVoiceBridge({ onEvent }, ref) {
    const webViewRef = useRef<WebView>(null);

    useImperativeHandle(ref, () => ({
      send(command) {
        webViewRef.current?.injectJavaScript(
          `window.__bridge && window.__bridge.receive(${JSON.stringify(command)}); true;`,
        );
      },
    }));

    function handleMessage(event: WebViewMessageEvent) {
      try {
        onEvent(JSON.parse(event.nativeEvent.data) as BridgeEvent);
      } catch {
        // ignore malformed messages
      }
    }

    return (
      <View style={styles.hidden} pointerEvents="none" importantForAccessibility="no-hide-descendants">
        <WebView
          ref={webViewRef}
          source={{ html: REALTIME_BRIDGE_HTML, baseUrl: API_BASE_URL.startsWith("https://") ? API_BASE_URL : "https://localhost" }}
          originWhitelist={["*"]}
          onMessage={handleMessage}
          javaScriptEnabled
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          mediaCapturePermissionGrantType="grant"
          webviewDebuggingEnabled={__DEV__}
          style={styles.webview}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  // Kept in the view hierarchy (a detached/zero-size WebView can be
  // suspended by the OS) but invisible and non-interactive.
  hidden: { position: "absolute", width: 2, height: 2, opacity: 0, left: -10, top: -10 },
  webview: { width: 2, height: 2, backgroundColor: "transparent" },
});
