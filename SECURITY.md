# Security policy

## Scope

Aweme Lens is designed to keep all TikTok credentials, cookies, signing material, and device context on the server. The default mock mode requires none of those values.

The following are security-sensitive:

- `TIKTOK_SIGNER_URL` and signer bridge behavior
- `TIKTOK_SIGNER_TOKEN`
- cookies and session identifiers
- `device_id`, `iid`, `openudid`, and fingerprint values
- proxy credentials
- signed CDN URLs
- raw response captures
- changes to upstream host/path allowlists
- changes to redaction rules

## Reporting a vulnerability

Do not open a public issue containing credentials, response captures, cookies, signed URLs, or exploit details. After the repository is published, use a private GitHub Security Advisory or another private channel designated by the repository owner.

Include:

- affected commit
- concise reproduction steps using synthetic or redacted data
- impact
- whether secrets may have been exposed
- a proposed mitigation, when available

## Secrets that must never be committed

- TikTok cookies
- session IDs
- `msToken`
- `X-Bogus`, `X-Gnarly`, `X-Argus`, `X-Gorgon`, or `X-Ladon`
- device IDs
- `openudid`, `iid`, or fingerprint values
- proxy credentials
- signer tokens
- Telegram or unrelated service credentials
- browser-exported authentication data
- signed CDN query parameters
- HAR, PCAP, or raw authenticated captures

The `.gitignore` blocks common capture and credential filenames, but it is not a substitute for secret scanning.

## Server-only boundary

Only files imported by Node.js route handlers may read `lib/env.ts`, `lib/http/legacy-client.ts`, or secret environment values. Client components must consume normalized API responses only.

`POST /api/lookup` does not accept:

- an upstream host
- an arbitrary URL to fetch
- custom headers
- cookies
- a proxy
- signer material
- a method or path override

The user-controlled query can select an identifier, not a network destination.

## Signer bridge requirements

An operator-supplied signer bridge should:

1. accept requests only from the application’s trusted server environment
2. require authentication
3. enforce its own host/path allowlist
4. avoid request or response logging that captures full signed URLs
5. rate-limit callers
6. return only the signed URL
7. rotate credentials immediately after suspected exposure

Aweme Lens independently verifies that the signed URL remains HTTPS, has no embedded credentials, and keeps the original host, path, and required unsigned parameters.

## Raw viewer

The raw viewer is disabled per request unless `includeRaw` is true and `ALLOW_RAW_VIEWER=true`.

Before raw data is returned, the sanitizer:

- redacts sensitive key names recursively
- converts `bigint` values to strings
- preserves ordinary long ID strings
- sanitizes URL query parameters
- truncates excessive depth, object keys, array length, and very long strings
- handles circular values

Treat raw output as diagnostic data, not as a safe archival format. Disable it in deployments that do not need it.

## Rate limiting and cache limitations

The built-in limiter and cache are in-memory and per process. In serverless deployments they do not provide a globally consistent limit. Use a shared trusted store for internet-scale deployment.

No response containing an error is cached. Successful cache entries are short-lived and contain already-sanitized data.

## Request budgets

Every lookup has one application-level execution budget. The shared abort signal covers signer
requests, TikTok requests, retry delays, and numeric-ID fallback. Each individual network call
also has a shorter timeout. This prevents a sequence of individually bounded operations from
turning into an unexpectedly long server execution.

## Dependency and deployment guidance

- run `npm audit` in a networked development environment
- enable Dependabot or equivalent dependency alerts
- pin production deployments to reviewed lockfile changes
- protect production environment variables
- keep preview deployments in mock mode unless they specifically require legacy testing
- verify `/api/health` after every environment change
- review logs for metadata only; never add raw requests or responses to logging
