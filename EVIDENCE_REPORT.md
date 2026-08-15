# GitHub evidence inspection report

Reviewed on 2026-08-15 before publishing the Aweme Lens application.

## 1. `hjdfgsgfjshdgfds/tiktok-api`

This is the user-owned fork selected as the publication target. Its previous working tree came from `szdc/tiktok-api`; that history remains available in Git even though the current tree is replaced by Aweme Lens.

### Status

- fork of `szdc/tiktok-api`
- upstream archived
- repository README says it is no longer maintained
- targets TikTok 9.1.0-era behavior
- latest upstream code push shown by GitHub metadata: 2021-09-01
- requires caller-provided `signURL`
- requires legacy `device_id`, `fp`, `iid`, and `openudid`
- tests use mocked Axios responses and a no-op signer

### Concrete reusable evidence

1. Request methods and paths in `src/index.ts`
2. base host default and legacy request headers in `src/index.ts`
3. exact query parameter order in `src/params.ts`
4. large-integer parsing with `json-bigint` and `storeAsString: true`
5. profile fields in `src/types/user.d.ts`
6. Aweme fields in `src/types/post.d.ts`
7. video fields in `src/types/video.d.ts`
8. feed `aweme_list` shape in `src/types/feed.d.ts`
9. username search result shape in `src/types/search.d.ts`
10. follower/following/comment type evidence
11. repository-shaped fixtures under `test/testdata`

## 2. `huaerxiela/douyin-algorithm`

### Source-supported findings

- The repository README says it is no longer updated.
- It targets `com.ss.android.ugc.aweme` / Douyin 23.2.0 arm64.
- It describes support for `X-Ladon`, `X-Argus`, `X-Gorgon`, and `X-Khronos` for that generation.
- It says Douyin and TikTok use similar algorithms, but adaptation is still required.
- It warns that the bundled SM3 implementation is incorrect in some cases.
- It lists later `X-Helios` and `X-Medusa` work as incomplete.
- `main.cpp` includes Ladon and Argus demonstrations, but labels the Argus encryption test as unfinished.
- The latest inspected commit is the March 31, 2023 `archive` commit.
- No license file appears in the inspected repository tree.

### Decision

Useful for historical terminology and native-algorithm research, but not a current, licensed, end-to-end TikTok request signer. No source code was copied.

## 3. `edwinjson/tiktok-api`

### Source-supported findings

- The README claims mobile signatures, web signatures, device registration, and several endpoint operations.
- The tree contains only `README.md`, `argus.py`, `example.py`, and `main.py`.
- `main.py` imports `utils.signer` and other `utils` content that is not present in the tree.
- `example.py` imports a missing `signer` module.
- `argus.py` is decompiler-style incomplete code containing unresolved symbols rather than an executable implementation.
- Example requests contain hard-coded authentication, session, cookie, device, and proxy material. Aweme Lens neither copies nor logs those values.
- The latest inspected commit is from March 10, 2024.
- No license file appears in the inspected repository tree.

### Decision

Useful as evidence that the mobile request family commonly expects `X-Argus`, `X-Ladon`, `X-Gorgon`, and `X-Khronos`, and as examples of host/path naming. It is not a safe or self-contained dependency and does not establish a working target-feed lookup. No source code was copied.

## Evidence still not found

- a current, self-contained and licensed TikTok signer suitable for this Next.js service
- a reproducible implementation of `api16-normal-useast5.tiktokv.us/aweme/v1/feed/?aweme_id=...`
- live tests proving current target-feed compatibility
- safe current device registration for this use case
- story endpoint
- reproducible locked-region or account-origin endpoint
- current image-post/geofencing field mapping

## Implementation decision

Aweme Lens remains complete and runnable in mock mode. The legacy-live adapter is isolated behind explicit environment configuration and an operator-owned signer bridge. The additional repositories are documented as research references only. Unsupported modern features remain hard-disabled rather than being inferred from partial signature code or copied examples.
