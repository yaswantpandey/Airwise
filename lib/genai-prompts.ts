/**
 * Compatibility barrel re-exporting server Gemini prompts and client factory
 * from lib/server/{config,gemini,prompts}.ts.
 */
import { serverConfig } from './server/config';

export const AIRWISE_GEMINI_MODEL = serverConfig.geminiModel;
export { getGeminiClient, isGeminiConfigured } from './server/gemini';
export {
  CHAT_ASSISTANT_SYSTEM_PROMPT,
  DAILY_PLAN_RESPONSE_SCHEMA,
  DAILY_PLAN_SYSTEM_PROMPT,
  DailyPlanOutputZod,
} from './server/prompts';
