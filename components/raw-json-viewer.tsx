'use client';

import { type ChangeEvent, useMemo, useState } from 'react';
import { CodeIcon, CopyIcon, SearchIcon } from '@/components/icons';

function HighlightedJson({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const normalized = query.toLowerCase();
  const parts: Array<{ text: string; match: boolean }> = [];
  let cursor = 0;
  const lower = text.toLowerCase();

  while (cursor < text.length) {
    const index = lower.indexOf(normalized, cursor);
    if (index === -1) {
      parts.push({ text: text.slice(cursor), match: false });
      break;
    }
    if (index > cursor) parts.push({ text: text.slice(cursor, index), match: false });
    parts.push({ text: text.slice(index, index + normalized.length), match: true });
    cursor = index + normalized.length;
  }

  return (
    <>
      {parts.map((part, index) =>
        part.match ? (
          <mark key={index}>{part.text}</mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}

export function RawJsonViewer({ raw }: { raw: unknown }) {
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const text = useMemo(() => JSON.stringify(raw, null, 2) ?? 'null', [raw]);
  const matches = query.trim()
    ? text.toLowerCase().split(query.trim().toLowerCase()).length - 1
    : 0;

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <details className="disclosure raw-disclosure">
      <summary>
        <span className="disclosure-title">
          <CodeIcon />
          Sanitized raw data
        </span>
        <span className="disclosure-meta">Upstream fields · secrets redacted</span>
      </summary>
      <div className="disclosure-body">
        <div className="raw-toolbar">
          <label className="raw-search">
            <SearchIcon />
            <span className="sr-only">Search sanitized JSON</span>
            <input
              value={query}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
              placeholder="Search JSON"
            />
            {query ? <span>{matches} matches</span> : null}
          </label>
          <button type="button" className="secondary-button" onClick={copyJson}>
            <CopyIcon />
            {copied ? 'Copied' : 'Copy JSON'}
          </button>
        </div>
        <pre className="raw-json" tabIndex={0}>
          <code>
            <HighlightedJson text={text} query={query} />
          </code>
        </pre>
      </div>
    </details>
  );
}
