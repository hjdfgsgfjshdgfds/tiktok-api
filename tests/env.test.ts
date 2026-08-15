import { afterEach, describe, expect, it } from 'vitest';
import { getServerEnv, resetEnvForTests } from '@/lib/env';

const originalEnv = { ...process.env };

function resetProcessEnv() {
  process.env = { ...originalEnv };
  resetEnvForTests();
}

afterEach(resetProcessEnv);

describe('server environment validation', () => {
  it('parses explicit false values instead of treating every string as false', () => {
    process.env.LOOKUP_MODE = 'mock';
    process.env.ALLOW_RAW_VIEWER = 'false';
    resetEnvForTests();

    expect(getServerEnv().allowRawViewer).toBe(false);
  });

  it('rejects unrecognized boolean strings', () => {
    process.env.LOOKUP_MODE = 'mock';
    process.env.ALLOW_RAW_VIEWER = 'sometimes';
    resetEnvForTests();

    expect(() => getServerEnv()).toThrow(/ALLOW_RAW_VIEWER/);
  });

  it('rejects a legacy base URL containing a path', () => {
    process.env.LOOKUP_MODE = 'mock';
    process.env.TIKTOK_LEGACY_BASE_URL = 'https://api2.musical.ly/proxy/';
    resetEnvForTests();

    expect(() => getServerEnv()).toThrow(/HTTPS origin/);
  });

  it('accepts blank optional legacy-live values in mock mode', () => {
    process.env.LOOKUP_MODE = 'mock';
    process.env.TIKTOK_SIGNER_URL = '';
    process.env.TIKTOK_DEVICE_ID = '';
    process.env.TIKTOK_FP = '';
    process.env.TIKTOK_IID = '';
    process.env.TIKTOK_OPENUDID = '';
    process.env.TIKTOK_COOKIE = '';
    resetEnvForTests();

    expect(getServerEnv().mode).toBe('mock');
  });

  it('rejects query-delimiter injection in legacy fingerprint values', () => {
    process.env.LOOKUP_MODE = 'mock';
    process.env.TIKTOK_FP = 'safe&aweme_id=other';
    resetEnvForTests();

    expect(() => getServerEnv()).toThrow(/TIKTOK_FP/);
  });

  it('bounds the end-to-end lookup budget', () => {
    process.env.LOOKUP_MODE = 'mock';
    process.env.LOOKUP_BUDGET_MS = '999';
    resetEnvForTests();

    expect(() => getServerEnv()).toThrow(/LOOKUP_BUDGET_MS/);
  });
});
