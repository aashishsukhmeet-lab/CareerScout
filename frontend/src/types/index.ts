export type FeedbackValue = 'LIKE' | 'DISLIKE';

export type DislikeReason =
  | 'not_relevant'
  | 'too_senior'
  | 'too_junior'
  | 'location_mismatch'
  | 'compensation'
  | 'company_fit';

export interface Role {
  id: string;
  title: string;
  company: string;
  location: string | null;
  tags: string[];
  description?: string | null;
  createdAt: string;
}

export interface ScoredRole extends Role {
  score: number;
  rationale: string[];
}

export interface UserProfile {
  userId: string;
  interests: string[];
  seniority?: string | null;
  locations: string[];
  companyTypes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FeedResponse {
  items: ScoredRole[];
  nextPage?: number;
  meta: {
    generatedAt: string;
    rationale: string[];
  };
}

export interface Insight {
  title: string;
  detail: string;
  weight: number;
}

export interface LearnedResponse {
  updatedAt: string;
  insights: Insight[];
  nextIdeas: string[];
}

export interface OnboardingData {
  interests: string[];
  seniority?: string;
  locations: string[];
  companyTypes: string[];
}

export interface FeedbackRequest {
  value: FeedbackValue;
  reason?: DislikeReason;
}

// Job Search Types
export interface JobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  postedAt: string;
  descriptionSnippet: string;
  source: string;
  applyUrl: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: 'year' | 'month' | 'hour';
  };
  tags?: string[];
  raw?: unknown;
}

export interface SearchResponse {
  items: JobPosting[];
  page: number;
  nextPage?: number;
  totalApprox?: number;
  cached?: boolean;
  meta: {
    provider: string;
    generatedAt: string;
  };
}

export interface SearchParams {
  q: string;
  page?: number;
  location?: string;
  remote?: boolean;
  employmentType?: string[];
  postedSinceDays?: number;
}
