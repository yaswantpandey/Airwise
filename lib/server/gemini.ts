import { GoogleGenAI, type Schema } from '@google/genai';
import type { ZodType } from 'zod';
import { serverConfig } from './config';

let cachedClient: GoogleGenAI | null | undefined;

export function isGeminiConfigured(): boolean {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  return Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY');
}

/**
 * Server-side singleton factory for @google/genai client.
 * Never import this file from client components.
 */
export function getGeminiClient(): GoogleGenAI | null {
  if (!isGeminiConfigured()) return null;
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY!.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedClient;
}

export interface GeminiJsonCallOptions<T> {
  prompt: string;
  systemInstruction: string;
  responseSchema: Schema;
  zodSchema: ZodType<T>;
  fallback: (reason: 'missing-key' | 'timeout' | 'api-error' | 'invalid-output') => T;
  requestId: string;
  timeoutMs?: number;
  clientOverride?: Pick<GoogleGenAI, 'models'> | null;
}

export interface GeminiJsonResult<T> {
  data: T;
  source: 'gemini-ai' | 'rule-fallback';
  fallbackReason?: 'missing-key' | 'timeout' | 'api-error' | 'invalid-output';
}

function withAbortTimeout<R>(
  work: (signal: AbortSignal) => Promise<R>,
  timeoutMs: number
): Promise<R> {
  const controller = new AbortController();
  return new Promise<R>((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Gemini request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    work(controller.signal).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * Single unified helper: Call Gemini (with AbortController timeout) ->
 * parse JSON -> validate shape with Zod -> fall back cleanly on any failure.
 */
export async function callGeminiJsonWithFallback<T>(
  opts: GeminiJsonCallOptions<T>
): Promise<GeminiJsonResult<T>> {
  const client = opts.clientOverride !== undefined ? opts.clientOverride : getGeminiClient();
  if (!client) {
    return {
      data: opts.fallback('missing-key'),
      source: 'rule-fallback',
      fallbackReason: 'missing-key',
    };
  }

  const timeoutMs = opts.timeoutMs ?? serverConfig.geminiTimeoutMs;

  try {
    const response = await withAbortTimeout(
      (abortSignal) =>
        client.models.generateContent({
          model: serverConfig.geminiModel,
          contents: opts.prompt,
          config: {
            systemInstruction: opts.systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: opts.responseSchema,
            abortSignal,
          },
        }),
      timeoutMs
    );

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      console.warn(`[AirWise][${opts.requestId}] Gemini returned empty JSON response.`);
      return {
        data: opts.fallback('invalid-output'),
        source: 'rule-fallback',
        fallbackReason: 'invalid-output',
      };
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      console.warn(`[AirWise][${opts.requestId}] Gemini returned malformed JSON.`);
      return {
        data: opts.fallback('invalid-output'),
        source: 'rule-fallback',
        fallbackReason: 'invalid-output',
      };
    }

    const validated = opts.zodSchema.safeParse(parsedJson);
    if (!validated.success) {
      console.warn(`[AirWise][${opts.requestId}] Gemini JSON failed Zod schema validation.`);
      return {
        data: opts.fallback('invalid-output'),
        source: 'rule-fallback',
        fallbackReason: 'invalid-output',
      };
    }

    return { data: validated.data, source: 'gemini-ai' };
  } catch (err) {
    const isTimeout = err instanceof Error && err.message.includes('timed out');
    console.error(`[AirWise][${opts.requestId}] Gemini JSON call failed:`, err);
    return {
      data: opts.fallback(isTimeout ? 'timeout' : 'api-error'),
      source: 'rule-fallback',
      fallbackReason: isTimeout ? 'timeout' : 'api-error',
    };
  }
}

export interface GeminiTextCallOptions {
  prompt: string;
  systemInstruction: string;
  fallback: () => string;
  requestId: string;
  timeoutMs?: number;
  clientOverride?: Pick<GoogleGenAI, 'models'> | null;
}

export interface GeminiTextResult {
  text: string;
  source: 'gemini-ai' | 'rule-fallback';
  fallbackReason?: 'missing-key' | 'timeout' | 'api-error' | 'invalid-output';
}

export async function callGeminiTextWithFallback(
  opts: GeminiTextCallOptions
): Promise<GeminiTextResult> {
  const client = opts.clientOverride !== undefined ? opts.clientOverride : getGeminiClient();
  if (!client) {
    return { text: opts.fallback(), source: 'rule-fallback', fallbackReason: 'missing-key' };
  }

  const timeoutMs = opts.timeoutMs ?? serverConfig.geminiTimeoutMs;
  try {
    const response = await withAbortTimeout(
      (abortSignal) =>
        client.models.generateContent({
          model: serverConfig.geminiModel,
          contents: opts.prompt,
          config: {
            systemInstruction: opts.systemInstruction,
            abortSignal,
          },
        }),
      timeoutMs
    );

    const text = (response.text ?? '').trim();
    if (!text) {
      console.warn(`[AirWise][${opts.requestId}] Gemini returned empty text reply.`);
      return {
        text: opts.fallback(),
        source: 'rule-fallback',
        fallbackReason: 'invalid-output',
      };
    }
    return { text, source: 'gemini-ai' };
  } catch (err) {
    const isTimeout = err instanceof Error && err.message.includes('timed out');
    console.error(`[AirWise][${opts.requestId}] Gemini text call failed:`, err);
    return {
      text: opts.fallback(),
      source: 'rule-fallback',
      fallbackReason: isTimeout ? 'timeout' : 'api-error',
    };
  }
}
