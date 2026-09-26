// The first time any listening material's audio is requested, the API
// route synthesizes it live via OpenAI TTS (several seconds) before caching
// it in storage — every request after that is a fast redirect to the
// cached file. A material nobody has played yet still pays that slow first
// hit, which is exactly what a new listener hits on materials added since
// the last time this ran. Run this after adding/editing materials so real
// visitors never hit the slow path.
//
// Usage: node -r dotenv/config scripts/warm-materials-cache.mjs dotenv_config_path=.env.local
// Optional: BASE_URL=https://bizitalkapp.com node -r dotenv/config ... (defaults to localhost:3000 — a local dev
// server started from this same .env.local still reads/writes the real
// production Supabase storage bucket, so warming locally warms production).
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

// Kept in sync with src/lib/materials.ts's EXCLUDED_MATERIAL_SLUGS by hand
// (a plain .mjs script can't import that .ts file directly) — materials
// BizTalk itself never shows don't need warming here.
const EXCLUDED_MATERIAL_SLUGS = new Set([
  "cafe-order",
  "airport-checkin",
  "hotel-checkin",
  "restaurant-reservation",
  "doctor-appointment",
  "shopping-return",
  "asking-directions",
  "small-talk-weather",
]);

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const { data: materials, error: materialsError } = await admin
  .from("gakuto_materials")
  .select("id, slug, title");
if (materialsError) {
  console.error("Failed to list materials:", materialsError.message);
  process.exit(1);
}

const visible = materials.filter((m) => !EXCLUDED_MATERIAL_SLUGS.has(m.slug));

const { data: files, error: filesError } = await admin.storage
  .from("gakuto-audio")
  .list("", { limit: 1000 });
if (filesError) {
  console.error("Failed to list cached audio files:", filesError.message);
  process.exit(1);
}

const uncached = visible.filter((m) => !files.some((f) => f.name.startsWith(m.id)));

if (uncached.length === 0) {
  console.log(`All ${visible.length} materials already cached.`);
  process.exit(0);
}

console.log(`Warming ${uncached.length} of ${visible.length} materials...`);

for (const material of uncached) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/materials/${material.id}/audio`, {
      redirect: "manual",
    });
    const seconds = ((Date.now() - start) / 1000).toFixed(1);
    if (res.status === 307 || res.status === 200) {
      console.log(`  ok    ${material.slug} (${seconds}s)`);
    } else {
      console.log(`  FAILED ${material.slug}: HTTP ${res.status}`);
    }
  } catch (err) {
    console.log(`  FAILED ${material.slug}:`, err instanceof Error ? err.message : err);
  }
}
