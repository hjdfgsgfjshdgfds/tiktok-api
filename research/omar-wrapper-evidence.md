# Omar-Thing wrapper evidence

Reviewed from public website content and public GitHub source on 2026-08-15.

This document distinguishes Omar-Thing's own wrapper/API calls from the upstream TikTok calls that remain hidden behind those wrappers.

## Public product surface

The public user lookup advertises profile data, profile region, a separately labelled locked region, language, permanent user ID, private state, account-created time, nickname and username modification times, stories, followers, and following.

The developer site advertises profiles, followers, videos, comments, stories, live chat, and search under `/api/v1`. Its public documentation describes API-key authentication, cursor pagination, `format=clean`, rate limits, and stable wrapper error codes. Those are Omar-Thing contracts, not TikTok upstream contracts.

Additional public tools advertise story viewing, repost viewing, live viewing, URL tracking, user tracking, email-to-username lookup, and full-profile analysis.

## Wrapper calls found in public source

### 1. Profile wrapper on `for.omar-thing.site`

Public JavaScript source in `AyGemuy/api-wudysoft` references:

```http
POST https://for.omar-thing.site/test
Content-Type: application/json
x-app-ts: {unix-seconds}
x-app-token: {derived-client-token}
```

Observed request body shape:

```json
{
  "username": "target_username",
  "ts": 0
}
```

The same public file contains a hard-coded client secret used by its token construction. That secret is intentionally not reproduced here and must not be used. Its presence means the wrapper's client authentication should be considered exposed and rotated by its operator.

**What this proves:** a source-backed Omar profile-wrapper call and its high-level request envelope.

**What this does not prove:** the TikTok host, TikTok path, TikTok signing family, device/session context, or exact field origins behind the wrapper response.

### 2. Historical profile wrapper on a Vercel deployment

Public Python source references:

```http
POST https://nodejs-serverless-function-express-ivory-ten.vercel.app/api/hello
Content-Type: application/json
```

Request body:

```json
{
  "username": "target_username"
}
```

The consuming code expects response fields including `userId`, `nickname`, `avatar`, `stats`, `accountCreated`, and `nicknameModified`.

**Status:** `wrapper-only`. The source does not reveal how the Vercel function obtains those fields.

### 3. Following-list wrapper on the same Vercel deployment

Public JavaScript source references:

```http
POST https://nodejs-serverless-function-express-ivory-ten.vercel.app/api/following
Content-Type: application/json
```

Request body:

```json
{
  "secUid": "target_sec_uid",
  "userId": "target_user_id",
  "cursor": "0"
}
```

The caller expects a `userList` array.

**Status:** `wrapper-only`. This is consistent with TikTok following-list data but does not establish the upstream TikTok request.

### 4. Earlier profile wrapper on `nopean.click`

Public source in `hippiiee/Hippie-OSINT-Toolkit` references:

```http
POST https://nopean.click
Content-Type: application/json
Origin: https://omar-thing.nekoweb.org
```

Request body:

```json
{
  "username": "target_username"
}
```

**Status:** historical wrapper-only evidence.

## Likely field families, not yet proven Omar upstreams

The following mappings are research hypotheses only until an exact Omar upstream request or an independently reproduced TikTok request is captured:

| Omar-visible feature | Candidate source family | Current status |
| --- | --- | --- |
| Profile, stats, region, language, user ID, `secUid` | TikTok web user detail or mobile user profile | Source-backed candidates exist; Omar mapping unproven. |
| Nickname/username modification times | Mobile profile fields such as update/modify timestamps | Field names vary by generation; Omar mapping unproven. |
| Account-created time | Dedicated profile field or local derivation from an ID/timestamp | Must be tested; never assume it is an upstream account-creation field. |
| Following | TikTok web/mobile following-list family | Omar wrapper known; upstream unproven. |
| Followers | TikTok web/mobile follower-list family | Public Omar feature; wrapper/upstream not yet recovered. |
| Stories | TikTok story/user-story family | Public Omar feature; no reproducible upstream source yet. |
| Reposts | TikTok web `/api/repost/item_list/` is a strong source-backed candidate | Omar implementation not yet proven. |
| Locked region | Separate TikTok source claimed by Omar | No exact request or raw field evidence recovered yet. |

## Locked-region caution

The public UI describes locked region as likely the country where the account was originally created and says it comes from a separate TikTok source. That statement is a product claim, not enough evidence to rename any generic region field.

Until a separate request and exact response path are reproduced, the catalog must keep these concepts separate:

- profile `region`
- author region
- selected Aweme region
- request `region`
- `priority_region`
- `app_country`
- store country
- SIM/carrier region
- session region
- datacenter or edge location
- a true account-origin/locked-region field

## Testing boundary

These third-party wrapper endpoints will not be called, brute-forced, crawled behind authentication, or supplied with exposed client secrets without authorization from their operator. Research against Omar-Thing remains passive: public pages, public source, public archives, normal browser assets, and metadata.

Independent TikTok endpoint verification will use official APIs, low-rate public-web requests, or sanitized captures from a user-owned device/account.

## Public sources

- `AyGemuy/api-wudysoft`, commit `c1c03171068d5f5b37d9fcb38a5b0549f725adf3`, `pages/api/stalker/tiktok/v8.js`
- `Hisham3150/Tiktoknew`, commit `0b5c01663d9acd043354acbc04b83359e64c2f0a`, `tiktoknew2.py`
- `hippiiee/Hippie-OSINT-Toolkit`, commit `7a7e97848a6c450111aa1072b6037f56b543c2ae`, `backend/social_networks/tiktok/tiktok_module.py`
- Omar-Thing public user-lookup, story-viewer, repost-viewer, API overview, documentation, and terms pages
