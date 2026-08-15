export type LookupMode = 'mock' | 'legacy-live';

export type InputType = 'username' | 'user_id' | 'video_url' | 'aweme_id';

export type EntityType = 'profile' | 'post' | 'story' | 'unknown';

export type ValidationStatus =
  | 'validated'
  | 'partial'
  | 'target_missing'
  | 'unsupported'
  | 'failed';

export interface ParsedInput {
  original: string;
  type: InputType;
  value: string;
  username?: string;
  userId?: string;
  awemeId?: string;
  canonicalUrl?: string;
  numericAmbiguous?: boolean;
}

export interface LookupIssue {
  code: string;
  message: string;
  detail?: string;
}

export interface FieldProvenance {
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

export interface ResultSource {
  id: string;
  adapter: string;
  method: 'GET' | 'POST' | 'OPTIONS';
  host: string;
  path: string;
  status: 'enabled' | 'experimental' | 'unsupported' | 'evidence-only';
  attempt?: number;
  httpStatus?: number;
  validation?: ValidationStatus;
  note?: string;
}

export interface ProfileData {
  kind: 'profile';
  avatar?: string;
  avatarVariants?: string[];
  nickname?: string;
  username?: string;
  userId?: string;
  secUid?: string;
  signature?: string;
  verified?: boolean;
  privateAccount?: boolean;
  language?: string;
  region?: string;
  followers?: number;
  following?: number;
  friends?: number;
  hearts?: number;
  videoCount?: number;
  favoritingCount?: number;
  diggCount?: number;
  accountCreatedAt?: string;
  nicknameModifiedAt?: string;
  usernameModifiedAt?: string;
  storyAvailable?: boolean;
}

export interface PostStatistics {
  comments?: number;
  likes?: number;
  plays?: number;
  shares?: number;
  forwards?: number;
}

export interface PostData {
  kind: 'post';
  cover?: string;
  awemeId: string;
  description?: string;
  createdAt?: string;
  createdAtEpoch?: number;
  authorUsername?: string;
  authorUserId?: string;
  authorSecUid?: string;
  postRegion?: string;
  authorRegion?: string;
  statistics?: PostStatistics;
  durationMs?: number;
  contentType?: 'video' | 'image' | 'unknown';
  awemeType?: number;
  music?: {
    id?: string;
    title?: string;
    author?: string;
    durationSeconds?: number;
  };
  playbackUrls?: string[];
  downloadAllowed?: boolean;
  geofencing?: Record<string, unknown>;
  classification?: 'story' | 'regular' | 'unknown';
  status?: {
    private?: boolean;
    deleted?: boolean;
    commentsAllowed?: boolean;
    sharingAllowed?: boolean;
  };
}

export type LookupData = ProfileData | PostData;

export interface LookupResult {
  ok: boolean;
  input: {
    type: InputType | 'unknown';
    value: string;
  };
  entity: {
    type: EntityType;
  };
  data: LookupData | null;
  fields: FieldProvenance[];
  sources: ResultSource[];
  warnings: LookupIssue[];
  errors: LookupIssue[];
  retrievedAt: string;
  meta: {
    requestId: string;
    mode: LookupMode;
    adapter: string;
    attemptCount: number;
    validationStatus: ValidationStatus;
    cacheHit: boolean;
  };
  raw?: unknown;
}

export interface LookupExecution {
  status: number;
  result: LookupResult;
}

export interface EndpointCapability {
  id: string;
  adapter: string;
  method: 'GET' | 'POST' | 'OPTIONS';
  host: string;
  path: string;
  identifier: string;
  status: 'experimental' | 'unsupported' | 'evidence-only';
  productionEnabled: boolean;
  successCondition: string;
  targetValidation: string;
  evidence: string;
  note: string;
}
