import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { SearchParams } from '../types';

interface UseJobSearchOptions {
  enabled?: boolean;
}

/**
 * Hook for job search with URL state synchronization
 */
export function useJobSearch(options?: UseJobSearchOptions) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse search params from URL
  const q = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const location = searchParams.get('location') || undefined;
  const remote = searchParams.get('remote') === 'true' ? true : undefined;
  const employmentType = searchParams.get('employmentType')?.split(',') || undefined;
  const postedSinceDays = searchParams.get('postedSinceDays')
    ? parseInt(searchParams.get('postedSinceDays')!, 10)
    : undefined;

  const params: SearchParams = {
    q,
    page,
    location,
    remote,
    employmentType,
    postedSinceDays,
  };

  // Query for search results
  const query = useQuery({
    queryKey: ['jobSearch', params],
    queryFn: () => api.searchJobs(params),
    enabled: (options?.enabled ?? true) && q.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update URL params
  const updateParams = (updates: Partial<SearchParams>) => {
    const newParams = new URLSearchParams(searchParams);

    // Update query
    if (updates.q !== undefined) {
      if (updates.q) {
        newParams.set('q', updates.q);
      } else {
        newParams.delete('q');
      }
    }

    // Update page (reset to 1 if not specified)
    if (updates.page !== undefined) {
      if (updates.page > 1) {
        newParams.set('page', updates.page.toString());
      } else {
        newParams.delete('page');
      }
    } else if (updates.q !== undefined) {
      // Reset page when query changes
      newParams.delete('page');
    }

    // Update location
    if (updates.location !== undefined) {
      if (updates.location) {
        newParams.set('location', updates.location);
      } else {
        newParams.delete('location');
      }
      newParams.delete('page'); // Reset page
    }

    // Update remote
    if (updates.remote !== undefined) {
      if (updates.remote) {
        newParams.set('remote', 'true');
      } else {
        newParams.delete('remote');
      }
      newParams.delete('page');
    }

    // Update employment type
    if (updates.employmentType !== undefined) {
      if (updates.employmentType.length > 0) {
        newParams.set('employmentType', updates.employmentType.join(','));
      } else {
        newParams.delete('employmentType');
      }
      newParams.delete('page');
    }

    // Update posted since
    if (updates.postedSinceDays !== undefined) {
      if (updates.postedSinceDays) {
        newParams.set('postedSinceDays', updates.postedSinceDays.toString());
      } else {
        newParams.delete('postedSinceDays');
      }
      newParams.delete('page');
    }

    setSearchParams(newParams);
  };

  return {
    ...query,
    params,
    updateParams,
  };
}
