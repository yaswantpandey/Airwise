/**
 * Centralized, env-overridable server configuration for AirWise API routes.
 * Validates the configured Gemini model ID loudly on load so misconfigured
 * or deprecated models fail fast instead of failing silently at request time.
 */

export const VALID_GEMINI_MODELS = [
  'gemini-4-hydrogen',
  'gemini-4-neon',
  'gemini-4-carbon',
  'gemini-4-argon',
  'gemini-3.1-flash-lite',
] as const;

export type ValidGeminiModel = (typeof VALID_GEMINI_MODELS)[number];

const DEPRECATED_MODELS = new Set([
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro',
  'gemini-2.0-flash',
  'gemini-2.0-pro',
  'gemini-2.0-flash-thinking',
]);

function parsePositiveInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
}

export function validateGeminiModelId(modelId: string): ValidGeminiModel {
  const trimmed = modelId.trim();
  if (DEPRECATED_MODELS.has(trimmed)) {
    throw new Error(
      `[AirWise Config] Deprecated Gemini model "${trimmed}" is not supported. Use one of: ${VALID_GEMINI_MODELS.join(', ')}`
    );
  }
  if (!(VALID_GEMINI_MODELS as readonly string[]).includes(trimmed)) {
    throw new Error(
      `[AirWise Config] Invalid GEMINI_MODEL "${trimmed}". Allowed models: ${VALID_GEMINI_MODELS.join(', ')}`
    );
  }
  return trimmed as ValidGeminiModel;
}

function parseAllowedOrigins(): string[] {
  const origins = new Set<string>(['http://localhost:3000', 'http://127.0.0.1:3000']);
  const appUrl = process.env.APP_URL?.trim();
  if (appUrl) {
    try {
      origins.add(new URL(appUrl).origin);
    } catch {
      // Ignore malformed APP_URL
    }
  }
  const extra = process.env.ALLOWED_ORIGINS?.trim();
  if (extra) {
    for (const entry of extra.split(',')) {
      const cleaned = entry.trim();
      if (!cleaned) continue;
      try {
        origins.add(new URL(cleaned).origin);
      } catch {
        // Ignore invalid origin entries
      }
    }
  }
  return Array.from(origins);
}

export const serverConfig = {
  port: parsePositiveInt(process.env.PORT, 3000, 1, 65535),
  geminiModel: validateGeminiModelId(process.env.GEMINI_MODEL || 'gemini-4-hydrogen'),
  maxBodyBytes: parsePositiveInt(process.env.MAX_BODY_BYTES, 50 * 1024, 1024, 256 * 1024),
  geminiTimeoutMs: parsePositiveInt(process.env.GEMINI_TIMEOUT_MS, 15_000, 2000, 60_000),
  upstreamTimeoutMs: parsePositiveInt(process.env.UPSTREAM_TIMEOUT_MS, 5_000, 1000, 30_000),
  rateLimits: {
    aqi: {
      limit: parsePositiveInt(process.env.RL_AQI_LIMIT, 45, 1, 1000),
      windowMs: 60_000,
    },
    history: {
      limit: parsePositiveInt(process.env.RL_HISTORY_LIMIT, 40, 1, 1000),
      windowMs: 60_000,
    },
    plan: {
      limit: parsePositiveInt(process.env.RL_PLAN_LIMIT, 12, 1, 300),
      windowMs: 60_000,
    },
    chat: {
      limit: parsePositiveInt(process.env.RL_CHAT_LIMIT, 18, 1, 300),
      windowMs: 60_000,
    },
  },
  cache: {
    aqiTtlMs: 10 * 60 * 1000,
    aqiMaxEntries: 150,
    historyTtlMs: 15 * 60 * 1000,
    historyMaxEntries: 150,
    planTtlMs: 10 * 60 * 1000,
    planMaxEntries: 100,
  },
  allowedOrigins: parseAllowedOrigins(),
} as const;
