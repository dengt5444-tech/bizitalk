import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_NAME } from "@/lib/site";
import type { ConversationFeedback } from "@/lib/conversation";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${SITE_NAME} — AI英会話の練習結果`;

// Identical for every image this route ever renders, so it's fetched once
// per server instance instead of on every single request (including every
// social-media crawler hit).
let fontCache: Promise<{ regular: ArrayBuffer; bold: ArrayBuffer }> | null = null;

async function loadFont(weight: 400 | 700) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@${weight}&display=swap`;
  const css = await fetch(cssUrl, {
    headers: {
      // Google serves woff2 to modern browsers, but satori (next/og's
      // renderer) only understands ttf/otf — an old-browser UA string
      // gets a ttf link back instead.
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.71 Safari/537.36",
    },
  }).then((res) => res.text());

  const match = css.match(/src: url\(([^)]+)\) format\('[^']+'\)/);
  if (!match) throw new Error("font_url_not_found");
  return fetch(match[1]).then((res) => res.arrayBuffer());
}

function loadFonts() {
  if (!fontCache) {
    fontCache = Promise.all([loadFont(400), loadFont(700)]).then(([regular, bold]) => ({
      regular,
      bold,
    }));
  }
  return fontCache;
}

async function getShareData(id: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("conversation_sessions")
    .select("status, feedback, conversation_scenarios(title, persona_name)")
    .eq("id", id)
    .maybeSingle();

  if (!data || data.status !== "completed" || !data.feedback) return null;

  const scenario = Array.isArray(data.conversation_scenarios)
    ? data.conversation_scenarios[0]
    : data.conversation_scenarios;

  return { feedback: data.feedback as ConversationFeedback, scenario };
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, fonts] = await Promise.all([getShareData(id), loadFonts()]);

  const fluency = data?.feedback.fluencyScore;
  const title = data?.scenario?.title;
  const persona = data?.scenario?.persona_name;
  const scores = data?.feedback.categoryScores;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #e8eefc 0%, #f5f7fa 55%, #fdf1e2 100%)",
          fontFamily: "Noto Sans JP",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: 920,
            padding: "56px 64px",
            borderRadius: 40,
            background: "#ffffff",
            boxShadow: "0 30px 80px rgba(18, 24, 43, 0.16)",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: 4,
              color: "#1d4ed8",
              textTransform: "uppercase",
            }}
          >
            {SITE_NAME}
          </div>

          {title && (
            <div
              style={{
                display: "flex",
                marginTop: 20,
                fontSize: 34,
                fontWeight: 700,
                color: "#12182b",
                textAlign: "center",
              }}
            >
              {title}
            </div>
          )}
          {persona && (
            <div style={{ display: "flex", marginTop: 8, fontSize: 22, color: "#57607a" }}>
              話し相手: {persona}
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: 36,
            }}
          >
            <div style={{ display: "flex", fontSize: 20, color: "#98a1b8", letterSpacing: 2 }}>
              フルエンシー評価
            </div>
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 4 }}>
              <div style={{ display: "flex", fontSize: 120, fontWeight: 700, color: "#12182b" }}>
                {fluency ?? "-"}
              </div>
              <div style={{ display: "flex", fontSize: 36, color: "#98a1b8", marginLeft: 8 }}>
                / 5
              </div>
            </div>
          </div>

          {scores && (
            <div style={{ display: "flex", gap: 20, marginTop: 36 }}>
              {(
                [
                  ["文法", scores.grammar],
                  ["語彙", scores.vocabulary],
                  ["丁寧さ", scores.professionalism],
                ] as const
              ).map(([label, score]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    width: 140,
                    padding: "14px 0",
                    borderRadius: 20,
                    background: "#eaeef3",
                  }}
                >
                  <div style={{ display: "flex", fontSize: 18, color: "#98a1b8" }}>{label}</div>
                  <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: "#12182b", marginTop: 4 }}>
                    {score}
                    <span style={{ fontSize: 14, color: "#98a1b8", marginLeft: 4 }}>/5</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", marginTop: 32, fontSize: 22, color: "#57607a" }}>
          AIとリアルタイム音声で英会話を練習
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Noto Sans JP", data: fonts.regular, weight: 400, style: "normal" },
        { name: "Noto Sans JP", data: fonts.bold, weight: 700, style: "normal" },
      ],
    },
  );
}
