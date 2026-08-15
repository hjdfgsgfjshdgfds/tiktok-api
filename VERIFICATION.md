# Verification report

Date: 2026-08-15

This ledger distinguishes structural checks, official package-backed checks, production-server smoke tests, and capabilities that still lack live TikTok evidence.

## Final clean VM verification

The committed repository was verified by the repeatable GitHub Actions workflow at `.github/workflows/vm-integration-test.yml`.

- Workflow run: [VM integration test #7](https://github.com/hjdfgsgfjshdgfds/tiktok-api/actions/runs/31907135088)
- Tested commit: `38d0aea13a601a28621484fca7e1c045deb8a6e1`
- Runner: fresh GitHub-hosted Ubuntu 24.04.4 VM
- Node.js: 22.23.2
- npm: 10.9.8
- Lookup mode: `mock`
- Workflow permissions: repository contents read-only

The workflow checked out an untouched copy of the committed tree and ran:

```bash
npm ci --no-audit --no-fund
npm run format:check
npm run lint
npm run typecheck
npm run test -- --reporter=verbose
npm run build
npm run start
```

Every step passed.

### Official test results

Vitest ran against the real installed dependencies rather than compatibility shims:

- 10 test files passed
- 59 tests passed
- no failed or skipped test cases

The suite covers input parsing, 19-digit ID preservation, exact target matching, author validation, malformed responses, HTTP 403/429 handling, cooldowns, timeouts, redaction, signed-URL sanitization, provenance, and all mock lookup states.

### Production build

Next.js 15.5.21 produced an optimized production build successfully.

Generated application routes:

```text
/             dynamic application page
/api/health   dynamic route handler
/api/lookup   dynamic route handler
```

The main application route measured 7.11 kB with 110 kB first-load JavaScript in this build.

### Running-server smoke test

The workflow started the built application with `npm run start`. The Next.js production server became ready in 351 ms and was exercised through real HTTP requests on the VM.

All smoke cases passed:

| Case                                             | Expected HTTP status | Result |
| ------------------------------------------------ | -------------------: | ------ |
| Rendered homepage contains the product identity  |                  200 | Passed |
| Health endpoint reports valid mock configuration |                  200 | Passed |
| Successful profile lookup                        |                  200 | Passed |
| Successful Aweme lookup with sanitized raw data  |                  200 | Passed |
| Private profile omits unavailable `secUid`       |                  200 | Passed |
| Partial result exposes its warning state         |                  200 | Passed |
| Exact target missing after two bounded attempts  |                  404 | Passed |
| Malformed upstream response                      |                  502 | Passed |
| Simulated upstream rate limit                    |                  429 | Passed |
| Unsupported non-TikTok URL                       |                  422 | Passed |

The Aweme smoke case also verified that the exact 19-digit ID survived in sanitized raw output and that synthetic secret markers were absent.

### VM evidence artifact

The successful run uploaded `aweme-lens-vm-test-evidence`, containing:

- `vm-server.log`
- `vm-health.json`
- `vm-home.html`
- `vm-smoke-results.json`

Artifact ID: `9252659736`

Artifact SHA-256:

```text
db8f7d9a4d17d2f68b561225455ea84ef748d38a47eca43112abe8cdc1bed649
```

GitHub retains this workflow artifact for seven days from the run date.

## Defects found and corrected during VM verification

The clean-VM process found issues that the earlier dependency-limited analysis could not prove:

1. The initial source tree did not pass its declared Prettier check. The repository was formatted and the formatted source was committed.
2. A helper named `useValue` was incorrectly treated as a React hook by ESLint. It was renamed to `selectValue`.
3. An unused `coverVariants` local and an unused `isRecord` import were removed.
4. Next.js generated a triple-slash declaration in `next-env.d.ts`; the generated declaration file is now excluded from ESLint while remaining available to TypeScript.
5. The integration smoke test was aligned with the route's intentional `422 unsupported_input` contract for unsupported domains.
6. A real `package-lock.json` was generated from resolved dependencies and committed, allowing repeatable `npm ci` verification.

A subsequent clean run passed without changing or patching source files inside CI.

## Earlier structural and visual checks

Before npm connectivity was available, the source also passed:

- strict TypeScript-oriented structural analysis with temporary ambient declarations
- syntax transpilation of 60 TypeScript/TSX implementation files
- resolution of 136 local relative and `@/` imports
- JSON and SVG parsing
- local Markdown-link validation
- secret-pattern inspection
- dependency-shim execution of all 59 authored cases
- a route-handler compatibility harness

Static Chromium QA was performed at:

- desktop: 1440 × 1200
- mobile: 390 × 844

That pass reviewed the empty state, validated Aweme result, header, footer, lookup control, metrics, regions, music, provenance, raw-data disclosure, and responsive collapse. It found and corrected a mobile metric-grid defect.

The final VM smoke test verifies server-rendered homepage output and application APIs; it is not represented as a full browser-driven interaction or pixel-comparison test.

## Remaining evidence boundary

The application is fully installable, buildable, testable, and runnable in mock mode.

The VM run does **not** establish that current live TikTok mobile endpoints or signatures work. The connected repositories still do not provide a current, licensed, self-contained, end-to-end implementation of the modern `api16-normal-useast5.tiktokv.us/aweme/v1/feed/?aweme_id=...` request. Legacy-live mode therefore remains experimental and requires an operator-controlled signer bridge and device context.

Story lookup, account-origin or locked-region claims, current image-post geofencing, and other unsupported capabilities remain disabled rather than fabricated.

## Verification conclusion

The committed project now passes a real locked dependency install, Prettier, ESLint, strict TypeScript checking, all 59 official Vitest cases, a Next.js production build, production-server startup, homepage rendering, health checks, and ten end-to-end HTTP smoke scenarios in a clean Ubuntu VM.

This supports a strong deployment-readiness claim for **mock mode**. Live TikTok compatibility remains explicitly unverified and isolated behind experimental configuration.
