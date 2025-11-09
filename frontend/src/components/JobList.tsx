import { JobPosting } from '../types';
import JobCard from './JobCard';

interface JobListProps {
  jobs: JobPosting[];
  isLoading: boolean;
  error: Error | null;
  onRetry?: () => void;
  emptyMessage?: string;
  currentPage: number;
  hasNextPage: boolean;
  onNextPage: () => void;
  onPrevPage: () => void;
  totalApprox?: number;
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
      <div className="space-y-3">
        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="flex gap-3">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="flex gap-2">
          <div className="h-6 bg-gray-200 rounded w-16"></div>
          <div className="h-6 bg-gray-200 rounded w-16"></div>
          <div className="h-6 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const isRateLimit = error.message.includes('Rate limit') || error.message.includes('429');

  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
        <svg
          className="w-8 h-8 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {isRateLimit ? 'Too Many Requests' : 'Search Failed'}
      </h3>
      <p className="text-sm text-gray-600 mb-4 max-w-md mx-auto">
        {isRateLimit
          ? 'Too many requests. Please try again in a few moments.'
          : error.message || 'An error occurred while searching for jobs.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

function EmptyState({ message, query }: { message: string; query?: string }) {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Jobs Found</h3>
      <p className="text-sm text-gray-600 max-w-md mx-auto">
        {query ? (
          <>
            No jobs found for <span className="font-medium">"{query}"</span>. Try broader
            search terms or remove some filters.
          </>
        ) : (
          message
        )}
      </p>
    </div>
  );
}

export default function JobList({
  jobs,
  isLoading,
  error,
  onRetry,
  emptyMessage = 'No jobs to display',
  currentPage,
  hasNextPage,
  onNextPage,
  onPrevPage,
  totalApprox,
}: JobListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  if (jobs.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className="space-y-4">
      {/* Results count */}
      {totalApprox && (
        <div className="text-sm text-gray-600">
          Showing page {currentPage} of approximately {totalApprox.toLocaleString()} results
        </div>
      )}

      {/* Job cards */}
      <div className="space-y-4">
        {jobs.map(job => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-6">
        <button
          onClick={onPrevPage}
          disabled={currentPage === 1}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ← Previous
        </button>

        <span className="text-sm text-gray-600">Page {currentPage}</span>

        <button
          onClick={onNextPage}
          disabled={!hasNextPage}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
