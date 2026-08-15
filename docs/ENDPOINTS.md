# Endpoint evidence matrix

Reviewed against `hjdfgsgfjshdgfds/tiktok-api`, `huaerxiela/douyin-algorithm`, and `edwinjson/tiktok-api` on 2026-08-15.

The repository is a fork of archived `szdc/tiktok-api`, targets TikTok 9.1.0-era behavior, and requires an externally supplied URL signer. “Experimental” below means the request shape exists in source code; it does not mean the endpoint is currently live.

## Profile by user ID

| Property | Value |
|---|---|
| Adapter | `profileAdapter` |
| Method | `GET` |
| Host | `api2.musical.ly` by repository default |
| Path | `/aweme/v1/user/` |
| Identifier | `user_id` string |
| Authentication/signing | Legacy device parameters plus external `signURL`; optional cookies in the wrapper |
| Exact success condition | HTTP success, parseable object, `status_code === 0`, valid `user` object |
| Target validation | `user.uid === requested user_id` as strings |
| Important raw paths | `user.uid`, `user.unique_id`, `user.nickname`, `user.region`, avatar fields, count fields |
| Known failure modes | missing/malformed user, mismatched UID, nonzero status, 403, 429, timeout, stale signer |
| Rate-limit behavior | stop and cool down on 403/429 |
| Production enabled | No; mock enabled, legacy-live experimental |
| Repository evidence | `src/index.ts#getUser`, `src/types/user.d.ts`, `test/user.spec.ts`, `test/testdata/getUser.json` |

## Username search

| Property | Value |
|---|---|
| Adapter | `profileAdapter` |
| Method | `GET` |
| Host | `api2.musical.ly` |
| Path | `/aweme/v1/discover/search/` |
| Identifier | `keyword` username |
| Authentication/signing | Legacy device parameters plus external signer |
| Exact success condition | HTTP success, `status_code === 0`, array `user_list` |
| Target validation | find exact case-insensitive `user_info.unique_id`; do not accept first/fuzzy item |
| Important raw paths | `user_list[].user_info.unique_id`, `user_list[].user_info.uid` |
| Known failure modes | no exact match, malformed list, missing UID, signing/auth failure |
| Rate-limit behavior | stop and cool down on 403/429 |
| Production enabled | No; mock enabled, legacy-live experimental |
| Repository evidence | `src/index.ts#searchUsers`, `src/types/search.d.ts`, `test/search.spec.ts` |

## Legacy Aweme detail

| Property | Value |
|---|---|
| Adapter | `awemeAdapter` |
| Method | `GET` |
| Host | `api2.musical.ly` |
| Path | `/aweme/v1/aweme/detail/` |
| Identifier | `aweme_id` post ID string |
| Authentication/signing | Legacy device parameters plus external signer |
| Exact success condition | HTTP success, `status_code === 0`, valid candidate with exact requested ID |
| Target validation | `aweme_detail.aweme_id === requested aweme_id`; candidate utility also supports exact search in `aweme_list` |
| Important raw paths | `aweme_detail.aweme_id`, `author.uid`, `author.unique_id`, `region`, `statistics`, `video`, `music`, `status` |
| Known failure modes | wrong Aweme despite status 0, malformed candidate, author mismatch, 403, 429, timeout |
| Rate-limit behavior | bounded target-missing retries only; immediate cooldown on 403/429 |
| Production enabled | No; mock enabled, legacy-live experimental |
| Repository evidence | `src/index.ts#getPost`, `src/types/post.d.ts`, `src/types/video.d.ts`, `test/post.spec.ts`, `getPost.json` |

## Legacy feed list

| Property | Value |
|---|---|
| Adapter | validation evidence inside `awemeAdapter` |
| Method | `GET` |
| Host | `api2.musical.ly` |
| Path | `/aweme/v1/feed/` |
| Identifier | feed parameters in repository; **not** documented there as target-specific `aweme_id` |
| Authentication/signing | Legacy device parameters plus external signer |
| Exact success condition | HTTP success, `status_code === 0`, `aweme_list` array |
| Target validation | search every candidate for exact requested `aweme_id` before returning |
| Important raw paths | `aweme_list[].aweme_id`, `aweme_list[].author.uid` |
| Known failure modes | requested item absent despite successful feed response |
| Rate-limit behavior | not exposed by the application |
| Production enabled | No; evidence-only |
| Repository evidence | `src/index.ts#listForYouFeed`, `src/index.ts#listFollowingFeed`, `src/types/feed.d.ts` |

## Followers

| Property | Value |
|---|---|
| Adapter | `followersAdapter` capability record |
| Method | `GET` |
| Host/path | `api2.musical.ly/aweme/v1/user/follower/list/` |
| Identifier | `user_id` string |
| Authentication/signing | Legacy device parameters plus signer; account access may affect results |
| Exact success condition | HTTP success, `status_code === 0`, `followers` array |
| Target validation | preserve request user ID; endpoint response type has no target user object to revalidate |
| Important raw paths | `followers[]`, `max_time`, `min_time`, `has_more` |
| Known failure modes | private/account restrictions, auth/signing, pagination errors |
| Rate-limit behavior | not implemented in UI |
| Production enabled | No; evidence-only |
| Repository evidence | `src/index.ts#listFollowers`, `src/types/follower.d.ts` |

## Following

| Property | Value |
|---|---|
| Adapter | `followingAdapter` capability record |
| Method | `GET` |
| Host/path | `api2.musical.ly/aweme/v1/user/following/list/` |
| Identifier | `user_id` string |
| Authentication/signing | Legacy device parameters plus signer |
| Exact success condition | HTTP success, `status_code === 0`, `followings` array |
| Target validation | preserve request user ID |
| Important raw paths | `followings[]`, `max_time`, `min_time`, `has_more` |
| Known failure modes | private/account restrictions, auth/signing, pagination errors |
| Rate-limit behavior | not implemented in UI |
| Production enabled | No; evidence-only |
| Repository evidence | `src/index.ts#listFollowing`, `src/types/follower.d.ts` |

## Comments

| Property | Value |
|---|---|
| Adapter | `commentsAdapter` capability record |
| Method | `GET` |
| Host/path | `api2.musical.ly/aweme/v1/comment/list/` |
| Identifier | `aweme_id` string |
| Authentication/signing | Legacy device parameters plus signer |
| Exact success condition | HTTP success, `status_code === 0`, `comments` array |
| Target validation | every displayed `comment.aweme_id` should match the requested Aweme ID |
| Important raw paths | `comments[].aweme_id`, `comments[].cid`, `comments[].user`, `has_more`, `cursor` |
| Known failure modes | deleted/disabled comments, mismatched comments, auth/signing |
| Rate-limit behavior | not implemented in UI |
| Production enabled | No; evidence-only |
| Repository evidence | `src/index.ts#listComments`, `src/types/comment.d.ts` |

## Story

| Property | Value |
|---|---|
| Adapter | `storyAdapter` capability record |
| Method/host/path | Unsupported |
| Identifier | Unknown |
| Authentication/signing | No repository evidence |
| Exact success condition | None |
| Target validation | None |
| Important raw paths | None verified |
| Known failure modes | Not applicable |
| Rate-limit behavior | Not applicable |
| Production enabled | No |
| Repository evidence | No story endpoint or response type found |

## Requested modern api16 target-feed request

| Property | Value |
|---|---|
| Adapter | `awemeAdapter` unsupported capability record |
| Method | Brief mentioned `OPTIONS`; no reproducible lookup implementation found |
| Host | `api16-normal-useast5.tiktokv.us` |
| Path | `/aweme/v1/feed/?aweme_id={POST_ID}` |
| Identifier | `aweme_id` post ID |
| Authentication/signing | Additional repositories name older mobile header algorithms, but do not provide a safe, self-contained, licensed, tested signer for this exact request |
| Exact success condition | Cannot be established from an end-to-end implementation; Aweme Lens would require HTTP success, TikTok success, and exact requested-item presence |
| Target validation | Exact `aweme_list[].aweme_id` and optional `author.uid` matching would be mandatory |
| Important raw paths | `aweme_list[].aweme_id` is supported only as legacy response-shape evidence, not as proof of this host/request |
| Known failure modes | app-version mismatch, incomplete signatures, unregistered device context, target absent despite status 0, 403, 429, malformed/empty body |
| Rate-limit behavior | Required by the brief, but no concrete modern implementation evidence was found |
| Production enabled | **No — hard-disabled** |
| Repository evidence | `huaerxiela/douyin-algorithm` provides older Douyin signature research and warns of gaps; `edwinjson/tiktok-api` is incomplete and contains unsafe examples; neither proves this request |
