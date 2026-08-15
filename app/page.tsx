import { DatabaseIcon, ShieldIcon } from '@/components/icons';
import { LogoMark } from '@/components/logo';
import { LookupWorkbench } from '@/components/lookup-workbench';
import { ENDPOINT_CAPABILITIES } from '@/lib/endpoint-evidence';
import { getServerEnv } from '@/lib/env';
import type { LookupMode } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  let mode: LookupMode = 'mock';
  let rawViewerEnabled = false;
  let configurationValid = true;
  try {
    const env = getServerEnv();
    mode = env.mode;
    rawViewerEnabled = env.allowRawViewer;
  } catch {
    configurationValid = false;
  }

  return (
    <div className="page-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <a href="#top" className="brand" aria-label="Aweme Lens home">
            <LogoMark />
            <span>Aweme Lens</span>
          </a>
          <nav aria-label="Primary navigation">
            <a href="#endpoint-evidence">
              <DatabaseIcon />
              Evidence
            </a>
            <a href="/api/health" target="_blank" rel="noreferrer">
              Health
            </a>
            <span className="mode-indicator">
              <span className="mode-indicator__dot" />
              {configurationValid
                ? mode === 'mock'
                  ? 'Mock mode'
                  : 'Legacy live'
                : 'Configuration error'}
            </span>
          </nav>
        </div>
      </header>

      <main id="top" className="site-main">
        {configurationValid ? (
          <LookupWorkbench
            mode={mode}
            rawViewerEnabled={rawViewerEnabled}
            capabilities={ENDPOINT_CAPABILITIES}
          />
        ) : (
          <section className="configuration-failure" role="alert">
            <p className="section-label">Server configuration</p>
            <h1>Aweme Lens could not start safely.</h1>
            <p>
              The server environment is invalid. No lookup or credential-dependent request was
              attempted. Review the deployment variables and check the health route after fixing
              them.
            </p>
            <a href="/api/health" target="_blank" rel="noreferrer">
              Open health status
            </a>
          </section>
        )}
      </main>

      <footer className="site-footer">
        <div>
          <LogoMark className="logo-mark--small" />
          <p>
            Aweme Lens is an independent inspection tool. It is not affiliated with TikTok or
            ByteDance.
          </p>
        </div>
        <div className="footer-notices">
          <span>
            <ShieldIcon />
            Queries are sent to this server; recent values stay in your browser.
          </span>
          <span>Basic per-instance IP rate limiting is enabled.</span>
        </div>
      </footer>
    </div>
  );
}
