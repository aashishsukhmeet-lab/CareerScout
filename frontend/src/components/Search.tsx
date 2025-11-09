import { useJobSearch } from '../hooks/useJobSearch';
import SearchBar from './SearchBar';
import JobFilters, { FilterValues } from './JobFilters';
import JobList from './JobList';

export default function Search() {
  const { data, isLoading, error, params, updateParams, refetch } = useJobSearch();

  const handleSearch = (query: string) => {
    updateParams({ q: query });
  };

  const handleFiltersChange = (filters: FilterValues) => {
    updateParams(filters);
  };

  const handleNextPage = () => {
    updateParams({ page: (params.page || 1) + 1 });
  };

  const handlePrevPage = () => {
    const currentPage = params.page || 1;
    if (currentPage > 1) {
      updateParams({ page: currentPage - 1 });
    }
  };

  const handleRetry = () => {
    refetch();
  };

  // Check if API key is missing (dev mode warning)
  const isDev = import.meta.env.DEV;
  const showConfigWarning = isDev && !params.q;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">CareerScout</h1>
            <div className="flex items-center gap-4">
              <a
                href="/feed"
                className="text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                ← Back to Feed
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Dev warning banner */}
      {showConfigWarning && (
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-yellow-800">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                <strong>Dev Mode:</strong> Make sure your <code>RAPIDAPI_KEY</code> is
                configured in the backend .env file
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Search Real Jobs</h2>
          <p className="text-gray-600">
            Find your next opportunity from thousands of live job postings
          </p>
        </div>

        {/* Search bar */}
        <div className="mb-6">
          <SearchBar initialValue={params.q} onSearch={handleSearch} />
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24">
              <JobFilters
                filters={{
                  location: params.location,
                  remote: params.remote,
                  employmentType: params.employmentType,
                  postedSinceDays: params.postedSinceDays,
                }}
                onChange={handleFiltersChange}
              />
            </div>
          </aside>

          {/* Results */}
          <main className="lg:col-span-3">
            {!params.q ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <svg
                    className="w-8 h-8 text-blue-600"
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
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Start Your Job Search
                </h3>
                <p className="text-sm text-gray-600 mb-4 max-w-md mx-auto">
                  Search for jobs by title, company, or keywords. Try:
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    'software engineer',
                    'product manager',
                    'data analyst',
                    'frontend developer',
                  ].map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => handleSearch(suggestion)}
                      className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <JobList
                jobs={data?.items || []}
                isLoading={isLoading}
                error={error}
                onRetry={handleRetry}
                emptyMessage={`No jobs found for "${params.q}"`}
                currentPage={params.page || 1}
                hasNextPage={!!data?.nextPage}
                onNextPage={handleNextPage}
                onPrevPage={handlePrevPage}
                totalApprox={data?.totalApprox}
              />
            )}

            {/* Cached indicator */}
            {data?.cached && (
              <div className="mt-4 text-xs text-gray-500 text-center">
                Results cached for faster performance
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
