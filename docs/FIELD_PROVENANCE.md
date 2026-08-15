# Field provenance

## Purpose

A normalized label can make upstream data easier to read, but it can also accidentally change meaning. Aweme Lens stores provenance beside every displayed field so the application can show both the friendly label and the exact original source.

## Record shape

```ts
interface FieldProvenance {
  id: string;
  label: string;
  value: unknown;
  sourceEndpoint: string;
  upstreamPath: string;
  retrievedAt: string;
  confidence: 'high' | 'medium' | 'low';
  status: 'direct' | 'derived' | 'legacy-documented';
  explanation?: string;
  origin: 'tiktok' | 'mock' | 'local';
}
```

## Status meanings

### `direct`

The normalized value is copied without semantic transformation from a concrete upstream path.

Example:

```json
{
  "label": "Permanent user ID",
  "value": "6800000000000000001",
  "upstreamPath": "user.uid",
  "status": "direct",
  "origin": "tiktok"
}
```

### `derived`

The value is computed locally from one or more upstream fields.

Examples:

- `privateAccount = user.secret === 1`
- ISO post date from `aweme_detail.create_time`
- `downloadAllowed` from `prevent_download` and `status.download_status`
- content type set to `video` only when a video object exists

Derived fields retain the source paths and an explanation.

### Origin meanings

- `tiktok`: copied from an upstream response returned by the legacy-live client
- `mock`: copied from a synthetic repository-shaped fixture in mock mode
- `local`: calculated locally from one or more source fields

### `legacy-documented`

The connected repository explicitly documents a meaning, but the endpoint model is old enough that the application should not present it without qualification.

The current example is `user.create_time`, displayed as **Account created (legacy field)**. This is never inferred from an Aweme’s `create_time`.

## Region rules

Aweme Lens uses the following exact labels:

| Upstream path | Display label |
|---|---|
| `aweme_detail.region` | Selected Aweme region |
| `aweme_detail.author.region` | Author region |
| `user.region` | Profile region |

None of these fields is automatically called:

- account creation country
- account origin
- locked region
- signup country
- residence

Request values such as app region, system region, carrier region, account region, store country, proxy region, datacenter, cookie context, or session region are not inspected-account properties and are not normalized into profile fields.

## Unavailable fields

The UI omits a field when the upstream response does not contain a supported value. It does not display a dash, `null`, `unknown`, or a generated placeholder as though data existed.

The connected repository does not support current evidence for these requested fields:

- `secUid`
- friends count
- profile digg count distinct from legacy favoriting count
- nickname modification time
- username modification time
- story availability
- image-post classification
- geofencing details
- account-origin or locked-region value

They remain in the normalized TypeScript model as optional extension points but are not populated by the evidence-bounded adapters.

## URLs

Remote media URLs are accepted only over HTTPS from conservative TikTok/CDN host suffixes. Synthetic mock media may use a single-slash local path; protocol-relative and traversal-like paths are rejected. Sensitive or volatile query parameters are redacted before a URL reaches a field or raw response.

Because authorization parameters may be required for playback, a sanitized URL can stop working. Security and non-disclosure take priority over preserving a temporary playable link.

## Confidence

- **high**: exact path and value are present; meaning is not changed
- **medium**: path is present, but meaning depends on legacy repository documentation or a cautious derivation
- **low**: reserved for future adapters with incomplete evidence; current adapters avoid returning low-confidence fields when omission is safer
