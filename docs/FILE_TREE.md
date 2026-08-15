# Final file tree

The current branch contains the complete **Aweme Lens** repository. The previous legacy fork tree remains available in Git history beneath the publication commit.

```text
aweme-lens/
├── .env.example
├── .eslintrc.json
├── .gitignore
├── .prettierignore
├── .prettierrc.json
├── EVIDENCE_REPORT.md
├── LICENSE
├── README.md
├── SECURITY.md
├── THIRD_PARTY_NOTICES.md
├── VERIFICATION.md
├── app/
│   ├── api/
│   │   ├── health/route.ts
│   │   └── lookup/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   └── styles/
│       ├── globals-part-2.css
│       ├── globals-part-3.css
│       └── globals-part-4.css
├── components/
│   ├── data-row.tsx
│   ├── empty-state.tsx
│   ├── evidence-panel.tsx
│   ├── icons.tsx
│   ├── issue-list.tsx
│   ├── loading-state.tsx
│   ├── logo.tsx
│   ├── lookup-workbench.tsx
│   ├── metric.tsx
│   ├── post-result.tsx
│   ├── profile-result.tsx
│   ├── provenance-panel.tsx
│   ├── raw-json-viewer.tsx
│   ├── result-panel.tsx
│   └── status-badge.tsx
├── docs/
│   ├── ARCHITECTURE.md
│   ├── ENDPOINTS.md
│   ├── FIELD_PROVENANCE.md
│   ├── FILE_TREE.md
│   ├── RESPONSE_VALIDATION.md
│   ├── SIGNING_RESEARCH.md
│   └── screenshots/
│       ├── home-placeholder.svg
│       └── result-placeholder.svg
├── lib/
│   ├── adapters/
│   │   ├── aweme.ts
│   │   ├── index.ts
│   │   ├── profile.ts
│   │   ├── source.ts
│   │   ├── types.ts
│   │   └── unsupported.ts
│   ├── http/
│   │   ├── legacy-client.ts
│   │   └── types.ts
│   ├── mock/
│   │   ├── fixtures.ts
│   │   └── mock-client.ts
│   ├── normalize/
│   │   ├── helpers.ts
│   │   ├── post.ts
│   │   └── profile.ts
│   ├── cache.ts
│   ├── endpoint-evidence.ts
│   ├── env.ts
│   ├── errors.ts
│   ├── format.ts
│   ├── input-parser.ts
│   ├── logger.ts
│   ├── orchestrator.ts
│   ├── provenance.ts
│   ├── rate-limit.ts
│   ├── redact.ts
│   ├── schemas.ts
│   ├── types.ts
│   ├── utils.ts
│   └── validation.ts
├── public/
│   ├── favicon.svg
│   ├── mock-avatar.svg
│   └── mock-cover.svg
├── tests/
│   ├── support/server-only.ts
│   ├── env.test.ts
│   ├── input-parser.test.ts
│   ├── legacy-client.test.ts
│   ├── mock-flow.test.ts
│   ├── normalization.test.ts
│   ├── provenance.test.ts
│   ├── rate-limit.test.ts
│   ├── redact.test.ts
│   ├── utils.test.ts
│   └── validation.test.ts
├── next-env.d.ts
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json
└── vitest.config.ts
```
