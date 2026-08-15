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
        mockReady: false,
        rawViewerEnabled: false,
        legacyLiveConfigured: false,
        evidenceBoundary:
          'Current modern TikTok signing and api16 target-feed behavior are not present in the connected repository.',
        capabilities: ENDPOINT_CAPABILITIES,
      },
      {
        status: 503,
        headers: { 'cache-control': 'no-store' },
      },
    );
  }

  const legacyConfigured = Boolean(
    env.legacy.signerUrl &&
      env.legacy.deviceId &&
      env.legacy.fp &&
      env.legacy.iid &&
      env.legacy.openudid,
  );
  const operational = env.mode === 'mock' || legacyConfigured;

  return NextResponse.json(
    {
      ok: operational,
      service: 'aweme-lens',
      mode: env.mode,
      retrievedAt: new Date().toISOString(),
      configurationValid: true,
      mockReady: true,
      rawViewerEnabled: env.allowRawViewer,
      legacyLiveConfigured: legacyConfigured,
      evidenceBoundary:
        'Current modern TikTok signing and api16 target-feed behavior are not present in the connected repository.',
      capabilities: ENDPOINT_CAPABILITIES,
    },
    {
      status: operational ? 200 : 503,
      headers: { 'cache-control': 'no-store' },
    },
  );
}
