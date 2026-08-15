export type LegacyPath =
  | '/aweme/v1/user/'
  | '/aweme/v1/discover/search/'
  | '/aweme/v1/aweme/detail/'
  | '/aweme/v1/feed/'
  | '/aweme/v1/user/follower/list/'
  | '/aweme/v1/user/following/list/'
  | '/aweme/v1/comment/list/';

export interface UpstreamResponse {
  httpStatus: number;
  data: unknown;
  byteLength: number;
  elapsedMs: number;
}

export interface EndpointClient {
  get(
    path: LegacyPath,
    params: Record<string, string | number | boolean | undefined>,
    options?: { signal?: AbortSignal },
  ): Promise<UpstreamResponse>;
}
