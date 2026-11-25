# AirWise — GenAI-Powered Urban Air Quality Assistant

AirWise helps families and communities navigate severe winter smog and urban air pollution by turning live AQI, pollutant levels, and 48-hour dispersion forecasts into personalized, explainable daily routines, indoor air hacks, mask guidance, impact tracking, and neighbourhood clean-air challenges.

---

## 1. Architecture Overview

```
Browser (PWA · React 19 · Tailwind CSS v4 · Recharts · Offline LocalStorage Cache)
   │
   ├── GET /api/aqi?city=&lat=&lon=   ──► Rate Limiter + 10m Server Cache ──► Open-Meteo AQI & Weather API
   │                                                                          (Deterministic winter-smog fallback)
   ├── POST /api/plan                 ──► Zod Validation + Rate Limiter   ──► Gemini API (gemini-4-hydrogen)
   │                                                                          Strict JSON responseSchema + Rule fallback
   ├── POST /api/chat                 ──► Prompt-Injection Guard + Zod    ──► Gemini API (gemini-4-hydrogen)
   │                                                                          Grounded in live AQI + Household context
   └── Firebase Auth (Google Sign-In) & Cloud Firestore
        ├── /households/{uid}                         (Owner-only private profile & health consent)
        ├── /households/{uid}/actionLogs/{logId}      (Owner-only clean-air habit logs)
        └── /communityGroups/{groupId}/contributions  (Zero-PII anonymized leaderboard)
```

### Stack Justification
- **Next.js 15 App Router (Node.js full-stack)**: Combines a responsive React 19 PWA frontend with server-side API route proxies (`app/api/*`) in a single deployable Node.js service, keeping `GEMINI_API_KEY` strictly on the server while delivering fast SSR first paint for low-bandwidth networks.
- **Open-Meteo Air Quality & Weather**: Free, open, zero-key global hourly particulate (`PM2.5`, `PM10`, `NO2`, `O3`, `CO`, `US AQI`) and meteorological dispersion (`temperature`, `humidity`, `wind speed`) forecasts with automatic server caching and deterministic demo fallbacks.
- **Firebase Auth & Cloud Firestore**: Provides owner-isolated cloud sync for household profiles, action logs, and zero-PII community challenges, enforced via ESLint-verified `firestore.rules` (while Demo Mode works immediately without login).

---

## 2. Folder Structure

```
/
├── app/
│   ├── api/
│   │   ├── aqi/route.ts              # Cached, rate-limited Open-Meteo AQI & weather proxy
│   │   ├── plan/route.ts             # Server-side Gemini structured JSON daily plan + rule fallback
│   │   └── chat/route.ts             # Prompt-injection-hardened conversational assistant
│   ├── globals.css                   # Tailwind v4 + custom dark variant + tabular typography
│   ├── layout.tsx                    # Root layout, Plus Jakarta Sans / Public Sans / IBM Plex Mono
│   ├── manifest.ts                   # PWA Web App Manifest
│   └── page.tsx                      # SSR entry point
├── components/
│   ├── AirWiseApp.tsx                # Main shell, 3-zone header, location/lang/theme controls, sync
│   ├── NowDashboard.tsx              # One-screen "What should I do right now?", alerts, 48h chart
│   ├── DailyPlanView.tsx             # Routine, indoor hacks, per-member table, Impact Explainers
│   ├── AssistantView.tsx             # Grounded family Q&A chat interface
│   ├── ImpactTrackerView.tsx         # Weekly PM2.5/CO2/PM tracker, streak, action logger
│   ├── CommunityView.tsx             # RWA/School/Neighbourhood groups & zero-PII leaderboard
│   ├── HouseholdProfileModal.tsx     # 4-step onboarding, explicit health consent, Delete My Data
│   ├── AqiCategoryIcon.tsx           # Color-blind-safe geometric AQI icons
│   ├── PWAInstallButton.tsx          # Chromium beforeinstallprompt + iOS Safari install guide
│   └── ErrorBoundary.tsx             # Runtime error boundary
├── hooks/
│   └── use-pwa.ts                    # PWA install & online/offline connectivity hooks
├── lib/
│   ├── types.ts                      # Domain TypeScript types
│   ├── air-quality.ts                # Pure AQI bands, windows, alerts, stats, fallback engine
│   ├── air-quality.test.ts           # Node unit tests (`node:test`)
│   ├── genai-prompts.ts              # System prompts, Gemini responseSchema, Zod validators
│   ├── seed-data.ts                  # Winter smog seed cities, actions, demo community groups
│   ├── i18n.ts                       # English & Hindi (Devanagari) UI translations
│   ├── rate-limit.ts                 # Sliding-window per-IP API rate limiter
│   └── firebase.ts                   # Firebase Auth, Firestore CRUD, Delete My Data
├── public/                           # SVG & PNG PWA icons (180, 192, 512, maskable)
├── firebase-blueprint.json           # Firestore entity & collection schema blueprint
├── firestore.rules                   # Eight-Pillars hardened Firestore security rules
├── security_spec.md                  # Phase 0 adversarial security specification
├── Dockerfile                        # Multi-stage standalone Node 20 container
└── .env.example                      # Environment variable template
```

---

## 3. GenAI System Prompts & Structured Schema

The exact prompts and `@google/genai` `responseSchema` live in [`lib/genai-prompts.ts`](lib/genai-prompts.ts):
- **`DAILY_PLAN_SYSTEM_PROMPT`**: Grounds every recommendation in the provided JSON context (live AQI, pollutants, weather, inversion risk, 48h windows, household members/home equipment), requires transparent `approximate` estimates with explicit assumptions, and enforces the non-medical-advice health boundary.
- **`DAILY_PLAN_RESPONSE_SCHEMA` + `DailyPlanOutputZod`**: Forces deterministic structured JSON output (`rightNowHeadline`, `routine[]`, `indoorHacks[]`, `protectionGuidance.memberAdvice[]`, `sustainableAlternatives[]`, each carrying a structured `impact` explainer object).
- **`CHAT_ASSISTANT_SYSTEM_PROMPT`**: Isolates untrusted user text inside `<user_question>...</user_question>` tags, refuses instruction-override / prompt-injection attempts, and grounds answers strictly in live AQI and household profile.

---

## 4. API Routes & Examples

### `GET /api/aqi?city=New+Delhi` (or `?lat=28.61&lon=77.21`)
- **Response (`200 OK`)**:
```json
{
  "locationName": "New Delhi",
  "region": "Delhi NCR",
  "aqi": 268,
  "pm25": 192,
  "pm10": 298,
  "no2": 68,
  "o3": 38,
  "co": 1.9,
  "temperatureC": 14,
  "humidityPct": 76,
  "windKmh": 4.8,
  "inversionRisk": "high",
  "hourly": [{ "hourLabel": "14:00", "aqi": 182, "pm25": 130.6 }]
}
```

### `POST /api/plan`
- **Request**: `{ "language": "en", "snapshot": { ... }, "profile": { ... } }`
- **Response (`200 OK`)**: Schema-validated `DailyPlanResponse` (`source: "gemini-ai"` or transparent `"rule-fallback"` when API key is absent/unreachable).

### `POST /api/chat`
- **Request**: `{ "message": "Can my 6-year-old play outside at 5 PM?", "language": "en", "history": [], "snapshot": { ... }, "profile": { ... } }`
- **Response (`200 OK`)**: `{ "reply": "...", "source": "gemini-ai", "groundedAqi": 268 }`

---

## 5. Setup, Run & Deployment

### Local Development
```bash
cp .env.example .env.local
# Add GEMINI_API_KEY in .env.local (optional — demo/fallback mode works without keys)
npm install
npm run dev
```

### Unit Tests & Verification
```bash
npx --yes tsx --test lib/air-quality.test.ts
npm run lint
npm run build
```

### Docker Deployment
```bash
docker build -t airwise .
docker run -p 3000:3000 -e GEMINI_API_KEY="your_key" airwise
```

### Vercel / Render Deployment
1. Push repository to GitHub.
2. Connect repo in Vercel or Render (`Build Command: npm run build`, `Start Command: npm run start`).
3. Set `GEMINI_API_KEY` (server-only secret) and `APP_URL` in platform environment variables.

---

## 6. OWASP Top 10 Security & Privacy Checklist
- [x] **Secrets Boundary**: `GEMINI_API_KEY` is accessed strictly server-side in `app/api/*`; never exposed to the browser.
- [x] **Input Validation**: All API payloads and query parameters validated via strict Zod schemas with length/range caps.
- [x] **Prompt Injection Defense**: Untrusted chat text sanitized, screened for override patterns, and delimited inside `<user_question>` tags with strict system instructions.
- [x] **Rate Limiting**: Sliding-window per-IP rate limiting across `/api/aqi`, `/api/plan`, and `/api/chat`.
- [x] **Security Headers**: `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and `Strict-Transport-Security` configured in `next.config.ts`.
- [x] **Access Control & PII Isolation**: Owner-only Firestore rules (`request.auth.uid == userId`, `email_verified == true`, strict `hasOnly()` schemas), zero PII in community leaderboards.
- [x] **Health Data Privacy**: Minimal optional flags, explicit consent gate, and one-click **Delete My Data** erasing both Firestore and local cache.

---

## 7. Quick Demo Script
1. Open AirWise — observe the one-screen **"What should I do right now?"** summary, color-blind-safe AQI band, inversion alert, and 24–48h forecast chart.
2. Switch cities (e.g., **New Delhi** → **Bengaluru**) or click **Use my location**; toggle **हिन्दी / English** and **Light / Dark** mode.
3. Click **Household** to step through the 4-step onboarding profile and save.
4. Open **Daily Plan** to inspect tailored routine, indoor air hacks, per-member protection table, and expandable **"Why this matters"** impact explainers.
5. Open **Assistant** and tap *"Can my 6-year-old play outside at 5 PM?"*.
6. Open **Impact** to log *"Took Metro"* or *"Wore Fitted N95"* and watch weekly exposure avoided, CO2 saved, and streak update live.
7. Open **Community** to inspect neighbourhood/school/RWA challenges and the zero-PII household leaderboard.

---

## 8. Limitations & Future Improvements
- **Approximate Impact Math**: Exposure reduction and CO2/PM savings are transparent educational estimates, not clinical dosimetry.
- **Sensor Density**: Open-Meteo combines regional atmospheric models and ground stations; hyper-local street-corner spikes (e.g., beside construction) can exceed grid averages.
- **Future Work**: Web Push notifications via service worker for threshold crossings, multi-station CPCB/OpenAQ sensor fusion, and offline background sync for logged habits.
