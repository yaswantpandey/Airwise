import type { LanguageCode } from './types';

export interface Translations {
  navNow: string;
  navHistory: string;
  navPlan: string;
  navAssistant: string;
  navTracker: string;
  navCommunity: string;
  profileBtn: string;
  searchPlaceholder: string;
  locateMe: string;
  rightNowTitle: string;
  bestWindowLabel: string;
  peakSmogLabel: string;
  forecastTitle: string;
  forecast24h: string;
  forecast48h: string;
  pollutantsTitle: string;
  weatherTitle: string;
  inversionLabel: string;
  inversionLow: string;
  inversionModerate: string;
  inversionHigh: string;
  generatePlanBtn: string;
  regeneratingPlan: string;
  routineHeading: string;
  indoorHeading: string;
  protectionHeading: string;
  sustainableHeading: string;
  whyThisMatters: string;
  approximateTag: string;
  exposureReductionLabel: string;
  emissionsSavedLabel: string;
  healthReasonLabel: string;
  assumptionsLabel: string;
  memberAdviceHeading: string;
  assistantTitle: string;
  assistantSubtitle: string;
  assistantPlaceholder: string;
  assistantSend: string;
  trackerTitle: string;
  trackerSubtitle: string;
  logActionHeading: string;
  weeklyExposureLabel: string;
  weeklyCo2Label: string;
  weeklyPmLabel: string;
  streakLabel: string;
  recentLogsHeading: string;
  communityTitle: string;
  communitySubtitle: string;
  challengeProgress: string;
  communityTipsHeading: string;
  leaderboardHeading: string;
  privacyNoticeLeaderboard: string;
  alertsTitle: string;
  offlineBanner: string;
  signInGoogle: string;
  signOut: string;
  syncSavedCloud: string;
  demoModeNotice: string;
  deleteMyDataBtn: string;
  deleteConfirmTitle: string;
  deleteConfirmBody: string;
  cancel: string;
  confirmDelete: string;
  onboardingTitle: string;
  stepBack: string;
  stepNext: string;
  saveProfile: string;
  historyTitle: string;
  historySubtitle: string;
  historyViewCombined: string;
  historyViewAqi: string;
  historyViewPm25: string;
  historyAvgAqiLabel: string;
  historyAvgPm25Label: string;
  historyCleanestDayLabel: string;
  historySafeDaysLabel: string;
  historyBreakdownTitle: string;
  historyRange7d: string;
  historyRange14d: string;
  historyRange30d: string;
  historyFromLabel: string;
  historyToLabel: string;
  historyApplyRange: string;
}

const EN: Translations = {
  navNow: 'Now',
  navHistory: 'History',
  navPlan: 'Daily Plan',
  navAssistant: 'Assistant',
  navTracker: 'Impact',
  navCommunity: 'Community',
  profileBtn: 'Household',
  searchPlaceholder: 'Search city or area (e.g., Delhi, Mumbai)',
  locateMe: 'Use my location',
  rightNowTitle: 'What should I do right now?',
  bestWindowLabel: 'Best lower-smog window',
  peakSmogLabel: 'Peak smog window',
  forecastTitle: 'Air Quality Forecast',
  forecast24h: '24 Hours',
  forecast48h: '48 Hours',
  pollutantsTitle: 'Live Pollutants',
  weatherTitle: 'Weather & Dispersion',
  inversionLabel: 'Temperature Inversion',
  inversionLow: 'Low trapping',
  inversionModerate: 'Moderate trapping',
  inversionHigh: 'High smog trapping',
  generatePlanBtn: 'Refresh AI Plan',
  regeneratingPlan: 'Generating personalized plan...',
  routineHeading: 'Low-Emission Daily Routine',
  indoorHeading: 'Indoor Air Quality Hacks',
  protectionHeading: 'Protection Guidance by Family Member',
  sustainableHeading: 'Sustainable Alternatives',
  whyThisMatters: 'Why this matters',
  approximateTag: 'Approximate estimate',
  exposureReductionLabel: 'Est. PM2.5 Exposure Reduction',
  emissionsSavedLabel: 'Est. Emissions Saved',
  healthReasonLabel: 'Health Reasoning',
  assumptionsLabel: 'Transparent Assumptions',
  memberAdviceHeading: 'Tailored by Household Member',
  assistantTitle: 'Ask AirWise',
  assistantSubtitle:
    'Ask practical questions grounded in your live AQI forecast and household profile.',
  assistantPlaceholder: 'Ask e.g., "Can my 6-year-old play outside at 5 PM?"',
  assistantSend: 'Ask',
  trackerTitle: 'Clean-Air Impact Tracker',
  trackerSubtitle:
    'Log daily protective and low-emission actions to track your weekly exposure avoided, emissions saved, and streak.',
  logActionHeading: 'Log a completed action',
  weeklyExposureLabel: 'Weekly PM2.5 Avoided',
  weeklyCo2Label: 'Weekly CO2 Saved',
  weeklyPmLabel: 'Weekly PM Avoided',
  streakLabel: 'Active Streak',
  recentLogsHeading: 'Recent Logged Actions',
  communityTitle: 'Community Clean-Air Mode',
  communitySubtitle:
    'Neighbourhood, school, and RWA clean-air groups with shared challenges and zero personal data exposed.',
  challengeProgress: 'Shared Clean-Air Challenge',
  communityTipsHeading: 'Local Community Playbook',
  leaderboardHeading: 'Anonymized Household Leaderboard',
  privacyNoticeLeaderboard:
    'Privacy first: only household aliases and weekly totals appear here. No emails, addresses, or health data are shared.',
  alertsTitle: 'Personalized Air Alerts',
  offlineBanner: 'You appear offline — showing cached last-known AQI data and guidance.',
  signInGoogle: 'Sign in with Google',
  signOut: 'Sign out',
  syncSavedCloud: 'Cloud sync active',
  demoModeNotice: 'Demo mode — sign in anytime to sync across devices',
  deleteMyDataBtn: 'Delete My Data',
  deleteConfirmTitle: 'Delete all your AirWise data?',
  deleteConfirmBody:
    'This permanently erases your household profile, optional health flags, action logs, and community alias from both cloud storage and this browser.',
  cancel: 'Cancel',
  confirmDelete: 'Delete everything',
  onboardingTitle: 'Household Profile Setup',
  stepBack: 'Back',
  stepNext: 'Continue',
  saveProfile: 'Save Household Profile',
  historyTitle: 'Air Quality History',
  historySubtitle: 'Track daily PM2.5 and US AQI trends across 7, 14, 30 days, or any custom date range.',
  historyViewCombined: 'AQI + PM2.5',
  historyViewAqi: 'AQI Trend',
  historyViewPm25: 'PM2.5 Trend',
  historyAvgAqiLabel: 'Avg AQI',
  historyAvgPm25Label: 'Avg PM2.5',
  historyCleanestDayLabel: 'Cleanest Day',
  historySafeDaysLabel: 'Within Personal Limit',
  historyBreakdownTitle: 'Daily Air Quality Breakdown',
  historyRange7d: '7 Days',
  historyRange14d: '14 Days',
  historyRange30d: '30 Days',
  historyFromLabel: 'From',
  historyToLabel: 'To',
  historyApplyRange: 'Apply',
};

const HI: Translations = {
  navNow: 'अभी',
  navHistory: 'इतिहास',
  navPlan: 'दैनिक योजना',
  navAssistant: 'सहायक',
  navTracker: 'प्रभाव',
  navCommunity: 'समुदाय',
  profileBtn: 'परिवार प्रोफ़ाइल',
  searchPlaceholder: 'शहर या क्षेत्र खोजें (जैसे नई दिल्ली, गुरुग्राम, मुंबई)',
  locateMe: 'मेरी लोकेशन',
  rightNowTitle: 'मुझे अभी क्या करना चाहिए?',
  bestWindowLabel: 'सबसे कम स्मॉग समय',
  peakSmogLabel: 'अधिकतम स्मॉग समय',
  forecastTitle: 'वायु गुणवत्ता पूर्वानुमान',
  forecast24h: '24 घंटे',
  forecast48h: '48 घंटे',
  pollutantsTitle: 'लाइव प्रदूषक स्तर',
  weatherTitle: 'मौसम और हवा का फैलाव',
  inversionLabel: 'तापमान उलटाव (स्मॉग फँसाव)',
  inversionLow: 'कम फँसाव',
  inversionModerate: 'मध्यम फँसाव',
  inversionHigh: 'उच्च स्मॉग फँसाव',
  generatePlanBtn: 'AI योजना रीफ़्रेश करें',
  regeneratingPlan: 'व्यक्तिगत योजना बनाई जा रही है...',
  routineHeading: 'कम उत्सर्जन वाली दैनिक दिनचर्या',
  indoorHeading: 'घर की हवा साफ़ रखने के उपाय',
  protectionHeading: 'परिवार के प्रत्येक सदस्य के लिए सुरक्षा मार्गदर्शन',
  sustainableHeading: 'टिकाऊ और स्वच्छ विकल्प',
  whyThisMatters: 'यह क्यों ज़रूरी है',
  approximateTag: 'अनुमानित आँकड़ा',
  exposureReductionLabel: 'अनुमानित PM2.5 संपर्क कमी',
  emissionsSavedLabel: 'अनुमानित उत्सर्जन बचत',
  healthReasonLabel: 'स्वास्थ्य कारण',
  assumptionsLabel: 'पारदर्शी मान्यताएँ',
  memberAdviceHeading: 'सदस्य के अनुसार सलाह',
  assistantTitle: 'AirWise से पूछें',
  assistantSubtitle:
    'लाइव AQI पूर्वानुमान और आपके परिवार की प्रोफ़ाइल के आधार पर व्यावहारिक प्रश्न पूछें।',
  assistantPlaceholder: 'पूछें जैसे, "क्या मेरा 6 साल का बच्चा शाम 5 बजे बाहर खेल सकता है?"',
  assistantSend: 'पूछें',
  trackerTitle: 'स्वच्छ वायु प्रभाव ट्रैकर',
  trackerSubtitle:
    'अपने साप्ताहिक बचे हुए PM2.5 संपर्क, CO2 बचत और स्ट्रीक को ट्रैक करने के लिए दैनिक कदम लॉग करें।',
  logActionHeading: 'पूरा किया गया कदम लॉग करें',
  weeklyExposureLabel: 'साप्ताहिक PM2.5 बचाव',
  weeklyCo2Label: 'साप्ताहिक CO2 बचत',
  weeklyPmLabel: 'साप्ताहिक PM बचत',
  streakLabel: 'सक्रिय स्ट्रीक',
  recentLogsHeading: 'हाल के लॉग किए गए कदम',
  communityTitle: 'सामुदायिक स्वच्छ वायु मोड',
  communitySubtitle:
    'पड़ोस, स्कूल और RWA समूहों के साथ साझा स्वच्छ-वायु चुनौतियाँ — बिना कोई व्यक्तिगत डेटा साझा किए।',
  challengeProgress: 'साझा स्वच्छ वायु चुनौती',
  communityTipsHeading: 'स्थानीय सामुदायिक सुझाव',
  leaderboardHeading: 'अनाम घरेलू लीडरबोर्ड',
  privacyNoticeLeaderboard:
    'गोपनीयता प्रथम: यहाँ केवल घरेलू उपनाम और साप्ताहिक आँकड़े दिखते हैं। ईमेल, पता या स्वास्थ्य जानकारी कभी साझा नहीं होती।',
  alertsTitle: 'व्यक्तिगत वायु चेतावनियाँ',
  offlineBanner: 'आप ऑफ़लाइन हैं — सहेजा गया अंतिम AQI डेटा और मार्गदर्शन दिखाया जा रहा है।',
  signInGoogle: 'Google से साइन इन करें',
  signOut: 'साइन आउट',
  syncSavedCloud: 'क्लाउड सिंक सक्रिय',
  demoModeNotice: 'डेमो मोड — सिंक करने के लिए कभी भी साइन इन करें',
  deleteMyDataBtn: 'मेरा डेटा हटाएँ',
  deleteConfirmTitle: 'क्या अपना पूरा AirWise डेटा हटाएँ?',
  deleteConfirmBody:
    'इससे आपकी परिवार प्रोफ़ाइल, स्वास्थ्य प्राथमिकताएँ, लॉग और सामुदायिक उपनाम क्लाउड व ब्राउज़र से स्थायी रूप से हट जाएँगे।',
  cancel: 'रद्द करें',
  confirmDelete: 'सब कुछ हटाएँ',
  onboardingTitle: 'परिवार प्रोफ़ाइल सेटअप',
  stepBack: 'पीछे',
  stepNext: 'आगे बढ़ें',
  saveProfile: 'प्रोफ़ाइल सहेजें',
  historyTitle: 'वायु गुणवत्ता इतिहास',
  historySubtitle: '7, 14, 30 दिन या किसी भी कस्टम अवधि में दैनिक PM2.5 और US AQI रुझान ट्रैक करें।',
  historyViewCombined: 'AQI + PM2.5',
  historyViewAqi: 'AQI रुझान',
  historyViewPm25: 'PM2.5 रुझान',
  historyAvgAqiLabel: 'औसत AQI',
  historyAvgPm25Label: 'औसत PM2.5',
  historyCleanestDayLabel: 'सबसे स्वच्छ दिन',
  historySafeDaysLabel: 'व्यक्तिगत सीमा के भीतर',
  historyBreakdownTitle: 'दैनिक वायु गुणवत्ता विवरण',
  historyRange7d: '7 दिन',
  historyRange14d: '14 दिन',
  historyRange30d: '30 दिन',
  historyFromLabel: 'से',
  historyToLabel: 'तक',
  historyApplyRange: 'लागू करें',
};

export function getTranslations(lang: LanguageCode): Translations {
  return lang === 'hi' ? HI : EN;
}
