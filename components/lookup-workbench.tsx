'use client';

import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';
import { ArrowIcon, CodeIcon, SearchIcon, TrashIcon } from '@/components/icons';
import { EmptyState } from '@/components/empty-state';
import { EvidencePanel } from '@/components/evidence-panel';
import { LoadingState } from '@/components/loading-state';
import { ResultPanel } from '@/components/result-panel';
import type { EndpointCapability, LookupMode, LookupResult } from '@/lib/types';

const RECENT_STORAGE_KEY = 'aweme-lens:recent:v1';
const MAX_RECENT = 6;

function isLookupResult(value: unknown): value is LookupResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.ok === 'boolean' &&
    typeof record.input === 'object' &&
    typeof record.meta === 'object' &&
    Array.isArray(record.warnings) &&
    Array.isArray(record.errors)
  );
}

export function LookupWorkbench({
  mode,
  rawViewerEnabled,
  capabilities
}: {
  mode: LookupMode;
  rawViewerEnabled: boolean;
  capabilities: EndpointCapability[];
}) {
  const [query, setQuery] = useState('');
  const [includeRaw, setIncludeRaw] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [transportError, setTransportError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(RECENT_STORAGE_KEY);
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      if (Array.isArray(parsed)) {
        setRecent(parsed.filter((item): item is string => typeof item === 'string').slice(0, MAX_RECENT));
      }
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    function focusShortcut(event: globalThis.KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
      if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', focusShortcut);
    return () => window.removeEventListener('keydown', focusShortcut);
  }, []);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );

  const saveRecent = useCallback((value: string) => {
    setRecent((current) => {
      const next = [value, ...current.filter((item) => item !== value)].slice(0, MAX_RECENT);
      try {
        window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Recent history is optional and remains browser-local.
      }
      return next;
    });
  }, []);

  const lookup = useCallback(
    async (value: string) => {
      const normalized = value.trim();
      if (!normalized) return;

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setLoading(true);
      setTransportError(null);
      setResult(null);

      try {
        const response = await fetch('/api/lookup', {
          method: 'POST',
          signal: controller.signal,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ query: normalized, includeRaw: includeRaw && rawViewerEnabled })
        });
        const data: unknown = await response.json();
        if (!isLookupResult(data)) throw new Error('The server returned an unexpected response shape.');
        setResult(data);
        if (data.ok) saveRecent(normalized);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setTransportError(error instanceof Error ? error.message : 'The lookup request failed.');
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
          setLoading(false);
        }
      }
    },
    [includeRaw, rawViewerEnabled, saveRecent],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void lookup(query);
  }

  function useValue(value: string) {
    setQuery(value);
    void lookup(value);
  }

  function clearRecent() {
    setRecent([]);
    try {
      window.localStorage.removeItem(RECENT_STORAGE_KEY);
    } catch {
      // Optional local history may be unavailable.
    }
  }

  function inputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setQuery('');
      inputRef.current?.blur();
    }
  }

  const examples =
    mode === 'mock'
      ? ['@example', '7399999999999999991', '@private', '7399999999999999992']
      : ['@username', 'user:1234567890123456789', 'aweme:7399999999999999991'];

  return (
    <>
      <section className="hero" aria-labelledby="page-title">
        <div className="hero__signal" aria-hidden="true" />
        <h1 id="page-title">Inspect the target, not just the response.</h1>
        <p>
          A provenance-first TikTok profile and post inspector that validates exact IDs, preserves
          large numbers, and shows where every field came from.
        </p>

        <form className="lookup-form" onSubmit={submit}>
          <div className="lookup-input-wrap">
            <SearchIcon className="lookup-input-icon" />
            <label htmlFor="lookup-query" className="sr-only">
              TikTok username, user ID, video URL, or Aweme ID
            </label>
            <input
              ref={inputRef}
              id="lookup-query"
              value={query}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
              onKeyDown={inputKeyDown}
              spellCheck={false}
              autoCapitalize="none"
              autoComplete="off"
              maxLength={500}
              placeholder="@username, user ID, video URL, or Aweme ID"
              aria-describedby="lookup-help"
            />
            <kbd aria-label="Keyboard shortcut">/</kbd>
          </div>
          <button type="submit" className="primary-button" disabled={loading || !query.trim()}>
            <span>{loading ? 'Inspecting' : 'Look up'}</span>
            <ArrowIcon />
          </button>
        </form>

        <div className="lookup-options" id="lookup-help">
          <label className={`raw-toggle ${rawViewerEnabled ? '' : 'raw-toggle--disabled'}`}>
            <input
              type="checkbox"
              checked={includeRaw && rawViewerEnabled}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setIncludeRaw(event.target.checked)}
              disabled={!rawViewerEnabled}
            />
            <span className="raw-toggle__control" aria-hidden="true" />
            <CodeIcon />
            Include sanitized raw data
          </label>
          <span className="lookup-options__separator" />
          <span>IDs remain strings end to end</span>
        </div>

        <div className="example-strip" aria-label="Example searches">
          <span>Try</span>
          {examples.map((example) => (
            <button key={example} type="button" onClick={() => useValue(example)}>
              {example}
            </button>
          ))}
        </div>
      </section>

      {recent.length > 0 ? (
        <section className="recent-searches" aria-labelledby="recent-title">
          <div>
            <h2 id="recent-title">Recent</h2>
            <div className="recent-list">
              {recent.map((item) => (
                <button key={item} type="button" onClick={() => useValue(item)} title={item}>
                  {item}
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="clear-button" onClick={clearRecent}>
            <TrashIcon />
            Clear
          </button>
        </section>
      ) : null}

      <div className="result-stage">
        {loading ? <LoadingState /> : null}
        {!loading && transportError ? (
          <section className="result-shell result-shell--error" role="alert">
            <p className="section-label">Connection error</p>
            <h2>The API response could not be read.</h2>
            <p className="mt-3 text-mist-400">{transportError}</p>
          </section>
        ) : null}
        {!loading && !transportError && result ? <ResultPanel result={result} /> : null}
        {!loading && !transportError && !result ? <EmptyState mode={mode} /> : null}
      </div>

      <EvidencePanel capabilities={capabilities} />
    </>
  );
}
