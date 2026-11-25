import type {
  ActionLogEntry,
  AirAlertItem,
  AirQualitySnapshot,
  AqiBandInfo,
  DailyHistoryPoint,
  DailyPlanResponse,
  HourlyForecastPoint,
  HouseholdProfile,
  ImpactStats,
  LanguageCode,
  MemberGuidance,
} from './types';

/**
 * Color-blind-safe AQI band table (distinct hue + luminance + geometric symbol + explicit text).
 * Aligned with US EPA / CPCB urban particulate risk bands.
 */
export const AQI_BANDS: AqiBandInfo[] = [
  {
    key: 'good',
    min: 0,
    max: 50,
    labelEn: 'Good',
    labelHi: 'अच्छा',
    meaningEn: 'Clean air. Safe for outdoor play, exercise, and cross-ventilation.',
    meaningHi: 'साफ़ हवा। बाहर खेलने, व्यायाम और खिड़कियाँ खोलने के लिए सुरक्षित।',
    symbol: 'circle',
    hex: '#0D9488',
    badgeTextClass: 'text-teal-800 dark:text-teal-200',
    surfaceTintClass: 'bg-teal-50/70 dark:bg-teal-950/40',
    borderTintClass: 'border-teal-200 dark:border-teal-800/70',
  },
  {
    key: 'moderate',
    min: 51,
    max: 100,
    labelEn: 'Moderate',
    labelHi: 'मध्यम',
    meaningEn: 'Acceptable for most people; sensitive individuals should watch for symptoms.',
    meaningHi: 'अधिकांश लोगों के लिए ठीक; संवेदनशील लोग लक्षणों पर ध्यान दें।',
    symbol: 'half',
    hex: '#B45309',
    badgeTextClass: 'text-amber-800 dark:text-amber-200',
    surfaceTintClass: 'bg-amber-50/70 dark:bg-amber-950/35',
    borderTintClass: 'border-amber-200 dark:border-amber-800/70',
  },
  {
    key: 'sensitive',
    min: 101,
    max: 150,
    labelEn: 'Unhealthy for Sensitive Groups',
    labelHi: 'संवेदनशील समूहों के लिए अस्वस्थ',
    meaningEn: 'Children, elderly, and people with asthma should shorten vigorous outdoor time.',
    meaningHi: 'बच्चे, बुजुर्ग और अस्थमा रोगी बाहर भारी गतिविधि कम करें।',
    symbol: 'triangle',
    hex: '#C2410C',
    badgeTextClass: 'text-orange-800 dark:text-orange-200',
    surfaceTintClass: 'bg-orange-50/70 dark:bg-orange-950/35',
    borderTintClass: 'border-orange-200 dark:border-orange-800/70',
  },
  {
    key: 'unhealthy',
    min: 151,
    max: 200,
    labelEn: 'Unhealthy',
    labelHi: 'अस्वस्थ',
    meaningEn: 'Limit outdoor exertion. Wear a well-fitted N95/KN95 mask during commutes.',
    meaningHi: 'बाहरी मेहनत सीमित करें। सफ़र के दौरान सही फिट वाला N95/KN95 मास्क पहनें।',
    symbol: 'shield',
    hex: '#BE123C',
    badgeTextClass: 'text-rose-800 dark:text-rose-200',
    surfaceTintClass: 'bg-rose-50/70 dark:bg-rose-950/35',
    borderTintClass: 'border-rose-200 dark:border-rose-800/70',
  },
  {
    key: 'very_unhealthy',
    min: 201,
    max: 300,
    labelEn: 'Very Unhealthy',
    labelHi: 'बहुत अस्वस्थ',
    meaningEn: 'Avoid outdoor exercise. Keep windows closed during smog peaks and filter indoor air.',
    meaningHi: 'बाहरी व्यायाम से बचें। स्मॉग पीक के समय खिड़कियाँ बंद रखें और घर की हवा फ़िल्टर करें।',
    symbol: 'octagon',
    hex: '#7E22CE',
    badgeTextClass: 'text-purple-800 dark:text-purple-200',
    surfaceTintClass: 'bg-purple-50/70 dark:bg-purple-950/35',
    borderTintClass: 'border-purple-200 dark:border-purple-800/70',
  },
  {
    key: 'severe',
    min: 301,
    max: 999,
    labelEn: 'Severe / Hazardous',
    labelHi: 'गंभीर / खतरनाक',
    meaningEn: 'Health alert: stay indoors as much as possible, seal gaps, and run HEPA filtration.',
    meaningHi: 'स्वास्थ्य चेतावनी: यथासंभव घर के अंदर रहें, दरारें बंद करें और HEPA फ़िल्टर चलाएँ।',
    symbol: 'hazard',
    hex: '#881337',
    badgeTextClass: 'text-fuchsia-950 dark:text-fuchsia-200',
    surfaceTintClass: 'bg-fuchsia-50/80 dark:bg-fuchsia-950/40',
    borderTintClass: 'border-fuchsia-300 dark:border-fuchsia-800/70',
  },
];

export function getAqiBand(aqi: number): AqiBandInfo {
  const safeAqi = Number.isFinite(aqi) ? Math.max(0, Math.round(aqi)) : 0;
  for (const band of AQI_BANDS) {
    if (safeAqi >= band.min && safeAqi <= band.max) {
      return band;
    }
  }
  return AQI_BANDS[AQI_BANDS.length - 1];
}

export function computeInversionRisk(
  pm25: number,
  windKmh: number,
  humidityPct: number
): 'low' | 'moderate' | 'high' {
  if (pm25 >= 90 && windKmh <= 8 && humidityPct >= 65) return 'high';
  if (pm25 >= 45 && windKmh <= 12) return 'moderate';
  return 'low';
}

export function getEffectiveAlertThreshold(profile: HouseholdProfile): number {
  let recommended = profile.alertAqiThreshold || 150;
  const hasHighVulnerability =
    profile.hasAsthmaOrRespiratory ||
    profile.hasHeartCondition ||
    profile.hasPregnant ||
    profile.hasChildren ||
    profile.hasElderly;

  if (hasHighVulnerability) {
    recommended = Math.min(recommended, 120);
  }
  return Math.max(50, Math.min(400, Math.round(recommended)));
}

export interface WindowAnalysis {
  bestStartLabel: string;
  bestEndLabel: string;
  bestAvgAqi: number;
  worstStartLabel: string;
  worstEndLabel: string;
  worstAvgAqi: number;
  bestWindowText: string;
  worstWindowText: string;
}

export function findBestOutdoorWindows(hourly: HourlyForecastPoint[]): WindowAnalysis {
  const next24 = hourly.slice(0, 24);
  if (next24.length < 3) {
    return {
      bestStartLabel: '13:00',
      bestEndLabel: '16:00',
      bestAvgAqi: next24[0]?.aqi ?? 100,
      worstStartLabel: '06:00',
      worstEndLabel: '09:00',
      worstAvgAqi: next24[0]?.aqi ?? 150,
      bestWindowText: '13:00–16:00 (afternoon mixing)',
      worstWindowText: '06:00–09:00 (morning inversion)',
    };
  }

  let bestIdx = 0;
  let bestAvg = Infinity;
  let worstIdx = 0;
  let worstAvg = -Infinity;

  for (let i = 0; i <= next24.length - 3; i++) {
    const avg = (next24[i].aqi + next24[i + 1].aqi + next24[i + 2].aqi) / 3;
    if (avg < bestAvg) {
      bestAvg = avg;
      bestIdx = i;
    }
    if (avg > worstAvg) {
      worstAvg = avg;
      worstIdx = i;
    }
  }

  const bestStart = next24[bestIdx].hourLabel;
  const bestEnd = next24[Math.min(next24.length - 1, bestIdx + 2)].hourLabel;
  const worstStart = next24[worstIdx].hourLabel;
  const worstEnd = next24[Math.min(next24.length - 1, worstIdx + 2)].hourLabel;

  return {
    bestStartLabel: bestStart,
    bestEndLabel: bestEnd,
    bestAvgAqi: Math.round(bestAvg),
    worstStartLabel: worstStart,
    worstEndLabel: worstEnd,
    worstAvgAqi: Math.round(worstAvg),
    bestWindowText: `${bestStart} – ${bestEnd} (~AQI ${Math.round(bestAvg)})`,
    worstWindowText: `${worstStart} – ${worstEnd} (~AQI ${Math.round(worstAvg)})`,
  };
}

export function evaluateAlerts(
  snapshot: AirQualitySnapshot,
  profile: HouseholdProfile
): AirAlertItem[] {
  const alerts: AirAlertItem[] = [];
  const threshold = getEffectiveAlertThreshold(profile);
  const windows = findBestOutdoorWindows(snapshot.hourly);
  const nowIso = snapshot.observedAtIso;

  if (snapshot.aqi >= threshold) {
    const severity = snapshot.aqi >= 200 ? 'critical' : 'warning';
    alerts.push({
      id: 'threshold-exceeded',
      severity,
      titleEn: `AQI ${snapshot.aqi} crossed your household alert threshold (${threshold})`,
      titleHi: `AQI ${snapshot.aqi} आपकी घरेलू चेतावनी सीमा (${threshold}) से ऊपर है`,
      detailEn: `Current PM2.5 is ${snapshot.pm25} µg/m³ in ${snapshot.locationName}. Switch outdoor plans indoors and use N95 protection if stepping out.`,
      detailHi: `${snapshot.locationName} में अभी PM2.5 ${snapshot.pm25} µg/m³ है। बाहरी काम अंदर करें और बाहर जाते समय N95 मास्क पहनें।`,
      triggeredAtIso: nowIso,
    });
  }

  if (snapshot.inversionRisk === 'high') {
    alerts.push({
      id: 'inversion-trap',
      severity: 'warning',
      titleEn: 'Winter temperature inversion trapping pollutants',
      titleHi: 'सर्दियों के तापमान उलटाव से प्रदूषण फँसा हुआ है',
      detailEn: `Low wind (${snapshot.windKmh} km/h) and high humidity (${snapshot.humidityPct}%) are keeping smog close to ground level. Keep exterior windows closed until afternoon mixing.`,
      detailHi: `कम हवा (${snapshot.windKmh} km/h) और अधिक नमी (${snapshot.humidityPct}%) से स्मॉग ज़मीन के पास फँसा है। दोपहर तक खिड़कियाँ बंद रखें।`,
      triggeredAtIso: nowIso,
    });
  }

  alerts.push({
    id: 'best-window',
    severity: 'info',
    titleEn: `Best lower-pollution window: ${windows.bestWindowText}`,
    titleHi: `कम प्रदूषण का सबसे बेहतर समय: ${windows.bestWindowText}`,
    detailEn:
      windows.bestAvgAqi <= 150
        ? `Brief essential errands or quick 10-minute cross-ventilation are safest during ${windows.bestStartLabel}–${windows.bestEndLabel}.`
        : `Even the lowest window stays elevated (~AQI ${windows.bestAvgAqi}); keep errands short and use a fitted mask.`,
    detailHi:
      windows.bestAvgAqi <= 150
        ? `${windows.bestStartLabel}–${windows.bestEndLabel} के बीच ज़रूरी काम या 10 मिनट का वेंटिलेशन सबसे सुरक्षित है।`
        : `सबसे बेहतर समय में भी AQI ${windows.bestAvgAqi} के आसपास है; बाहर कम समय बिताएँ और मास्क पहनें।`,
    triggeredAtIso: nowIso,
  });

  return alerts;
}

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

  // Compute consecutive daily streak ending today or yesterday
  let streakDays = 0;
  const cursor = new Date(Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth(), refDate.getUTCDate()));
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
 * Security helper: sanitize untrusted user text and detect prompt-injection attempts.
 */
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/i,
  /disregard\s+(all\s+)?(system|previous)\s+(instructions|rules)/i,
  /reveal\s+(your\s+)?(system\s+prompt|hidden\s+instructions|api\s*key)/i,
  /you\s+are\s+now\s+(dan|unrestricted|developer\s+mode|jailbreak)/i,
  /override\s+(safety|medical|system)\s+rules/i,
  /<\s*\/?\s*(system|instruction|prompt)\s*>/i,
];

export function sanitizeUserText(raw: string, maxLength = 500): string {
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function detectPromptInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Deterministic, transparent rule-based Daily Plan builder.
 * Grounded strictly in real AQI values, weather, and household profile.
 * Used as fallback if Gemini API fails or key is absent.
 */
export function buildRuleBasedDailyPlan(
  snapshot: AirQualitySnapshot,
  profile: HouseholdProfile,
  language: LanguageCode,
  fallbackNotice?: string
): DailyPlanResponse {
  const band = getAqiBand(snapshot.aqi);
  const windows = findBestOutdoorWindows(snapshot.hourly);
  const isHi = language === 'hi';
  const severe = snapshot.aqi >= 201;
  const unhealthy = snapshot.aqi >= 151;
  const moderateOrWorse = snapshot.aqi >= 101;
  const hasN95 = profile.maskTypes.includes('n95') || profile.maskTypes.includes('kn95') || profile.maskTypes.includes('n99');

  const rightNowHeadline = isHi
    ? severe
      ? `अभी घर के अंदर रहें — ${snapshot.locationName} में AQI ${snapshot.aqi} (${band.labelHi})`
      : unhealthy
      ? `बाहरी गतिविधि सीमित करें — AQI ${snapshot.aqi} (${band.labelHi})`
      : `हवा ${band.labelHi} है — AQI ${snapshot.aqi}, दोपहर की विंडो चुनें`
    : severe
    ? `Stay indoors right now — AQI ${snapshot.aqi} (${band.labelEn}) in ${snapshot.locationName}`
    : unhealthy
    ? `Limit outdoor exertion now — AQI ${snapshot.aqi} (${band.labelEn}) in ${snapshot.locationName}`
    : `Air is ${band.labelEn} (AQI ${snapshot.aqi}) — plan outdoor errands in the cleaner window`;

  const rightNowSummary = isHi
    ? `PM2.5 ${snapshot.pm25} µg/m³, हवा की गति ${snapshot.windKmh} km/h और नमी ${snapshot.humidityPct}% है। सबसे कम प्रदूषण वाला समय ${windows.bestWindowText} है।`
    : `Live PM2.5 is ${snapshot.pm25} µg/m³ with ${snapshot.windKmh} km/h wind and ${snapshot.humidityPct}% humidity. Your lowest-exposure outdoor window is ${windows.bestWindowText}.`;

  const memberAdvice: MemberGuidance[] = [];

  if (profile.hasChildren || profile.schoolGoingKids) {
    memberAdvice.push({
      memberGroup: isHi ? 'बच्चे (स्कूल और खेल)' : 'Children (School & Play)',
      riskLevel: severe ? 'critical' : unhealthy ? 'high' : moderateOrWorse ? 'moderate' : 'low',
      maskRecommendation: unhealthy
        ? isHi
          ? 'बच्चों के साइज़ का सही फिट वाला N95/KF94 मास्क'
          : 'Child-sized fitted N95 / KF94 mask (avoid loose cloth masks)'
        : isHi
        ? 'वैकल्पिक; भारी धूल में मास्क रखें'
        : 'Optional outdoors; keep child mask ready near traffic',
      outdoorLimit: severe
        ? isHi ? 'बाहर खेल बंद रखें; स्कूल से सीधे घर' : 'No outdoor sports; move play strictly indoors'
        : unhealthy
        ? isHi ? 'केवल 15–20 मिनट हल्की गतिविधि (दोपहर में)' : 'Max 15–20 min light outdoor time during cleaner window'
        : isHi ? 'सामान्य खेल, व्यस्त सड़क से दूर' : 'Normal outdoor play away from main arterial roads',
      specificAdvice: isHi
        ? 'स्कूल बस या कारपूल के दौरान खिड़कियाँ बंद और रीसर्क्युलेशन मोड चालू रखें।'
        : 'Keep car/van windows closed with cabin air on recirculate during school drop-off.',
    });
  }

  if (profile.hasElderly) {
    memberAdvice.push({
      memberGroup: isHi ? 'बुजुर्ग सदस्य' : 'Elderly Family Members',
      riskLevel: severe ? 'critical' : unhealthy ? 'high' : moderateOrWorse ? 'moderate' : 'low',
      maskRecommendation: unhealthy
        ? isHi ? 'कम साँस प्रतिरोध वाला N95/KN95 (बाहर जाने पर)' : 'Low-breathing-resistance N95/KN95 for unavoidable outdoor errands'
        : isHi ? 'भीड़भाड़ वाले यातायात में मास्क' : 'Mask near congested roads',
      outdoorLimit: severe
        ? isHi ? 'सुबह की सैर टालें; घर के अंदर हल्की चहलकदमी करें' : 'Skip morning walks completely; walk indoors or on enclosed corridors'
        : unhealthy
        ? isHi ? 'सुबह नहीं, केवल दोपहर में 15 मिनट हल्की सैर' : 'Shift walks from early morning inversion to 15 min in afternoon window'
        : isHi ? 'हल्की सैर सुरक्षित, थकान होने पर रुकें' : 'Gentle walks fine; stop if coughing or breathless',
      specificAdvice: isHi
        ? 'सुबह 6–9 बजे स्मॉग सबसे घना होता है; गुनगुना पानी और नियमित दवाएँ समय पर लें।'
        : 'Avoid 6–9 AM smog peaks; stay well hydrated and keep prescribed medications handy.',
    });
  }

  if (profile.hasAsthmaOrRespiratory || profile.hasHeartCondition || profile.hasPregnant) {
    memberAdvice.push({
      memberGroup: isHi ? 'उच्च संवेदनशील सदस्य (अस्थमा/हृदय/गर्भावस्था)' : 'High-Sensitivity Members (Asthma / Heart / Pregnancy)',
      riskLevel: unhealthy ? 'critical' : moderateOrWorse ? 'high' : 'moderate',
      maskRecommendation: moderateOrWorse
        ? isHi ? 'बाहर निकलने पर हर बार फिट किया हुआ N95 मास्क' : 'Well-sealed N95 mask on every outdoor trip'
        : isHi ? 'तैयार रखें' : 'Keep an N95 mask accessible',
      outdoorLimit: moderateOrWorse
        ? isHi ? 'अनावश्यक बाहरी यात्रा से बचें' : 'Avoid non-essential outdoor trips until AQI drops below 100'
        : isHi ? 'मध्यम गतिविधि सुरक्षित' : 'Moderate activity fine; avoid rush-hour intersections',
      specificAdvice: isHi
        ? 'बेडरूम में साफ़ हवा का ज़ोन बनाएँ; सीने में जकड़न या साँस फूलने पर तुरंत डॉक्टर से संपर्क करें।'
        : 'Maintain a clean-air bedroom zone; consult a doctor promptly if wheezing, chest tightness, or breathlessness occurs.',
    });
  }

  memberAdvice.push({
    memberGroup: isHi ? 'स्वस्थ वयस्क और यात्री' : 'Healthy Adults & Commuters',
    riskLevel: severe ? 'high' : unhealthy ? 'moderate' : 'low',
    maskRecommendation: unhealthy
      ? hasN95
        ? isHi ? 'अपना N95/KN95 मास्क पहनें और नाक की क्लिप ठीक से दबाएँ' : 'Wear your N95/KN95 mask with nose bridge pinched snug'
        : isHi ? 'दो-पहिया/पैदल सफ़र के लिए N95 मास्क लें (कपड़े का मास्क PM2.5 नहीं रोकता)' : 'Acquire an N95/KN95 mask for commutes (cloth masks block <25% of PM2.5)'
      : isHi ? 'व्यस्त ट्रैफ़िक में वैकल्पिक' : 'Optional except along heavy-traffic corridors',
    outdoorLimit: severe
      ? isHi ? 'बाहर दौड़ना/साइकिलिंग बंद करें; घर में व्यायाम करें' : 'Move running/cycling indoors; high breathing rate multiplies PM2.5 dose 4–6x'
      : unhealthy
      ? isHi ? 'केवल हल्की पैदल चाल, भारी कसरत अंदर करें' : 'Keep cardio indoors; short brisk errands only'
      : isHi ? 'दोपहर के साफ़ समय में व्यायाम करें' : 'Schedule outdoor workouts in the lower-AQI window',
    specificAdvice: isHi
      ? 'यदि संभव हो तो सुबह की पीक ट्रैफ़िक के बजाय मेट्रो या वर्क-फ्रॉम-होम चुनें।'
      : 'Prefer metro/closed transit or flexible WFH during morning smog inversion.',
  });

  const routine = [
    {
      id: 'routine-window',
      title: isHi ? 'बाहरी काम और स्कूल ड्रॉप-ऑफ़ का समय' : 'Shift outdoor errands & exercise to the cleaner window',
      timing: windows.bestWindowText,
      actionSteps: isHi
        ? [
            `सुबह के घने स्मॉग (${windows.worstWindowText}) में बाहर व्यायाम या टहलना बंद करें।`,
            `ज़रूरी बाहरी काम ${windows.bestStartLabel} से ${windows.bestEndLabel} के बीच करें जब हवा थोड़ी ऊपर उठती है।`,
            profile.schoolGoingKids
              ? 'बच्चों को स्कूल भेजते समय मुख्य सड़क से दूर वाली गली या बंद वाहन चुनें।'
              : 'सफ़र के समय पीक ट्रैफ़िक घंटों से 30 मिनट पहले या बाद में निकलें।',
          ]
        : [
            `Avoid outdoor exertion during the peak smog window (${windows.worstWindowText}).`,
            `Schedule essential errands between ${windows.bestStartLabel} and ${windows.bestEndLabel} when daytime mixing lowers ground PM2.5.`,
            profile.schoolGoingKids
              ? 'Use enclosed transit or side streets away from idling traffic during school drop-off.'
              : 'Offset commute by 30 minutes from rush-hour bottlenecks when possible.',
          ],
      whoItAppliesTo: isHi ? 'पूरा परिवार' : 'Whole household',
      impact: {
        pm25ExposureReduction: isHi ? '~25–40% कम PM2.5 संपर्क (अनुमानित)' : '~25–40% lower daily PM2.5 exposure (approximate)',
        emissionsSaved: isHi ? 'व्यक्तिगत स्वास्थ्य बचत' : 'Direct personal exposure reduction',
        healthReasoning: isHi
          ? 'सुबह के तापमान उलटाव में PM2.5 ज़मीन के पास जमा रहता है; दोपहर की धूप में यह थोड़ा फैल जाता है।'
          : 'Morning inversions trap fine particulates near ground level; midday solar heating lifts the boundary layer and dilutes PM2.5.',
        assumptions: isHi
          ? 'अनुमानित: Open-Meteo के 24-घंटे के घंटेवार पूर्वानुमान अंतर पर आधारित।'
          : 'Approximate: based on hourly PM2.5 diurnal spread in the current 24-hour forecast.',
        isApproximate: true,
      },
    },
    {
      id: 'routine-commute',
      title: isHi ? 'कम प्रदूषण वाला सफ़र विकल्प' : 'Low-exposure & low-emission commute plan',
      timing: isHi ? 'ऑफ़िस और स्कूल के घंटे' : 'Work & school commute hours',
      actionSteps:
        profile.commuteMode === 'two_wheeler' || profile.commuteMode === 'bike' || profile.commuteMode === 'walk'
          ? isHi
            ? [
                'खुले दो-पहिया या पैदल सफ़र पर सड़क किनारे प्रदूषण 2x तक ज़्यादा होता है — आज मेट्रो/बस या कारपूल चुनें।',
                'यदि दो-पहिया ज़रूरी हो तो हेलमेट के नीचे फिट N95 मास्क पहनें।',
              ]
            : [
                'Roadside PM2.5 is up to 2x higher on two-wheelers or foot — switch to metro, AC bus, or carpool on high-AQI days.',
                'If riding is unavoidable, wear a snug N95 under the helmet and avoid tailgating diesel vehicles.',
              ]
          : isHi
          ? [
              'मेट्रो/पब्लिक ट्रांसपोर्ट या कारपूल से एकल कार यात्रा कम करें।',
              'कार में एसी को "रीसर्क्युलेशन" मोड पर रखें ताकि बाहर का धुआँ अंदर न आए।',
            ]
          : [
              'Choose metro/public transit or carpooling to cut local tailpipe PM and NO2.',
              'If driving, set cabin HVAC to Recirculate mode (cuts in-cabin PM2.5 by ~60–75%).',
            ],
      whoItAppliesTo: isHi ? 'दैनिक यात्री' : 'Daily commuters',
      impact: {
        pm25ExposureReduction: isHi ? '~45–65% कम कम्यूट PM2.5 (अनुमानित)' : '~45–65% lower commute PM2.5 dose (approximate)',
        emissionsSaved: isHi ? '~2.4 kg CO2 और ~0.8 g PM प्रति राउंड-ट्रिप (अनुमानित)' : '~2.4 kg CO2 & ~0.8 g PM saved per round trip (approximate)',
        healthReasoning: isHi
          ? 'ट्रैफ़िक जंक्शन पर काला कार्बन और NO2 फेफड़ों में सूजन बढ़ाते हैं।'
          : 'Traffic-corridor black carbon and NO2 acutely inflame airways; enclosed transit or WFH sharply cuts inhaled dose.',
        assumptions: isHi
          ? 'अनुमानित: 15 किमी शहरी पेट्रोल/डीज़ल यात्रा बनाम मेट्रो/WFH (160 g CO2/km मानक)।'
          : 'Approximate: assumes a 15 km urban car round-trip (~160 g CO2/km) replaced by metro or WFH.',
        isApproximate: true,
      },
    },
  ];

  const indoorHacks = [
    {
      id: 'indoor-ventilation',
      title: isHi ? 'स्मार्ट वेंटिलेशन और सीलिंग समय' : 'Timed ventilation & draft sealing',
      timing: isHi
        ? `खिड़कियाँ बंद रखें; केवल ${windows.bestStartLabel}–${windows.bestEndLabel} में 10 मिनट खोलें`
        : `Keep sealed now; brief 10-min air exchange during ${windows.bestStartLabel}–${windows.bestEndLabel}`,
      actionSteps: isHi
        ? [
            'बाहरी दरवाज़ों के नीचे गीला तौलिया या सस्ती ड्राफ्ट-स्टॉप पट्टी लगाएँ ताकि स्मॉग रिसाव कम हो।',
            profile.hasAirPurifier
              ? 'सोने से 1 घंटा पहले बेडरूम में HEPA एयर प्यूरीफ़ायर मीडियम/हाई मोड पर चलाएँ और दरवाज़ा बंद रखें।'
              : 'कम बजट में साफ़ कमरा: एक कमरे का दरवाज़ा बंद रखें, गीला पोछा लगाएँ (झाड़ू नहीं), और बॉक्स-फ़ैन + MERV-13 DIY फ़िल्टर पर विचार करें।',
            'घर के अंदर अगरबत्ती, धूपबत्ती या मच्छर कॉइल न जलाएँ — ये PM2.5 को 300+ तक बढ़ा सकते हैं।',
          ]
        : [
            'Place rolled towels or affordable weather-stripping at door gaps to slow outdoor smog infiltration.',
            profile.hasAirPurifier
              ? 'Run your HEPA air purifier on Medium/High in the bedroom 1 hour before sleep with the door closed to create a clean-air room.'
              : 'Low-cost clean room: keep one bedroom door shut, wet-mop instead of dry sweeping, and consider a DIY box-fan + MERV-13 filter.',
            'Skip indoor incense, dhoop, scented candles, or mosquito coils—they spike indoor PM2.5 rapidly.',
          ],
      whoItAppliesTo: isHi ? 'घर में मौजूद सभी सदस्य' : 'All household members indoors',
      impact: {
        pm25ExposureReduction: profile.hasAirPurifier
          ? isHi ? '~55–75% कम इनडोर PM2.5 (अनुमानित)' : '~55–75% lower indoor PM2.5 (approximate)'
          : isHi ? '~25–40% कम इनडोर PM2.5 (अनुमानित)' : '~25–40% lower indoor PM2.5 (approximate)',
        emissionsSaved: isHi ? 'घरेलू धुआँ उत्सर्जन में कटौती' : 'Eliminates indoor combustion particulates',
        healthReasoning: isHi
          ? 'रात के 8 घंटे साफ़ कमरे में सोने से फेफड़ों और हृदय को दिनभर के प्रदूषण से उबरने का मौका मिलता है।'
          : 'Eight hours of cleaner bedroom air gives lungs and cardiovascular tissue recovery time from daytime exposure.',
        assumptions: isHi
          ? 'अनुमानित: बंद कमरे में सही CADR वाले HEPA प्यूरीफ़ायर या गीले पोछे/सीलिंग के मानक अध्ययन।'
          : 'Approximate: assumes closed bedroom door, CADR matched to room size (or draft sealing + wet mopping for non-purifier homes).',
        isApproximate: true,
      },
    },
    {
      id: 'indoor-cooking',
      title: isHi ? 'रसोई का धुआँ और नमी नियंत्रण' : 'Kitchen smoke & humidity control',
      timing: isHi ? 'खाना पकाते और सफ़ाई करते समय' : 'During cooking & daily cleaning',
      actionSteps: isHi
        ? [
            'तड़का या तलने के दौरान चिमनी/एग्ज़ॉस्ट फ़ैन चालू रखें और बर्तन पर ढक्कन रखें।',
            profile.cookingFuel === 'biomass_solid'
              ? 'धुएँ वाले ईंधन की जगह LPG या इंडक्शन पर शिफ्ट करने से घर के अंदर PM2.5 बहुत घटता है।'
              : 'पानी उबालने या दाल पकाने के लिए प्रेशर कुकर या इलेक्ट्रिक केटल/इंडक्शन का उपयोग करें।',
            'घर की नमी 40–55% के बीच रखें ताकि हवा में धूल कम उड़े और फफूंदी न बने।',
          ]
        : [
            'Run your kitchen exhaust fan or chimney throughout frying/tadka and cover pots to cut aerosolized oil PM2.5.',
            profile.cookingFuel === 'biomass_solid'
              ? 'Transitioning from solid/biomass fuel to LPG or electric induction is the single largest indoor air win.'
              : 'Use a pressure cooker or electric kettle/induction burner to lower indoor NO2 and heat buildup.',
            'Maintain 40–55% indoor humidity; wet-wipe surfaces daily instead of dry dusting.',
          ],
      whoItAppliesTo: isHi ? 'रसोई में काम करने वाले सदस्य व बच्चे' : 'Cooks & children indoors',
      impact: {
        pm25ExposureReduction: isHi ? '~30–50% कम रसोई PM2.5 पीक (अनुमानित)' : '~30–50% lower kitchen PM2.5 peaks (approximate)',
        emissionsSaved: isHi ? '~0.3–0.6 kg CO2/दिन (अनुमानित)' : '~0.3–0.6 kg CO2/day with electric/covered cooking (approximate)',
        healthReasoning: isHi
          ? 'बिना वेंटिलेशन के तलने-भूनने से रसोई में PM2.5 अस्थायी रूप से 400 µg/m³ पार कर सकता है।'
          : 'Unvented frying and gas combustion briefly push kitchen PM2.5 and NO2 above outdoor smog levels.',
        assumptions: isHi
          ? 'अनुमानित: 45 मिनट दैनिक खाना पकाने में एग्ज़ॉस्ट फ़ैन उपयोग पर आधारित।'
          : 'Approximate: assumes 45 min/day active cooking with range hood or exhaust ventilation.',
        isApproximate: true,
      },
    },
  ];

  const sustainableAlternatives = [
    {
      id: 'sustain-transit',
      title: isHi ? 'मेट्रो, कारपूल और नो-आइडलिंग संकल्प' : 'Public transit, carpooling & zero engine idling',
      timing: isHi ? 'दैनिक यात्रा व स्कूल पिक-अप' : 'Daily commute & school pickup',
      actionSteps: isHi
        ? [
            'लाल बत्ती या स्कूल गेट पर 30 सेकंड से अधिक रुकने पर इंजन बंद करें।',
            'पड़ोसियों के साथ सप्ताह में 2 दिन स्कूल या ऑफ़िस कारपूल तय करें।',
          ]
        : [
            'Switch off vehicle engines at signals or school pickup queues longer than 30 seconds.',
            'Coordinate a 2-day/week office or school carpool with neighbors.',
          ],
      whoItAppliesTo: isHi ? 'यात्री और अभिभावक' : 'Commuters & parents',
      impact: {
        pm25ExposureReduction: isHi ? 'स्कूल गेट पर बच्चों के लिए स्थानीय धुआँ कम' : 'Reduces localized school-gate exhaust exposure',
        emissionsSaved: isHi ? '~4–8 kg CO2 और ~2 g PM प्रति सप्ताह (अनुमानित)' : '~4–8 kg CO2 & ~2 g PM per week (approximate)',
        healthReasoning: isHi
          ? 'स्कूल गेट पर चालू इंजन सीधे बच्चों की ऊँचाई पर एग्ज़ॉस्ट छोड़ते हैं।'
          : 'Idling vehicles release concentrated exhaust directly at children’s breathing height.',
        assumptions: isHi
          ? 'अनुमानित: सप्ताह में 2 कारपूल ट्रिप + 10 मिनट दैनिक आइडलिंग बचत।'
          : 'Approximate: assumes 2 carpooled commutes/week plus avoiding 10 min/day engine idling.',
        isApproximate: true,
      },
    },
    {
      id: 'sustain-community',
      title: isHi ? 'कचरा/पत्ते जलाने से रोकथाम और RWA कार्रवाई' : 'Zero waste burning & RWA dust control',
      timing: isHi ? 'इस सप्ताह सामुदायिक कदम' : 'Weekly neighbourhood action',
      actionSteps: isHi
        ? [
            'सूखे पत्ते या कचरा जलाने के बजाय कम्पोस्ट करें और खुले में धुआँ दिखने पर स्थानीय नगर निगम ऐप पर रिपोर्ट करें।',
            'RWA या स्कूल समूह के साथ निर्माण धूल पर पानी छिड़काव की माँग साझा करें।',
          ]
        : [
            'Compost dry garden leaves instead of burning them; report open waste fires to municipal helplines.',
            'Coordinate with your RWA or school group to request wet-sweeping and covered construction material.',
          ],
      whoItAppliesTo: isHi ? 'RWA और पड़ोस समुदाय' : 'RWA & neighbourhood group',
      impact: {
        pm25ExposureReduction: isHi ? 'आसपास के ब्लॉक में शाम के धुएँ में बड़ी कमी' : 'Prevents acute evening smoke spikes across your block',
        emissionsSaved: isHi ? '~15–40 g PM2.5 प्रति खुले कचरे की आग रोकी गई (अनुमानित)' : '~15–40 g PM2.5 avoided per prevented waste fire (approximate)',
        healthReasoning: isHi
          ? 'खुले में प्लास्टिक और पत्ते जलाने से ज़हरीले डाइऑक्सिन और सूक्ष्म कण निकलते हैं।'
          : 'Open leaf and waste burning emits dense fine particulates and toxic organic compounds directly into residential lanes.',
        assumptions: isHi
          ? 'अनुमानित: 5 किग्रा खुले बायोमास/कचरे को जलने से रोकने का मानक उत्सर्जन गुणांक।'
          : 'Approximate: based on standard open-burning emission factors for ~5 kg dry yard/municipal waste.',
        isApproximate: true,
      },
    },
  ];

  return {
    generatedAtIso: new Date().toISOString(),
    source: 'rule-fallback',
    fallbackNotice,
    rightNowHeadline,
    rightNowSummary,
    bestOutdoorWindow: windows.bestWindowText,
    avoidOutdoorWindow: windows.worstWindowText,
    routine,
    indoorHacks,
    protectionGuidance: {
      summary: isHi
        ? unhealthy
          ? `AQI ${snapshot.aqi} पर सही फिट वाला N95/KN95 मास्क ज़रूरी है; कपड़े या ढीले सर्जिकल मास्क PM2.5 से पर्याप्त सुरक्षा नहीं देते।`
          : `AQI ${snapshot.aqi} पर संवेदनशील सदस्यों को व्यस्त सड़कों के पास मास्क रखना चाहिए।`
        : unhealthy
        ? `At AQI ${snapshot.aqi}, a properly sealed N95/KN95/KF94 respirator is essential outdoors; cloth and loose surgical masks let most PM2.5 leak around the edges.`
        : `At AQI ${snapshot.aqi}, keep fitted masks ready for sensitive household members near heavy traffic.`,
      memberAdvice,
      impact: {
        pm25ExposureReduction: isHi ? '~80–90% कम सांस के साथ PM2.5 (अनुमानित)' : '~80–90% reduction in inhaled PM2.5 outdoors (approximate)',
        emissionsSaved: isHi ? 'व्यक्तिगत स्वास्थ्य सुरक्षा' : 'Direct respiratory protection',
        healthReasoning: isHi
          ? 'N95 फ़िल्टर 0.3 माइक्रोन तक के 95% कण रोकते हैं, जिससे फेफड़ों में सूजन और अस्थमा अटैक का जोखिम घटता है।'
          : 'Properly fitted N95/KN95 media captures ≥95% of fine particulates, reducing airway inflammation and cardiovascular stress.',
        assumptions: isHi
          ? 'अनुमानित: चेहरे पर बिना गैप के सही फ़िट (रीयल-वर्ल्ड फ़िल्ट्रेशन 80–90%)।'
          : 'Approximate: reflects real-world fitted N95 filtration (80–90%) accounting for minor edge leakage.',
        isApproximate: true,
      },
    },
    sustainableAlternatives,
    medicalDisclaimer: isHi
      ? 'चिकित्सा अस्वीकरण: AirWise केवल सामान्य पर्यावरण और स्वास्थ्य जागरूकता मार्गदर्शन देता है, चिकित्सा सलाह नहीं। साँस फूलना, सीने में दर्द, घरघराहट या चक्कर आने पर तुरंत डॉक्टर से परामर्श लें।'
      : 'Health Notice: AirWise provides general environmental guidance, not medical advice. Consult a qualified doctor promptly if anyone experiences wheezing, shortness of breath, chest pain, or worsening asthma symptoms.',
  };
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatCalendarDateLabels(dateIso: string): {
  dayLabel: string;
  weekdayLabel: string;
} {
  const parts = dateIso.split('-').map((p) => Number(p));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return { dayLabel: dateIso, weekdayLabel: '' };
  }
  const [year, month, day] = parts;
  const dt = new Date(Date.UTC(year, month - 1, day));
  return {
    dayLabel: `${SHORT_MONTHS[dt.getUTCMonth()]} ${day}`,
    weekdayLabel: SHORT_WEEKDAYS[dt.getUTCDay()],
  };
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseUtcDateIso(dateIso: string): Date | null {
  if (!ISO_DATE_RE.test(dateIso)) return null;
  const [y, m, d] = dateIso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return dt;
}

export function shiftDateIso(dateIso: string, deltaDays: number): string {
  const dt = parseUtcDateIso(dateIso) ?? new Date();
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

/**
 * Computes an inclusive YYYY-MM-DD date range ending on `endDateIso` (default: today UTC).
 * Example: days=7 ending 2026-11-25 -> { startDate: '2026-11-19', endDate: '2026-11-25' }.
 */
export function computePresetDateRange(
  days: number,
  endDateIso?: string
): { startDate: string; endDate: string } {
  const clampedDays = Math.max(1, Math.min(90, Math.round(days)));
  const endDate = endDateIso && parseUtcDateIso(endDateIso)
    ? endDateIso
    : new Date().toISOString().slice(0, 10);
  const startDate = shiftDateIso(endDate, -(clampedDays - 1));
  return { startDate, endDate };
}

export interface DateRangeValidationResult {
  valid: boolean;
  dayCount: number;
  errorEn?: string;
  errorHi?: string;
}

/**
 * Validates a custom [startDate, endDate] range against maxDays and today's cutoff.
 */
export function validateDateRange(
  startDate: string,
  endDate: string,
  maxDays = 90,
  todayIso?: string
): DateRangeValidationResult {
  const startDt = parseUtcDateIso(startDate);
  const endDt = parseUtcDateIso(endDate);
  if (!startDt || !endDt) {
    return {
      valid: false,
      dayCount: 0,
      errorEn: 'Please select valid start and end dates.',
      errorHi: 'कृपया मान्य प्रारंभ और समाप्ति तिथियाँ चुनें।',
    };
  }

  const cutoffIso = todayIso && parseUtcDateIso(todayIso)
    ? todayIso
    : new Date().toISOString().slice(0, 10);
  const cutoffDt = parseUtcDateIso(cutoffIso)!;

  if (startDt.getTime() > endDt.getTime()) {
    return {
      valid: false,
      dayCount: 0,
      errorEn: 'Start date must be on or before end date.',
      errorHi: 'प्रारंभ तिथि समाप्ति तिथि से पहले या बराबर होनी चाहिए।',
    };
  }

  if (endDt.getTime() > cutoffDt.getTime()) {
    return {
      valid: false,
      dayCount: 0,
      errorEn: 'End date cannot be in the future.',
      errorHi: 'समाप्ति तिथि भविष्य की नहीं हो सकती।',
    };
  }

  const dayCount = Math.round((endDt.getTime() - startDt.getTime()) / 86_400_000) + 1;
  if (dayCount > maxDays) {
    return {
      valid: false,
      dayCount,
      errorEn: `Please choose a range of up to ${maxDays} days.`,
      errorHi: `कृपया अधिकतम ${maxDays} दिनों की अवधि चुनें।`,
    };
  }

  return { valid: true, dayCount };
}

/**
 * Aggregates hourly AQI & PM2.5 arrays strictly within [startDateIso, endDateIso] (inclusive).
 */
export function aggregateHourlyToDailyRange(
  times: string[],
  hAqi: Array<number | null | undefined>,
  hPm25: Array<number | null | undefined>,
  startDateIso: string,
  endDateIso: string
): DailyHistoryPoint[] {
  const buckets = new Map<string, { aqis: number[]; pm25s: number[] }>();

  for (let i = 0; i < times.length; i++) {
    const rawTime = times[i];
    if (typeof rawTime !== 'string' || rawTime.length < 10) continue;
    const dateIso = rawTime.slice(0, 10);
    if (dateIso < startDateIso || dateIso > endDateIso) continue;

    const aqiVal = Number(hAqi[i]);
    const pm25Val = Number(hPm25[i]);
    const hasAqi = hAqi[i] !== null && hAqi[i] !== undefined && Number.isFinite(aqiVal);
    const hasPm25 = hPm25[i] !== null && hPm25[i] !== undefined && Number.isFinite(pm25Val);
    if (!hasAqi && !hasPm25) continue;

    let bucket = buckets.get(dateIso);
    if (!bucket) {
      bucket = { aqis: [], pm25s: [] };
      buckets.set(dateIso, bucket);
    }
    if (hasAqi) bucket.aqis.push(Math.max(0, aqiVal));
    if (hasPm25) bucket.pm25s.push(Math.max(0, pm25Val));
  }

  const sortedDates = Array.from(buckets.keys()).sort();
  return sortedDates.map((dateIso) => {
    const bucket = buckets.get(dateIso)!;
    const avgAqi =
      bucket.aqis.length > 0
        ? Math.round(bucket.aqis.reduce((s, v) => s + v, 0) / bucket.aqis.length)
        : 0;
    const maxAqi = bucket.aqis.length > 0 ? Math.round(Math.max(...bucket.aqis)) : avgAqi;
    const minAqi = bucket.aqis.length > 0 ? Math.round(Math.min(...bucket.aqis)) : avgAqi;
    const avgPm25 =
      bucket.pm25s.length > 0
        ? Math.round((bucket.pm25s.reduce((s, v) => s + v, 0) / bucket.pm25s.length) * 10) / 10
        : 0;
    const maxPm25 =
      bucket.pm25s.length > 0 ? Math.round(Math.max(...bucket.pm25s) * 10) / 10 : avgPm25;
    const { dayLabel, weekdayLabel } = formatCalendarDateLabels(dateIso);

    return {
      dateIso,
      dayLabel,
      weekdayLabel,
      avgAqi,
      maxAqi,
      minAqi,
      avgPm25,
      maxPm25,
      whoExceedanceRatio: Math.round((avgPm25 / 15) * 10) / 10,
    };
  });
}

/**
 * Aggregates hourly AQI & PM2.5 arrays (e.g. from Open-Meteo with past_days=7)
 * into the past 7 calendar days ending on `todayDateIso` (or the latest observed day).
 */
export function aggregateHourlyToDailyHistory(
  times: string[],
  hAqi: Array<number | null | undefined>,
  hPm25: Array<number | null | undefined>,
  todayDateIso?: string
): DailyHistoryPoint[] {
  const cutoffDate = todayDateIso || new Date().toISOString().slice(0, 10);
  const allUntilCutoff = aggregateHourlyToDailyRange(
    times,
    hAqi,
    hPm25,
    '1970-01-01',
    cutoffDate
  );
  return allUntilCutoff.slice(-7);
}

export interface HistoryTrendSummary {
  avgAqi7d: number;
  avgPm257d: number;
  aqiDeltaPct: number; // negative = improving (lower AQI), positive = worsening
  pm25DeltaPct: number;
  trendDirection: 'improving' | 'worsening' | 'stable';
  cleanestDay: DailyHistoryPoint | null;
  worstDay: DailyHistoryPoint | null;
  daysBelowThreshold: number;
  daysMeetingWhoPm25: number;
}

/**
 * Computes 7-day trend summary comparing the most recent 3 days against the earlier 4 days
 * to show whether air quality is improving, worsening, or holding steady.
 */
export function analyzeHistoryTrend(
  history: DailyHistoryPoint[],
  alertThreshold: number
): HistoryTrendSummary {
  if (!history || history.length === 0) {
    return {
      avgAqi7d: 0,
      avgPm257d: 0,
      aqiDeltaPct: 0,
      pm25DeltaPct: 0,
      trendDirection: 'stable',
      cleanestDay: null,
      worstDay: null,
      daysBelowThreshold: 0,
      daysMeetingWhoPm25: 0,
    };
  }

  const avgAqi7d = Math.round(
    history.reduce((sum, d) => sum + d.avgAqi, 0) / history.length
  );
  const avgPm257d =
    Math.round(
      (history.reduce((sum, d) => sum + d.avgPm25, 0) / history.length) * 10
    ) / 10;

  let cleanestDay = history[0];
  let worstDay = history[0];
  let daysBelowThreshold = 0;
  let daysMeetingWhoPm25 = 0;

  for (const day of history) {
    if (day.avgAqi < cleanestDay.avgAqi) cleanestDay = day;
    if (day.avgAqi > worstDay.avgAqi) worstDay = day;
    if (day.avgAqi <= alertThreshold) daysBelowThreshold++;
    if (day.avgPm25 <= 15) daysMeetingWhoPm25++;
  }

  const splitIdx = Math.max(1, Math.floor(history.length / 2));
  const earlier = history.slice(0, splitIdx);
  const recent = history.slice(splitIdx);

  const earlierAqi = earlier.reduce((s, d) => s + d.avgAqi, 0) / earlier.length;
  const recentAqi = recent.reduce((s, d) => s + d.avgAqi, 0) / recent.length;
  const earlierPm = earlier.reduce((s, d) => s + d.avgPm25, 0) / earlier.length;
  const recentPm = recent.reduce((s, d) => s + d.avgPm25, 0) / recent.length;

  const aqiDeltaPct =
    earlierAqi > 0 ? Math.round(((recentAqi - earlierAqi) / earlierAqi) * 100) : 0;
  const pm25DeltaPct =
    earlierPm > 0 ? Math.round(((recentPm - earlierPm) / earlierPm) * 100) : 0;

  let trendDirection: 'improving' | 'worsening' | 'stable' = 'stable';
  if (aqiDeltaPct <= -5) trendDirection = 'improving';
  else if (aqiDeltaPct >= 5) trendDirection = 'worsening';

  return {
    avgAqi7d,
    avgPm257d,
    aqiDeltaPct,
    pm25DeltaPct,
    trendDirection,
    cleanestDay,
    worstDay,
    daysBelowThreshold,
    daysMeetingWhoPm25,
  };
}

export interface HistoryTooltipMetrics {
  aqiDeltaFromPrev: number | null;
  pm25DeltaFromPrev: number | null;
  exceedsThreshold: boolean;
  thresholdDelta: number;
  whoMultiple: number;
}

/**
 * Pure metrics calculator for the interactive Recharts history tooltip,
 * computing exact day-over-day AQI & PM2.5 deltas, household threshold delta, and WHO 24h ratio.
 */
export function buildHistoryTooltipMetrics(
  point: DailyHistoryPoint,
  prevPoint: DailyHistoryPoint | null,
  threshold: number
): HistoryTooltipMetrics {
  const aqiDeltaFromPrev = prevPoint ? Math.round(point.avgAqi - prevPoint.avgAqi) : null;
  const pm25DeltaFromPrev = prevPoint
    ? Math.round((point.avgPm25 - prevPoint.avgPm25) * 10) / 10
    : null;
  const thresholdDelta = Math.round(point.avgAqi - threshold);
  const whoMultiple = Math.round((point.avgPm25 / 15) * 10) / 10;

  return {
    aqiDeltaFromPrev,
    pm25DeltaFromPrev,
    exceedsThreshold: point.avgAqi > threshold,
    thresholdDelta,
    whoMultiple,
  };
}
