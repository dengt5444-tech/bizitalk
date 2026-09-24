// EXPO_PUBLIC_* values are inlined into the bundle at build time — set them
// in mobile/.env for local development and as EAS environment variables
// for cloud builds (see README.md).
function clean(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export const SUPABASE_URL = clean(process.env.EXPO_PUBLIC_SUPABASE_URL);
export const SUPABASE_ANON_KEY = clean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
export const API_BASE_URL = (clean(process.env.EXPO_PUBLIC_API_BASE_URL) ?? "").replace(/\/+$/, "");

export const APPLE_PRODUCT_IDS = {
  trial: clean(process.env.EXPO_PUBLIC_APPLE_PRODUCT_ID_TRIAL),
  standard: clean(process.env.EXPO_PUBLIC_APPLE_PRODUCT_ID),
  unlimited: clean(process.env.EXPO_PUBLIC_APPLE_PRODUCT_ID_UNLIMITED),
};

export const missingConfig = [
  !SUPABASE_URL && "EXPO_PUBLIC_SUPABASE_URL",
  !SUPABASE_ANON_KEY && "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  !API_BASE_URL && "EXPO_PUBLIC_API_BASE_URL",
].filter((name): name is string => !!name);
