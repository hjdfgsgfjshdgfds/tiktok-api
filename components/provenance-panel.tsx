import { DatabaseIcon, ShieldIcon } from '@/components/icons';
import { formatDateTime, formatUnknown } from '@/lib/format';
import type { FieldProvenance, ResultSource } from '@/lib/types';

function ProvenanceValue({ field }: { field: FieldProvenance }) {
  const value = formatUnknown(field.value);
  return <span title={value}>{value.length > 120 ? `${value.slice(0, 120)}…` : value}</span>;
}

export function ProvenancePanel({
  fields,
  sources
}: {
  fields: FieldProvenance[];
  sources: ResultSource[];
}) {
  return (
    <details className="disclosure">
      <summary>
        <span className="disclosure-title">
          <ShieldIcon />
          Source details
        </span>
        <span className="disclosure-meta">
          {fields.length} fields · {sources.length} request{sources.length === 1 ? '' : 's'}
        </span>
      </summary>
      <div className="disclosure-body space-y-8">
        <section>
          <div className="panel-heading">
            <div>
              <p className="section-label">Request trail</p>
              <h3>Endpoint validation</h3>
            </div>
            <DatabaseIcon className="text-mist-500" />
          </div>
          <div className="source-list">
            {sources.map((source) => (
              <article key={source.id} className="source-item">
                <div className="source-item__top">
                  <code>
                    {source.method} {source.host}
                    {source.path}
                  </code>
                  <span className={`source-state source-state--${source.validation ?? source.status}`}>
                    {source.validation ?? source.status}
                  </span>
                </div>
                <dl>
                  {source.attempt !== undefined ? (
                    <div>
                      <dt>Attempt</dt>
                      <dd>{source.attempt}</dd>
                    </div>
                  ) : null}
                  {source.httpStatus !== undefined ? (
                    <div>
                      <dt>HTTP</dt>
                      <dd>{source.httpStatus}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>Adapter</dt>
                    <dd>{source.adapter}</dd>
                  </div>
                </dl>
                {source.note ? <p>{source.note}</p> : null}
              </article>
            ))}
          </div>
        </section>

        <section>
          <div className="panel-heading">
            <div>
              <p className="section-label">Field lineage</p>
              <h3>Normalized value → upstream path</h3>
            </div>
          </div>
          <div className="provenance-table" role="table" aria-label="Field provenance">
            {fields.map((field) => (
              <article key={field.id} className="provenance-row" role="row">
                <div className="provenance-row__value" role="cell">
                  <span>{field.label}</span>
                  <ProvenanceValue field={field} />
                </div>
                <div className="provenance-row__path" role="cell">
                  <code>{field.upstreamPath}</code>
                  <span>
                    {field.status} · {field.origin} origin · {field.confidence} confidence ·{' '}
                    {formatDateTime(field.retrievedAt)}
                  </span>
                  {field.explanation ? <p>{field.explanation}</p> : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </details>
  );
}
