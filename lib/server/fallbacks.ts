import { buildRuleBasedDailyPlan, findBestOutdoorWindows, getAqiBand } from '@/lib/air-quality';
import type { AirQualitySnapshot, HouseholdProfile, LanguageCode } from '@/lib/types';

export { buildRuleBasedDailyPlan };

export function buildChatFallbackAnswer(
  question: string,
  snapshot: Pick<
    AirQualitySnapshot,
    'locationName' | 'aqi' | 'pm25' | 'windKmh' | 'humidityPct' | 'hourly'
  >,
  profile: Pick<
    HouseholdProfile,
    'hasChildren' | 'hasElderly' | 'hasAsthmaOrRespiratory' | 'hasAirPurifier'
  >,
  language: LanguageCode
): string {
  const q = question.toLowerCase();
  const band = getAqiBand(snapshot.aqi);
  const windows = findBestOutdoorWindows(snapshot.hourly);
  const isHi = language === 'hi';

  const disclaimer = isHi
    ? 'यह AI/नियम-आधारित सामान्य मार्गदर्शन है, चिकित्सा सलाह नहीं—आधिकारिक CPCB/IMD/NDMA सलाह मानें और गंभीर साँस की समस्या में डॉक्टर या 112/108 पर संपर्क करें।'
    : 'General environmental guidance only (not medical advice)—follow official CPCB/IMD/NDMA advisories and consult a doctor or dial 112/108 for severe breathing symptoms.';

  if (q.includes('window') || q.includes('ventilat') || q.includes('खिड़क')) {
    if (snapshot.aqi > 150) {
      return isHi
        ? `${snapshot.locationName} में अभी AQI ${snapshot.aqi} (${band.labelHi}) और PM2.5 ${snapshot.pm25} µg/m³ है। अभी खिड़कियाँ बंद रखना बेहतर है। ${windows.bestWindowText} के बीच केवल 10 मिनट के लिए हल्का वेंटिलेशन करें। ${disclaimer}`
        : `Right now in ${snapshot.locationName}, AQI is ${snapshot.aqi} (${band.labelEn}, PM2.5 ${snapshot.pm25} µg/m³). Keep windows closed for now so winter smog does not build up indoors. Your cleanest brief 10-minute ventilation window is ${windows.bestWindowText}. Why this matters: sealing gaps during peaks cuts indoor PM2.5 infiltration by ~25–40% (approximate, assuming closed doors). ${disclaimer}`;
    }
    return isHi
      ? `अभी AQI ${snapshot.aqi} (${band.labelHi}) है, इसलिए 15–20 मिनट क्रॉस-वेंटिलेशन सुरक्षित है। ${disclaimer}`
      : `Current AQI in ${snapshot.locationName} is ${snapshot.aqi} (${band.labelEn}), so a 15–20 minute cross-ventilation window is safe right now, especially away from busy roads. ${disclaimer}`;
  }

  if (
    q.includes('play') ||
    q.includes('child') ||
    q.includes('kid') ||
    q.includes('बच्च') ||
    q.includes('खेल')
  ) {
    return isHi
      ? `${snapshot.locationName} में अभी AQI ${snapshot.aqi} (${band.labelHi}, PM2.5 ${snapshot.pm25} µg/m³) है। ${
          snapshot.aqi >= 151
            ? `बच्चों के लिए बाहर दौड़भाग टालें और खेल घर के अंदर रखें। यदि बाहर निकलना ज़रूरी हो तो कम प्रदूषण वाले समय (${windows.bestWindowText}) में बच्चों का फिट N95/KF94 मास्क पहनाएँ।`
            : `कम प्रदूषण वाले समय (${windows.bestWindowText}) में हल्का बाहरी खेल सुरक्षित है, व्यस्त सड़क से दूर रहें।`
        } ${disclaimer}`
      : `In ${snapshot.locationName}, live AQI is ${snapshot.aqi} (${band.labelEn}, PM2.5 ${snapshot.pm25} µg/m³). ${
          snapshot.aqi >= 151
            ? `Because children breathe faster per kg of body weight and your household flags children${
                profile.hasAsthmaOrRespiratory ? '/respiratory sensitivity' : ''
              }, move active play indoors today. If stepping out briefly, aim for ${windows.bestWindowText} with a child-sized fitted N95/KF94 mask.`
            : `Short outdoor play is reasonable during ${windows.bestWindowText} away from main traffic.`
        } Why this matters: shifting active play indoors on AQI 150+ days avoids roughly 60–80% of inhaled PM2.5 dose (approximate, assuming active play increases breathing rate 3–4x). ${disclaimer}`;
  }

  return isHi
    ? `${snapshot.locationName} में वर्तमान AQI ${snapshot.aqi} (${band.labelHi}), PM2.5 ${snapshot.pm25} µg/m³ और हवा की गति ${snapshot.windKmh} km/h है। सबसे बेहतर बाहरी समय ${windows.bestWindowText} है। ${
        snapshot.aqi >= 151
          ? 'बाहर जाने पर फिट N95 मास्क पहनें और घर के अंदर HEPA/गीले पोछे से हवा साफ़ रखें।'
          : 'सामान्य सावधानी के साथ बाहर गतिविधियाँ कर सकते हैं।'
      } ${disclaimer}`
    : `Based on live conditions in ${snapshot.locationName} (AQI ${snapshot.aqi} — ${band.labelEn}, PM2.5 ${snapshot.pm25} µg/m³, wind ${snapshot.windKmh} km/h): your lowest-exposure window is ${windows.bestWindowText}, while peak smog occurs around ${windows.worstWindowText}. ${
        snapshot.aqi >= 151
          ? `Wear a fitted N95/KN95 mask outdoors${
              profile.hasAirPurifier
                ? ' and run your bedroom HEPA purifier with doors closed'
                : ' and create one closed, wet-mopped clean-air room indoors'
            }.`
          : 'Light outdoor routines are manageable; sensitive members should still avoid heavy traffic corridors.'
      } Why this matters: timing trips to cleaner hours and using N95/HEPA protection reduces daily PM2.5 exposure by ~50–80% (approximate). ${disclaimer}`;
}
