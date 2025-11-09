import { useQueryClient } from '@tanstack/react-query';
import { useFeed } from '../hooks/useApi';
import { useAppStore } from '../hooks/useAppStore';
import RoleCard from './RoleCard';
import { useState } from 'react';

export default function Feed() {
  const queryClient = useQueryClient();
  const showHidden = useAppStore((s) => s.showHidden);
  const setShowHidden = useAppStore((s) => s.setShowHidden);
  const lastRefreshTime = useAppStore((s) => s.lastRefreshTime);
  const setLastRefreshTime = useAppStore((s) => s.setLastRefreshTime);

  const [page, setPage] = useState(1);

  const { data, isLoading, error, isFetching } = useFeed({
    page,
    includeHidden: showHidden,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['feed'] });
    setLastRefreshTime(new Date());
    setPage(1);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your personalized feed...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load feed</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Your Role Feed</h1>
            <button
              onClick={handleRefresh}
              disabled={isFetching}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>{isFetching ? '🔄' : '🔄'}</span>
              {isFetching ? 'Refreshing...' : 'Refresh Feed'}
            </button>
          </div>

          {lastRefreshTime && (
            <div className="text-sm text-gray-600 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
              ✅ Feed refreshed at {formatTime(lastRefreshTime)}
            </div>
          )}

          {/* Show Hidden Toggle */}
          <div className="mt-4 flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showHidden}
                onChange={(e) => setShowHidden(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Show hidden/disliked roles</span>
            </label>
          </div>

          {/* Meta Info */}
          {data?.meta && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-xs font-semibold text-blue-900 mb-1">Feed Info:</div>
              <ul className="text-xs text-blue-800 space-y-1">
                {data.meta.rationale.map((reason, idx) => (
                  <li key={idx}>• {reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Role Cards */}
        <div className="space-y-4">
          {data?.items.map((role) => (
            <RoleCard key={role.id} role={role} />
          ))}
        </div>

        {/* Pagination */}
        {data?.items && data.items.length > 0 && (
          <div className="mt-8 flex justify-center gap-4">
            {page > 1 && (
              <button
                onClick={() => setPage(page - 1)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                ← Previous
              </button>
            )}
            <span className="px-4 py-2 text-gray-600">Page {page}</span>
            {data.nextPage && (
              <button
                onClick={() => setPage(page + 1)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Next →
              </button>
            )}
          </div>
        )}

        {data?.items.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">
              {showHidden
                ? 'No roles found'
                : 'No new roles to show. Try toggling "Show hidden" or adjusting your preferences.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
