import { z } from 'zod';

/**
 * Shared Zod request/response validation schemas and inferred types for all API routes.
 */

export const aqiQuerySchema = z.object({
  city: z.string().trim().max(80).optional(),
  lat: z.coerce.number().finite().min(-90).max(90).optional(),
  lon: z.coerce.number().finite().min(-180).max(180).optional(),
});

export type AqiQueryInput = z.infer<typeof aqiQuerySchema>;

export const historyQuerySchema = z.object({
  lat: z.coerce.number().finite().min(-90).max(90),
  lon: z.coerce.number().finite().min(-180).max(180),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  city: z.string().trim().max(80).optional(),
  baseAqi: z.coerce.number().finite().min(0).max(999).optional(),
  basePm25: z.coerce.number().finite().min(0).max(1500).optional(),
});

export type HistoryQueryInput = z.infer<typeof historyQuerySchema>;

const hourlyPointSchema = z.object({
  timeIso: z.string().min(4).max(40),
  hourLabel: z.string().min(2).max(16),
  aqi: z.number().finite().min(0).max(999),
  pm25: z.number().finite().min(0).max(2000),
  pm10: z.number().finite().min(0).max(3000),
  temperatureC: z.number().finite().min(-60).max(65),
  humidityPct: z.number().finite().min(0).max(100),
  windKmh: z.number().finite().min(0).max(250),
});

const commuteModeEnum = z.enum([
  'walk',
  'bike',
  'two_wheeler',
  'car',
  'public_transport',
  'wfh',
]);

const maskTypeEnum = z.enum(['none', 'cloth', 'surgical', 'n95', 'n99', 'kn95']);

const ventilationEnum = z.enum([
  'sealed_ac',
  'standard_windows',
  'cross_ventilated',
  'balcony_open',
]);

const cookingFuelEnum = z.enum([
  'lpg',
  'png_piped',
  'induction_electric',
  'biomass_solid',
]);

const budgetEnum = z.enum(['low', 'medium', 'flexible']);

const exerciseEnum = z.enum(['none', 'morning', 'evening', 'flexible']);

export const planRequestSchema = z.object({
  language: z.enum(['en', 'hi']).default('en'),
  snapshot: z.object({
    locationName: z.string().trim().min(1).max(100),
    region: z.string().trim().max(100).default(''),
    country: z.string().trim().max(100).default(''),
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    observedAtIso: z.string().min(8).max(40),
    source: z.enum(['open-meteo-live', 'demo-seed']),
    aqi: z.number().finite().min(0).max(999),
    pm25: z.number().finite().min(0).max(2000),
    pm10: z.number().finite().min(0).max(3000),
    no2: z.number().finite().min(0).max(1000),
    o3: z.number().finite().min(0).max(1000),
    co: z.number().finite().min(0).max(100),
    temperatureC: z.number().finite().min(-60).max(65),
    humidityPct: z.number().finite().min(0).max(100),
    windKmh: z.number().finite().min(0).max(250),
    inversionRisk: z.enum(['low', 'moderate', 'high']),
    hourly: z.array(hourlyPointSchema).max(48),
  }),
  profile: z.object({
    displayLabel: z.string().trim().max(60),
    city: z.string().trim().max(80),
    language: z.enum(['en', 'hi']),
    hasChildren: z.boolean(),
    hasElderly: z.boolean(),
    hasPregnant: z.boolean(),
    hasAsthmaOrRespiratory: z.boolean(),
    hasHeartCondition: z.boolean(),
    commuteMode: commuteModeEnum,
    workFromHome: z.boolean(),
    schoolGoingKids: z.boolean(),
    outdoorExercise: exerciseEnum,
    hasAirPurifier: z.boolean(),
    maskTypes: z.array(maskTypeEnum).max(6),
    ventilationType: ventilationEnum,
    cookingFuel: cookingFuelEnum,
    hasIndoorPlants: z.boolean(),
    budgetLevel: budgetEnum,
    alertAqiThreshold: z.number().finite().min(50).max(400),
    healthConsentAccepted: z.boolean(),
    communityGroupId: z.string().trim().max(64),
  }),
});

export type PlanRequestInput = z.infer<typeof planRequestSchema>;

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(600),
  language: z.enum(['en', 'hi']).default('en'),
  stream: z.boolean().optional().default(false),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(1000),
      })
    )
    .max(8)
    .default([]),
  snapshot: z.object({
    locationName: z.string().trim().min(1).max(100),
    aqi: z.number().finite().min(0).max(999),
    pm25: z.number().finite().min(0).max(2000),
    pm10: z.number().finite().min(0).max(3000),
    no2: z.number().finite().min(0).max(1000),
    o3: z.number().finite().min(0).max(1000),
    co: z.number().finite().min(0).max(100),
    temperatureC: z.number().finite().min(-60).max(65),
    humidityPct: z.number().finite().min(0).max(100),
    windKmh: z.number().finite().min(0).max(250),
    inversionRisk: z.enum(['low', 'moderate', 'high']),
    hourly: z.array(hourlyPointSchema).max(48),
  }),
  profile: z.object({
    hasChildren: z.boolean(),
    hasElderly: z.boolean(),
    hasPregnant: z.boolean(),
    hasAsthmaOrRespiratory: z.boolean(),
    hasHeartCondition: z.boolean(),
    commuteMode: commuteModeEnum,
    hasAirPurifier: z.boolean(),
    maskTypes: z.array(maskTypeEnum).max(6),
    ventilationType: ventilationEnum,
    cookingFuel: cookingFuelEnum,
    budgetLevel: budgetEnum,
  }),
});

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;

export interface ChatResponsePayload {
  reply: string;
  source: 'gemini-ai' | 'rule-fallback';
  groundedAqi: number;
  fallbackNotice?: string;
}

export interface HealthResponsePayload {
  status: 'ok';
  service: 'airwise';
  model: string;
  geminiConfigured: boolean;
  timestampIso: string;
}
