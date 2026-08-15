# TikTok endpoint archaeology

This directory is the evidence and verification workstream for reconstructing the read-only TikTok data surface demonstrated by public tools such as Omar-Thing, while independently documenting the actual TikTok web, mobile, live, and historical request families found in public source code and authorized captures.

The goal is not to turn third-party wrappers into an undocumented dependency. The goal is to identify the upstream request family for each field, reproduce it only where authorized, and promote it through an explicit evidence ladder.

## Evidence ladder

| Status | Meaning |
| --- | --- |
| `verified-live` | Reproduced in a controlled test with recorded date, environment, target identity checks, and sanitized evidence. |
| `capture-backed` | Exact request and response observed in an authorized capture from a user-owned device/account, but replay may not yet be proven. |
| `source-backed` | Concrete host, path, method, parameters, and response handling appear in inspectable source. Current compatibility is not assumed. |
| `wrapper-only` | A third-party wrapper request is known, but its TikTok upstream request remains hidden. |
| `historical` | Concrete implementation from an older TikTok/Douyin/Musical.ly generation. |
| `claim-only` | A page or README claims a capability without reproducible request evidence. |
| `disabled` | Incomplete, unsafe, state-changing, credential-dependent, or otherwise unsuitable for production use. |

## Verification rules

1. Preserve TikTok identifiers as strings.
2. Separate HTTP success from TikTok success and requested-target success.
3. Validate the exact requested username, user ID, Aweme ID, room ID, comment ID, or other entity identifier.
4. Treat `region`, `author.region`, `priority_region`, `app_country`, `store-country`, session region, and datacenter context as distinct concepts.
5. Do not label any field as account origin or locked region without a separate reproducible source.
6. Never commit cookies, sessions, device identifiers, API keys, proxy credentials, or signed request values.
7. Never reproduce or use a secret found accidentally in public source. Record only that secret-bearing code exists and rotate/redact it.
8. Do not test third-party wrapper endpoints without authorization.
9. Do not bypass authentication, Cloudflare, TikTok anti-bot systems, signatures, or rate limits.
10. Restrict live validation to low-rate read-only public endpoints, official APIs, or captures and test accounts controlled by the researcher.

## Initial work products

- [`omar-wrapper-evidence.md`](./omar-wrapper-evidence.md) records what public source actually reveals about Omar-Thing's own wrapper calls.
- [`endpoint-inventory.json`](./endpoint-inventory.json) is the machine-readable seed catalog.
- Future sanitized captures belong under `captures/sanitized/` and must pass the project's redaction checks before commit.

## Planned pipeline

1. Search public GitHub code, releases, forks, commits, issues, and archived repositories.
2. Extract normalized host/path/method tuples, parameter builders, header builders, response parsers, tests, and fixtures.
3. Deduplicate aliases and version variants into endpoint families.
4. Record source repository, commit, file, license, target app/version, and last update.
5. Run suspicious or unknown code only inside disposable VMs with no credentials, no mounted home directory, and blocked outbound access by default.
6. Promote safe public-web candidates through a low-rate live contract test.
7. Promote private-mobile candidates only from authorized captures and controlled replay.
8. Generate documentation and application adapters from the catalog, not from unsupported assumptions.

## Required evidence for current mobile calls

Public GitHub source can establish historical and source-backed request shapes, but it cannot prove the current mobile request used by a particular account, app version, region, or experiment bucket. That requires a sanitized HAR, Proxyman/mitmproxy export, or structured request log captured from a user-owned device and account. The capture must remove authentication material before it is committed or shared.
