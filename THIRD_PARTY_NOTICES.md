# Third-party notices

## `szdc/tiktok-api`

Aweme Lens was designed from endpoint and response-shape evidence in the connected
GitHub fork `hjdfgsgfjshdgfds/tiktok-api`, whose upstream project is
`szdc/tiktok-api`.

Portions of the legacy request-contract adaptation—including documented endpoint
paths, query ordering, device/application parameter names, large-integer handling,
and response field names—are based on that MIT-licensed project. The original
copyright and permission notice are preserved below.

> MIT License
>
> Copyright (c) 2018 Jack Willis-Craig
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all
> copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.

Aweme Lens does not bundle credentials, captured traffic, session material, or a
TikTok signing implementation. Its new code adds independent validation,
normalization, provenance, rate limiting, redaction, and user-interface behavior.

## Additional research references

The following repositories were inspected but no code was incorporated:

- `huaerxiela/douyin-algorithm`
- `edwinjson/tiktok-api`

Neither inspected tree contained a license file. Their code is therefore not copied,
translated, vendored, or distributed with Aweme Lens. The repositories are referenced
only in the evidence documentation. Authentication, cookie, session, device, and proxy
values visible in examples were treated as sensitive and were not reproduced.
