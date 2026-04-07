function num(raw: string | undefined, fallback: number): number {
  const n = Number.parseFloat(raw ?? "");
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  MP_FEE_RATE: num(process.env.MP_FEE_RATE, 0.0299),
  MP_LIVE_MODE: process.env.MP_LIVE_MODE === "true",
  GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY ?? "",
  FOUNDER_PHONE: process.env.FOUNDER_PHONE?.trim() ?? "",
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ?? "",
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ?? "",
  TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM?.trim() ?? "",
  NODE_ENV: process.env.NODE_ENV ?? "development",
} as const;
