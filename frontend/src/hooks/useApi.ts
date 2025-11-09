import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { OnboardingData, FeedbackRequest } from '../types';

// Feed
export function useFeed(params?: { page?: number; includeHidden?: boolean }) {
  return useQuery({
    queryKey: ['feed', params],
    queryFn: () => api.getFeed(params),
  });
}

// Profile
export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: api.getProfile,
    retry: false,
  });
}

export function useOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: OnboardingData) => api.saveOnboarding(data),
    onSuccess: (data) => {
      queryClient.setQueryData(['profile'], data);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

// Feedback
export function useFeedback() {
  const queryClient = useQueryClient();

  const submitFeedback = useMutation({
    mutationFn: ({ roleId, data }: { roleId: string; data: FeedbackRequest }) =>
      api.submitFeedback(roleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['insights'] });
    },
  });

  const undoFeedback = useMutation({
    mutationFn: (roleId: string) => api.undoFeedback(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['insights'] });
    },
  });

  return { submitFeedback, undoFeedback };
}

// Insights
export function useInsights() {
  return useQuery({
    queryKey: ['insights'],
    queryFn: api.getInsights,
  });
}

export function useResetMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.resetMemory,
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
