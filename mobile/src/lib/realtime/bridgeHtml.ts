// The HTML page loaded (invisibly) into a WebView to run the realtime voice
// call. iOS's WebKit has a mature, built-in WebRTC stack (the same one the
// web app already runs on in Safari), so the app reuses it instead of
// depending on a third-party native WebRTC module — that native module was
// what kept the previous app from building. Everything below is a direct
// port of the web app's ConversationRoom.tsx connectRealtime() logic,
// including all of its hard-won protections against the AI replying to
// noise or its own echo.
//
// Division of labor with the React Native side (useRealtimeVoice.ts):
// - RN fetches the ephemeral token and performs the SDP exchange with
//   OpenAI over native fetch (so the token never enters the page and no
//   CORS rules apply), and owns all UI and transcript bookkeeping.
// - This page owns the microphone, the peer connection, the data channel
//   and audio playback, and reports validated turns back to RN.
//
// RN -> page: window.__bridge.receive({ type, ... })
//   start { openingLine } | answer { sdp } | setMuted { muted }
//   sendText { text } | disableTurnDetection | stop
// Page -> RN: window.ReactNativeWebView.postMessage(JSON)
//   ready | offer { sdp } | micError { message } | connected
//   turn { role, text, itemId } | assistantSpeaking { value }
//   userSpeaking { value } | iceUnstable { state } | log { message, data }

export const REALTIME_BRIDGE_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
<audio id="remote" autoplay playsinline></audio>
<script>
(function () {
  var MIN_SPEECH_DURATION_MS = 450;
  var RESPONSE_SAFETY_TIMEOUT_MS = 20000;

  var pc = null;
  var dc = null;
  var micStream = null;
  var micMuted = false;
  var assistantSpeaking = false;
  var lastSpeechStartedAt = null;
  var lastSpeechDurationMs = 0;
  var speechOverlappedAssistant = false;
  var responseSafetyTimer = null;
  var lastAssistantText = "";
  var openingLine = "";
  var processedIds = {};

  function post(msg) {
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    } catch (e) {}
  }

  function log(message, data) {
    post({ type: "log", message: message, data: data || null });
  }

  function normalizeForEchoCheck(text) {
    return text
      .toLowerCase()
      .replace(/[.,!?;:"'\\u2019\\u2018\\u201c\\u201d\\-\\u2013\\u2014()]/g, "")
      .replace(/\\s+/g, " ")
      .trim();
  }

  // A transcript that is essentially a fragment of what the AI just said is
  // almost certainly its own voice leaking back into the mic.
  function looksLikeSelfEcho(candidate, lastText) {
    var a = normalizeForEchoCheck(candidate);
    var b = normalizeForEchoCheck(lastText);
    if (!a || !b) return false;
    if (b.indexOf(a) !== -1) return true;
    var aWords = a.split(" ");
    var bWords = {};
    b.split(" ").forEach(function (w) { bWords[w] = true; });
    var overlap = aWords.filter(function (w) { return bWords[w]; }).length;
    return aWords.length >= 3 && overlap / aWords.length >= 0.75;
  }

  function extractItemText(item) {
    var parts = (item && item.content) || [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (typeof p.transcript === "string" && p.transcript.trim()) return p.transcript.trim();
      if (typeof p.text === "string" && p.text.trim()) return p.text.trim();
    }
    return "";
  }

  // The mic track is disabled for the whole time the AI is speaking (and
  // whenever the learner has muted it), so the AI's own voice can't be
  // picked up and mistaken for the learner.
  function syncMicEnabled() {
    if (!micStream) return;
    var enabled = !micMuted && !assistantSpeaking;
    micStream.getTracks().forEach(function (t) { t.enabled = enabled; });
  }

  function setAssistantSpeaking(value) {
    assistantSpeaking = value;
    post({ type: "assistantSpeaking", value: value });
    syncMicEnabled();
  }

  // Brackets the AI's whole reply (response.created -> response.done); the
  // timer recovers the mic if response.done never arrives.
  function beginAssistantResponse() {
    setAssistantSpeaking(true);
    if (responseSafetyTimer) clearTimeout(responseSafetyTimer);
    responseSafetyTimer = setTimeout(function () {
      responseSafetyTimer = null;
      if (!assistantSpeaking) return;
      log("response.done never arrived");
      endAssistantResponse();
    }, RESPONSE_SAFETY_TIMEOUT_MS);
  }

  function endAssistantResponse() {
    if (responseSafetyTimer) {
      clearTimeout(responseSafetyTimer);
      responseSafetyTimer = null;
    }
    setAssistantSpeaking(false);
  }

  // Disable the mic on our own intent to get a reply, before the request
  // even goes out, so the round trip to the server's ack is never an
  // unprotected window.
  function sendResponseCreate(extra) {
    beginAssistantResponse();
    var payload = { type: "response.create" };
    if (extra) for (var k in extra) payload[k] = extra[k];
    dc.send(JSON.stringify(payload));
  }

  function emitTurn(role, text, itemId) {
    if (!text) return;
    if (itemId) {
      if (processedIds[itemId]) return;
      processedIds[itemId] = true;
    }
    if (role === "assistant") lastAssistantText = text;
    post({ type: "turn", role: role, text: text, itemId: itemId || null });
  }

  function handleServerEvent(msg) {
    switch (msg.type) {
      case "input_audio_buffer.speech_started":
        post({ type: "userSpeaking", value: true });
        lastSpeechStartedAt = Date.now();
        speechOverlappedAssistant = assistantSpeaking;
        break;
      case "input_audio_buffer.speech_stopped":
        post({ type: "userSpeaking", value: false });
        lastSpeechDurationMs = lastSpeechStartedAt ? Date.now() - lastSpeechStartedAt : 0;
        lastSpeechStartedAt = null;
        break;
      case "response.created":
        beginAssistantResponse();
        break;
      case "response.output_audio_transcript.done":
      case "response.audio_transcript.done":
        if (typeof msg.transcript === "string") emitTurn("assistant", msg.transcript.trim(), msg.item_id);
        break;
      case "response.done":
        endAssistantResponse();
        break;
      case "conversation.item.input_audio_transcription.completed": {
        // The server never replies on its own (create_response: false), so
        // nothing makes the AI speak except a transcript that passes these
        // checks.
        var candidate = typeof msg.transcript === "string" ? msg.transcript.trim() : "";
        var isEcho = !!(lastAssistantText && looksLikeSelfEcho(candidate, lastAssistantText));
        var rejectReason = !candidate
          ? "empty"
          : lastSpeechDurationMs < MIN_SPEECH_DURATION_MS
            ? "too_short"
            : isEcho
              ? "self_echo"
              : speechOverlappedAssistant
                ? "overlapped_assistant_start"
                : assistantSpeaking
                  ? "assistant_still_speaking"
                  : null;

        if (rejectReason) {
          log("rejected transcript", { reason: rejectReason, durationMs: lastSpeechDurationMs });
          // Keep the rejected noise/echo out of the model's own context.
          if (msg.item_id) {
            try {
              dc.send(JSON.stringify({ type: "conversation.item.delete", item_id: msg.item_id }));
            } catch (e) {}
          }
          break;
        }

        emitTurn("user", candidate, msg.item_id);
        try {
          sendResponseCreate();
        } catch (e) {
          post({ type: "error", message: "send_failed" });
        }
        break;
      }
      case "conversation.item.done":
        if (msg.item && msg.item.role === "assistant") {
          emitTurn("assistant", extractItemText(msg.item), msg.item.id);
        }
        break;
      case "error":
        log("server error event", msg);
        if (assistantSpeaking) endAssistantResponse();
        break;
      default:
        break;
    }
  }

  async function start(options) {
    openingLine = options.openingLine || "";
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (e) {
      post({ type: "micError", message: String((e && e.name) || e) });
      return;
    }

    pc = new RTCPeerConnection();
    pc.ontrack = function (event) {
      var audio = document.getElementById("remote");
      audio.srcObject = event.streams[0];
      var p = audio.play();
      if (p && p.catch) p.catch(function () {});
    };

    // Lock the mic off immediately — before the opening line is even
    // requested — so the startup window is never unprotected.
    assistantSpeaking = true;
    syncMicEnabled();
    micStream.getTracks().forEach(function (t) { pc.addTrack(t, micStream); });

    dc = pc.createDataChannel("oai-events");
    dc.onmessage = function (event) {
      var msg;
      try { msg = JSON.parse(event.data); } catch (e) { return; }
      handleServerEvent(msg);
    };
    dc.onopen = function () {
      post({ type: "connected" });
      try {
        sendResponseCreate({
          response: {
            instructions:
              'Say this exact line out loud as your opening, naturally, with nothing added before or after it: "' +
              openingLine + '"',
          },
        });
      } catch (e) {}
    };

    pc.oniceconnectionstatechange = function () {
      var state = pc.iceConnectionState;
      if (state === "failed" || state === "disconnected") post({ type: "iceUnstable", state: state });
    };

    var offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    post({ type: "offer", sdp: offer.sdp });
  }

  function stop() {
    if (responseSafetyTimer) clearTimeout(responseSafetyTimer);
    responseSafetyTimer = null;
    try { dc && dc.close(); } catch (e) {}
    try { micStream && micStream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    try { pc && pc.close(); } catch (e) {}
    dc = null;
    pc = null;
    micStream = null;
  }

  window.__bridge = {
    receive: function (msg) {
      switch (msg.type) {
        case "start":
          start(msg).catch(function (e) { post({ type: "error", message: String(e) }); });
          break;
        case "answer":
          if (pc) {
            pc.setRemoteDescription({ type: "answer", sdp: msg.sdp }).catch(function (e) {
              post({ type: "error", message: "set_remote_failed: " + String(e) });
            });
          }
          break;
        case "setMuted":
          micMuted = !!msg.muted;
          syncMicEnabled();
          break;
        case "sendText":
          if (!dc || dc.readyState !== "open" || assistantSpeaking) break;
          try {
            dc.send(JSON.stringify({
              type: "conversation.item.create",
              item: { type: "message", role: "user", content: [{ type: "input_text", text: msg.text }] },
            }));
            sendResponseCreate();
          } catch (e) {
            post({ type: "error", message: "send_failed" });
          }
          break;
        case "disableTurnDetection":
          micMuted = true;
          syncMicEnabled();
          try {
            dc && dc.send(JSON.stringify({
              type: "session.update",
              session: { type: "realtime", audio: { input: { turn_detection: null } } },
            }));
          } catch (e) {}
          break;
        case "stop":
          stop();
          break;
      }
    },
  };

  post({ type: "ready" });
})();
</script>
</body>
</html>`;
