import type {
  AirAlertItem,
  AirQualitySnapshot,
  AqiBandInfo,
  HourlyForecastPoint,
  HouseholdProfile,
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
    hex: '#92400E',
    badgeTextClass: 'text-amber-900 dark:text-amber-200',
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
    badgeTextClass: 'text-orange-900 dark:text-orange-200',
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
    badgeTextClass: 'text-rose-900 dark:text-rose-200',
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
    badgeTextClass: 'text-purple-900 dark:text-purple-200',
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
