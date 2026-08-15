# Verification report

Date: 2026-08-15

This ledger separates checks that actually ran in the artifact environment from checks that still require a normal npm installation.

## Passed in this environment

### Source integrity

- strict TypeScript analysis passed across the complete source tree using TypeScript 5.8.3 and temporary ambient declarations for unavailable third-party packages
- 60 TypeScript/TSX implementation files passed syntax transpilation
- 136 local relative and `@/` imports resolved to real files
- all JSON configuration files parsed successfully
- all SVG assets parsed as XML
- all local Markdown links resolved
- no unresolved `TODO`, `FIXME`, `XXX`, or `HACK` markers were found outside intentionally labeled screenshot placeholders
- no production source file contained an obvious literal value assigned to a known TikTok credential field; the only matches were synthetic test values

### Executable dependency-shim test run

All 59 authored test cases executed and passed against the actual transpiled `lib/` modules. The temporary harness supplied narrow runtime shims for Zod, `json-bigint`, `server-only`, and the subset of Vitest APIs used by the test files.

Covered behavior included:

1. username, URL, explicit-ID, and ambiguous numeric-ID parsing
2. exact 19-digit preservation, including unquoted upstream JSON integers
3. unsupported-domain, short-link, embedded-credential, malformed-escape, and command-input rejection
4. exact profile, username, Aweme, and expected-author validation
5. empty, malformed, wrong-target, 403, 429, and timeout responses
6. legacy unencoded query ordering and signer target-boundary validation
7. cooldown behavior, environment validation, and lookup-budget bounds
8. recursive secret redaction, signed URL cleanup, and media-host policy
9. exact avatar/cover provenance and conservative playback exposure
10. rate limiting, abortable delays, and every mock success/failure flow

The expanded run found one real ordering defect: endpoint-specific legacy parameters were placed before the common app/device parameters. The implementation was corrected so endpoint parameters retain caller order after common parameters and before `_rticket`/`ts`; all 59 cases then passed.

A separate orchestrator smoke harness also passed profile lookup, Aweme lookup, target-missing retries, numeric-ID fallback, raw-data sanitization, provenance, and abort-to-timeout mapping.

### API route harness

A route-level harness executed the actual transpiled App Router handlers with narrow Next.js request/response shims. It passed:

- `GET /api/health`, including safe capability reporting
- a valid `POST /api/lookup`, including request-ID propagation and the normalized response envelope
- invalid JSON rejection with HTTP 400
- oversized request-body rejection with HTTP 400
- IP rate-limit enforcement with HTTP 429

The route harness validates the authored handler behavior, but it is not a substitute for starting a real Next.js server.

The shim run exercises project logic but is not represented as an official Vitest run because the real packages were unavailable.

### Static visual QA

A static harness using the actual component class names and compiled project stylesheet was rendered with system Chromium through Playwright at:

- desktop: 1440 × 1200
- mobile: 390 × 844

Reviewed surfaces:

- empty/home state
- validated Aweme result
- header and footer
- main lookup control
- result identity, metrics, regions, music, provenance, and raw-data disclosure
- desktop-to-mobile collapse

One responsive defect found during this pass was fixed: an odd fifth metric no longer leaves a false blank grid cell on mobile.

The rendered PNGs were retained with the build artifact during QA but are not committed to the GitHub publication tree, keeping the source repository text-first and avoiding unnecessary binary weight. The repository includes labeled SVG screenshot placeholders under `docs/screenshots/` for future real deployment captures.

## Could not run here

The environment could not reach the npm registry. Both an installation attempt and a direct package metadata request timed out. Consequently, the following commands were **not** represented as passing:

```bash
npm install
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

There is intentionally no generated `package-lock.json`; producing one without resolving the declared versions would be misleading.

## Required first networked verification

From the repository root in an environment with npm access:

```bash
npm install
npm run check
npm run build
npm run dev
```

Then verify these routes:

```text
GET  /api/health
POST /api/lookup
```

Recommended manual smoke inputs are listed in `README.md`. Commit the reviewed `package-lock.json` produced by the successful installation.

## Verification conclusion

The source is structurally complete, all 59 authored cases pass against the transpiled project logic in the dependency-shim runtime, and the responsive design passed static Chromium inspection. A real npm installation, official Vitest/ESLint/Prettier execution, and Next production build remain required before claiming a fully verified deployment artifact.


## Publication evidence update

Before the GitHub publication commit, the additional repositories
`huaerxiela/douyin-algorithm` and `edwinjson/tiktok-api` were inspected. This changed
only documentation and the evidence-panel description for the unsupported modern
endpoint. No external signing source or secret-bearing example was copied into the
application.
