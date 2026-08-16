import { NextResponse } from 'next/server';
import { ENDPOINT_CAPABILITIES } from '@/lib/endpoint-evidence';
import { getServerEnv } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  let env: ReturnType<typeof getServerEnv>;
  try {
    env = getServerEnv();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        service: 'aweme-lens',
        mode: 'unknown',
        retrievedAt: new Date().toISOString(),
        configurationValid: false,
        publicLiveReady: false,
        mockReady: false,
        rawViewerEnabled: false,
        legacyLiveConfigured: false,
        evidenceBoundary: 'The server environment failed validation; no TikTok request was attempted.',
        capabilities: ENDPOINT_CAPABILITIES,
      },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    );
  }

  const legacyConfigured = Boolean(
    env.legacy.signerUrl &&
      env.legacy.deviceId &&
      env.legacy.fp &&
      env.legacy.iid &&
      env.legacy.openudid,
  );
  const operational = env.mode !== 'legacy-live' || legacyConfigured;

  return NextResponse.json(
    {
      ok: operational,
      service: 'aweme-lens',
      mode: env.mode,
      retrievedAt: new Date().toISOString(),
      configurationValid: true,
      publicLiveReady: true,
      publicLiveRequiresTikTokLogin: false,
      mockReady: true,
      rawViewerEnabled: env.allowRawViewer,
      legacyLiveConfigured: legacyConfigured,
      evidenceBoundary:
        'Public-live supports current TikTok profile/video page data and the unauthenticated modern exact-Aweme feed request. Other documented web families still require their own current signed request implementation.',
      capabilities: ENDPOINT_CAPABILITIES,
    },
    {
      status: operational ? 200 : 503,
      headers: { 'cache-control': 'no-store' },
    },
  );
}
