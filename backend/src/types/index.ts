import { Role, FeedbackValue, DislikeReason } from '@prisma/client';

export interface ScoredRole extends Role {
  score: number;
  rationale: string[];
}

export interface UserPreferenceVector {
  tagFrequency: Record<string, number>;
  preferredTags: string[];
  dislikedTags: string[];
  seniority?: string;
  locations: string[];
  companyTypes: string[];
}

export interface RankingContext {
  userProfile?: {
    interests: string[];
    seniority?: string;
    locations: string[];
    companyTypes: string[];
  };
  insights?: Array<{
    title: string;
    detail: string;
    weight: number;
  }>;
  feedbackHistory: Array<{
    roleId: string;
    value: FeedbackValue;
    tags: string[];
    reason?: DislikeReason | null;
  }>;
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
