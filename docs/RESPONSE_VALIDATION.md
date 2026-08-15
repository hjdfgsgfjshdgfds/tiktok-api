# Response validation

## Central rule

A request succeeds only when the response contains the exact requested target.

The following are necessary but not sufficient:

- HTTP 200
- parseable JSON
- TikTok `status_code: 0`
- an `aweme_list` candidate container
- an `aweme_detail` object
- a `user` object

## Profile lookup

### Username

1. Call the evidence-backed user-search path with the normalized username.
2. Require a JSON object and `status_code === 0`.
3. Require `user_list` to be an array.
4. Search for an entry whose `user_info.unique_id`, compared case-insensitively, exactly equals the requested username.
5. Require that exact entry to contain a string `uid`.
6. Call profile-by-ID with that UID.
7. Require `user.uid` to exactly equal the requested UID.

A fuzzy nickname result or the first search item is never accepted.

### User ID

1. Call profile-by-ID.
2. Require a structurally valid `user` object.
3. Require `user.uid === requestedUserId` as strings.

## Aweme lookup

1. Call the evidence-backed legacy Aweme detail path.
2. Require a JSON object and `status_code === 0`.
3. Build candidate objects from:
   - `aweme_detail`, when present
   - every item in `aweme_list`, when present
4. Validate candidate field types.
5. Search for `candidate.aweme_id === requestedAwemeId` as strings.
6. When an expected author UID is known, require `author.uid` or `author_user_id` to match exactly.
7. For a direct TikTok URL containing a username, reject a conflicting returned `author.unique_id`.

The adapter never silently returns another Aweme.

## Target missing versus malformed

### `target_missing`

Used when the response is structurally meaningful but does not contain the requested identity.

Examples:

- exact username absent from `user_list`
- returned `user.uid` differs
- an `aweme_list` exists but is empty
- valid Aweme candidates exist, but all have a different `aweme_id`
- expected author UID differs

### `upstream_malformed`

Used when target validation cannot be performed safely.

Examples:

- empty body
- malformed JSON
- non-object envelope
- missing `status_code`
- `user_list` is not an array
- no Aweme candidate container exists
- all candidates fail structural validation
- an ID is a number instead of a string after parsing/validation

## Bounded retries

Only `target_missing` is eligible for the configured additional Aweme attempts. The maximum is one initial attempt plus `TARGET_MISSING_RETRIES`, which is constrained to 0–3.

No target-missing retry occurs for:

- HTTP 403
- HTTP 429
- timeout
- malformed body
- nonzero TikTok status
- signer failure
- unsafe signer URL
- generic upstream failure

All attempts also share `LOOKUP_BUDGET_MS`. When that end-to-end budget expires, its abort signal
stops in-flight signer/upstream work and retry delays, and the API returns the typed timeout path.

## 403 and 429 cooldown

The legacy client places the upstream host into cooldown after HTTP 403 or 429. A subsequent call during the cooldown fails locally before calling the signer or TikTok again.

This avoids rapid repeated requests after an authentication refusal or rate limit.

## Big integers

The legacy transport parses response bytes with `json-bigint` configured to store large integers as strings. Validation schemas require TikTok identifiers to be strings. The application never converts TikTok IDs to JavaScript numbers.

## Numeric input fallback

Bare numeric input is marked syntactically ambiguous. A fallback to the alternate entity type occurs only after the first adapter returns `target_missing`. The response includes:

- both request trails
- combined attempt count
- `numeric_id_disambiguated` warning
- the resolved input type

Use `user:<id>` or `aweme:<id>` when the type is known.
