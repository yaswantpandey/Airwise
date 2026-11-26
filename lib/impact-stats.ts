import type { ActionLogEntry, ImpactStats } from './types';

export function calculateImpactStats(
  logs: ActionLogEntry[],
  referenceDateIso = new Date().toISOString()
): ImpactStats {
  const refDate = new Date(referenceDateIso);
  const sevenDaysAgo = new Date(refDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  let weeklyActions = 0;
  let weeklyPm25AvoidedUg = 0;
  let weeklyCo2SavedKg = 0;
  let weeklyPmSavedGrams = 0;

  const uniqueDates = new Set<string>();

  for (const log of logs) {
    uniqueDates.add(log.dateKey);
    const logDate = new Date(`${log.dateKey}T12:00:00Z`);
    if (logDate >= sevenDaysAgo) {
      weeklyActions += 1;
      weeklyPm25AvoidedUg += log.pm25AvoidedUg;
      weeklyCo2SavedKg += log.co2SavedKg;
      weeklyPmSavedGrams += log.pmSavedGrams;
    }
  }

  let streakDays = 0;
  const cursor = new Date(
    Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth(), refDate.getUTCDate())
  );
  const todayKey = cursor.toISOString().slice(0, 10);
  if (!uniqueDates.has(todayKey)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  while (uniqueDates.has(cursor.toISOString().slice(0, 10))) {
    streakDays += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return {
    weeklyActions,
    weeklyPm25AvoidedUg: Math.round(weeklyPm25AvoidedUg),
    weeklyCo2SavedKg: Math.round(weeklyCo2SavedKg * 10) / 10,
    weeklyPmSavedGrams: Math.round(weeklyPmSavedGrams * 10) / 10,
    streakDays,
    totalActions: logs.length,
  };
}

/**
 * Security helper: sanitize untrusted user text, neutralize XML prompt delimiters,
 * and detect prompt-injection override attempts.
 */
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above|system)\s+(instructions|prompts|rules|guidance)/i,
  /disregard\s+(all\s+)?(system|previous|prior)\s+(instructions|rules|prompts)/i,
  /forget\s+(all\s+)?(previous|prior|system)\s+(instructions|rules|prompts)/i,
  /(reveal|print|dump|leak|show|output|exfiltrate)\s+(me\s+)?(your\s+|the\s+)?(system\s+prompt|hidden\s+instructions|api[\s_-]*key|gemini[\s_-]*api[\s_-]*key|process\.env|secret)/i,
  /\b(developer\s+mode|jailbreak|jailbroken)\b/i,
  /you\s+are\s+now\s+(dan|unrestricted)/i,
  /override\s+(safety|medical|system)\s+rules/i,
  /act\s+as\s+(a\s+)?(doctor|physician|unrestricted)/i,
  /<\s*\/?\s*(system|instruction|prompt|user_question|context_json|recent_conversation)\s*>/i,
];

export function sanitizeUserText(raw: string, maxLength = 500): string {
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Neutralizes angle-bracket delimiter sequences so untrusted text cannot close
 * `<user_question>` or `<context_json>` prompt envelopes.
 */
export function neutralizePromptDelimiters(raw: string, maxLength = 500): string {
  return sanitizeUserText(raw, maxLength)
    .replace(/</g, '‹')
    .replace(/>/g, '›');
}

export function detectPromptInjection(text: string): boolean {
  const normalized = sanitizeUserText(text, 2000);
  return INJECTION_PATTERNS.some((pattern) => pattern.test(normalized));
}
