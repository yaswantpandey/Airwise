import { NextRequest } from 'next/server';
import { serverConfig } from '@/lib/server/config';
import { isGeminiConfigured } from '@/lib/server/gemini';
import {
  createRequestId,
  handleCorsPreflight,
  isOriginAllowed,
  jsonError,
  jsonOk,
} from '@/lib/server/http';
import type { HealthResponsePayload } from '@/lib/server/schemas';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  if (!isOriginAllowed(request)) {
    return jsonError(request, 403, 'Origin not allowed.', requestId);
  }

  const payload: HealthResponsePayload = {
    status: 'ok',
    service: 'airwise',
    model: serverConfig.geminiModel,
    geminiConfigured: isGeminiConfigured(),
    timestampIso: new Date().toISOString(),
  };

  return jsonOk(request, payload, requestId, {
    'Cache-Control': 'no-store',
  });
}
