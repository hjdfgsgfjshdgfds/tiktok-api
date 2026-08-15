import { AlertIcon, CheckIcon, DatabaseIcon } from '@/components/icons';
import type { EndpointCapability } from '@/lib/types';

function capabilityTone(capability: EndpointCapability): string {
  if (capability.status === 'unsupported') return 'capability--unsupported';
  if (capability.status === 'experimental') return 'capability--experimental';
  return 'capability--evidence';
}

export function EvidencePanel({ capabilities }: { capabilities: EndpointCapability[] }) {
  return (
    <details className="evidence-panel" id="endpoint-evidence">
      <summary>
        <span>
          <DatabaseIcon />
          Repository evidence boundary
        </span>
        <span className="evidence-panel__hint">What is actually supported?</span>
      </summary>
      <div className="evidence-panel__body">
        <div className="evidence-intro">
          <div>
            <h2>Capabilities are enabled by evidence, not by guesswork.</h2>
            <p>
              Mock mode exercises the complete interface safely. Legacy-live mode only exposes
              request shapes documented in the connected TikTok 9.1.0-era repository and still
              requires an operator-supplied signer.
            </p>
          </div>
          <div className="evidence-rule">
            <AlertIcon />
            The modern api16 target-feed request and story endpoints remain hard-disabled.
          </div>
        </div>

        <div className="capability-list">
          {capabilities.map((capability) => (
            <article key={capability.id} className={`capability ${capabilityTone(capability)}`}>
              <div className="capability__status">
                {capability.status === 'unsupported' ? <AlertIcon /> : <CheckIcon />}
              </div>
              <div className="min-w-0">
                <div className="capability__title">
                  <h3>{capability.adapter}</h3>
                  <span>{capability.status}</span>
                </div>
                <code>
                  {capability.method} {capability.host}
                  {capability.path}
                </code>
                <p>{capability.note}</p>
                <dl>
                  <div>
                    <dt>Success</dt>
                    <dd>{capability.successCondition}</dd>
                  </div>
                  <div>
                    <dt>Target rule</dt>
                    <dd>{capability.targetValidation}</dd>
                  </div>
                  <div>
                    <dt>Evidence</dt>
                    <dd>{capability.evidence}</dd>
                  </div>
                </dl>
              </div>
            </article>
          ))}
        </div>
      </div>
    </details>
  );
}
