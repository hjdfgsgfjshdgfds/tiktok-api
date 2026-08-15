# Mobile signing research review

Reviewed on 2026-08-15. This document records why two additional public repositories were not embedded as production dependencies.

## Evaluation rules

A signing source is considered implementable only when it supplies all of the following:

1. a complete, buildable implementation
2. an explicit license permitting reuse
3. a request contract tied to the exact TikTok app/endpoint generation
4. required headers, body hashing, parameter serialization, and device context
5. deterministic fixtures or tests
6. exact target-response validation
7. no copied session, cookie, proxy, token, or device secrets

Algorithm names alone are not enough. A generated header can be internally valid for one app version and still fail because the request bytes, device registration, app version, host, or server-side expectations differ.

## `huaerxiela/douyin-algorithm`

Repository: <https://github.com/huaerxiela/douyin-algorithm>

### What the source supports

- Historical native C/C++ research around Douyin 23.2.0 arm64.
- Generation/decode research for the four-header generation: `X-Ladon`, `X-Argus`, `X-Gorgon`, and `X-Khronos`.
- Protobuf structures and supporting crypto primitives.
- A Ladon known-result demonstration and Argus inspection utilities.

### Blocking gaps

- The author says the project is no longer updated.
- The README warns that its SM3 implementation produces incorrect results in some cases.
- Later `X-Helios` and `X-Medusa` support is not implemented.
- The demo labels Argus encryption work as unfinished, creating uncertainty relative to the broader README claim.
- The target is Douyin rather than a proven current TikTok build.
- It does not provide the requested target-feed HTTP request, current device registration, or an end-to-end response test.
- No license file was present in the inspected tree.

### Aweme Lens treatment

Research reference only. No code copied, compiled, translated, vendored, or called at runtime.

## `edwinjson/tiktok-api`

Repository: <https://github.com/edwinjson/tiktok-api>

### What the source supports

- Examples name the mobile header family `X-Argus`, `X-Ladon`, `X-Gorgon`, and `X-Khronos`.
- Examples show app-style host/path and query-parameter patterns for follow, digg, comments, and account operations.
- The README claims additional web signing and device-registration capabilities.

### Blocking gaps

- The repository has four files and is not self-contained.
- `main.py` depends on absent `utils.signer`, `utils.solver`, device, and proxy files.
- `example.py` depends on an absent `signer` module.
- `argus.py` contains unresolved decompiler symbols and cannot serve as a runnable signer.
- The examples include hard-coded authentication/session/cookie/proxy/device material and must not be reused.
- The examples focus on state-changing account operations and comments rather than a validated public lookup service.
- There are no focused tests or fixtures proving current target identity matching.
- No license file was present in the inspected tree.

### Aweme Lens treatment

Research reference only. No secrets or code copied. State-changing/account-creation flows are intentionally outside Aweme Lens.

## Resulting architecture decision

The existing external signer bridge remains the only live signing boundary:

```text
Aweme Lens server
  -> fixed allowlisted legacy endpoint + exact identifier
  -> operator-owned HTTPS signer bridge
  -> signer may append signatures but cannot alter host, path, or required parameters
```

Aweme Lens will not expose a generic signing oracle, arbitrary URL proxy, device-registration endpoint, account creator, follow/like/comment action, or browser-supplied credential path.

The modern target-feed capability remains `unsupported` until a complete and reproducible implementation satisfies the evaluation rules above.
