# Security Policy & Architecture — AirWise

## 1. Security Architecture Overview

AirWise is a Next.js App Router web application that surfaces urban air quality telemetry (via Open-Meteo), provides optional Google Firebase Authentication & Firestore sync for household preferences, and generates personalized air-quality guidance via server-side Gemini API routes (`/api/plan` and `/api/chat`).

### Core Security Controls

1. **Server-Only Secrets & Environment Boundaries**
   - `GEMINI_API_KEY` is accessed strictly on the server inside `lib/server/gemini.ts` and is never exposed via `NEXT_PUBLIC_*` variables or client bundles.
   - Startup model validation (`lib/server/config.ts`) verifies `GEMINI_MODEL` against an allowlist and fails loudly if a deprecated or invalid model ID is configured.

2. **Strict Input Validation & 50 KB Body Cap**
   - All API routes validate query parameters and JSON payloads with strict Zod schemas (`lib/server/schemas.ts`), enforcing explicit enums, numeric ranges, array length bounds, and string max lengths.
   - POST endpoints (`/api/plan`, `/api/chat`) enforce a strict 50 KB UTF-8 body size limit (`readJsonBodyWithLimit` in `lib/server/http.ts`) before JSON parsing, returning `413 Payload Too Large` on oversized inputs.
   - Validation and unexpected server errors return generic error messages accompanied by an opaque `requestId` (`X-Request-Id` header) — internal `error.message` details and schema internals are never leaked to clients.

3. **CORS Allowlist & Rate Limiting**
   - All API routes enforce an explicit Origin allowlist (`localhost:3000`, `127.0.0.1:3000`, `APP_URL`, and `ALLOWED_ORIGINS` env variable, plus same-host requests) and return `403` for untrusted cross-origin requests.
   - Sliding-window per-IP rate limiting (`lib/rate-limit.ts`) applies stricter caps to AI endpoints (`/api/plan`: 12/min, `/api/chat`: 18/min) than telemetry reads (`/api/aqi`: 45/min, `/api/aqi/history`: 40/min), returning `429` with `Retry-After: 60`.

4. **Prompt-Injection Defense & Output Validation**
   - User questions and recent conversation history are length-capped, stripped of control characters, screened by `detectPromptInjection()`, and wrapped in explicit `<context_json>`, `<recent_conversation>`, and `<user_question>` delimiters with `<` and `>` characters neutralized (`neutralizePromptDelimiters`).
   - System prompts explicitly instruct the model to treat delimited text strictly as untrusted data and enforce health-safety boundaries (no outdoor running advice during AQI >= 151, no medical diagnoses/prescriptions, official CPCB/IMD/NDMA + 112/108 notices).
   - Structured JSON responses from `/api/plan` are parsed and validated against `DailyPlanOutputZod` via `callGeminiJsonWithFallback()`; malformed or invalid outputs seamlessly fall back to deterministic rule-based guidance.
   - Every Gemini and Open-Meteo request uses an `AbortController` timeout (`GEMINI_TIMEOUT_MS` default 15s; `UPSTREAM_TIMEOUT_MS` default 5s).

5. **HTTP Security Headers & Content Security Policy**
   - Configured in `next.config.ts`:
     - `Content-Security-Policy` restricting scripts, frames, objects, form actions, and external connections to `'self'`, Firebase Auth/Firestore, Google Identity, and Open-Meteo endpoints.
     - `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`.
     - `poweredByHeader: false`.

6. **Database Access Control (Firestore Rules)**
   - `firestore.rules` enforces default-deny access, strict owner-only reads/writes on `/users/{userId}` and `/users/{userId}/actionLogs/{logId}`, field-level schema validation, and anonymous non-PII community summaries under `/communityGroups/{groupId}/contributions/{userId}`.

---

## 2. Dependency Audit Summary (`bun audit`)

Last audit checked against `bun.lock`: **11 transitive advisories (3 high, 7 moderate, 1 low)**, all inside framework/Firebase transitive sub-dependencies:

| Package | Severity | Path | Risk Assessment & Mitigation |
| --- | --- | --- | --- |
| `@grpc/grpc-js` (`<= 1.14.2`) | High | `firebase` -> `@firebase/firestore` -> `@grpc/grpc-js` | Node gRPC transport inside Firebase SDK; AirWise runs Firestore in the browser over HTTPS/WebChannel, not a public Node gRPC server. |
| `minimatch` (`< 10.2.3`) | High | `eslint` / `eslint-config-next` (dev-only) | Build/lint tooling only; never shipped to production runtime. |
| `glob` (`10.2.0–10.4.5`) | High | `eslint-config-next` (dev-only) | Build/lint tooling only; never shipped to production runtime. |
| `postcss` (`8.4.31`) | Moderate | Transitive legacy copy bundled inside `next@15.4.9` | Direct `postcss` is already `8.5.33`; AirWise never parses untrusted user-supplied CSS. |
| `postcss-selector-parser` (`<= 6.0.10`) | Moderate | Dev/build CSS pipeline | Build-time only; no untrusted CSS input. |
| `@opentelemetry/core` / `uuid` | Moderate / Low | Transitive SDK telemetry packages | Not exposed to untrusted input; monitor upstream Firebase/Next.js minor releases for updates. |

---

## 3. Secret Hygiene Verification

- Verified zero hardcoded API keys, private keys, or secrets across `app/`, `components/`, `hooks/`, `lib/`, and `.env.example`.
- All environment variables are documented with placeholder values in `.env.example`.

## 4. Reporting a Vulnerability

If you discover a security issue in AirWise, please avoid posting exploit details publicly. Report the issue privately to the repository maintainer with reproduction steps, affected endpoint/component, and expected impact so a fix can be prepared and verified promptly.
