import {
  FeedResponse,
  LearnedResponse,
  UserProfile,
  OnboardingData,
  FeedbackRequest,
} from '../types';

const API_BASE = '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Profile
  getProfile: () => fetchJSON<UserProfile>('/profile/me'),

  saveOnboarding: (data: OnboardingData) =>
    fetchJSON<UserProfile>('/profile/onboarding', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Feed
  getFeed: (params?: { page?: number; pageSize?: number; includeHidden?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.pageSize) query.set('pageSize', params.pageSize.toString());
    if (params?.includeHidden) query.set('includeHidden', 'true');

    return fetchJSON<FeedResponse>(`/feed?${query}`);
  },

  // Feedback
  submitFeedback: (roleId: string, data: FeedbackRequest) =>
    fetchJSON(`/roles/${roleId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  undoFeedback: (roleId: string) =>
    fetchJSON(`/roles/${roleId}/feedback`, {
      method: 'DELETE',
    }),

  // Insights
  getInsights: () => fetchJSON<LearnedResponse>('/insights'),

  resetMemory: () =>
    fetchJSON('/insights/reset', {
      method: 'POST',
    }),
};
