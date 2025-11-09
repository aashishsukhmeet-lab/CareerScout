import { JobPosting } from '../types';

interface JobCardProps {
  job: JobPosting;
}

function formatPostedDate(postedAt: string): string {
  const now = new Date();
  const posted = new Date(postedAt);
  const diffMs = now.getTime() - posted.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1d ago';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function formatSalary(salary: JobPosting['salary']): string | null {
  if (!salary) return null;

  const { min, max, currency = 'USD', period = 'year' } = salary;
  const periodSymbol = period === 'year' ? '/yr' : period === 'hour' ? '/hr' : '/mo';

  if (min && max) {
    return `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}${periodSymbol}`;
  }
  if (min) {
    return `${currency} ${min.toLocaleString()}+${periodSymbol}`;
  }
  if (max) {
    return `Up to ${currency} ${max.toLocaleString()}${periodSymbol}`;
  }
  return null;
}

export default function JobCard({ job }: JobCardProps) {
  const salary = formatSalary(job.salary);
  const postedAge = formatPostedDate(job.postedAt);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{job.title}</h3>
          <p className="text-sm text-gray-600 mt-1">{job.company}</p>

          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>{job.location}</span>
            </div>

            {job.remote && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                Remote
              </span>
            )}

            <span className="text-xs">• {postedAge}</span>
          </div>

          {salary && (
            <p className="text-sm font-medium text-gray-700 mt-2">{salary}</p>
          )}

          <p className="text-sm text-gray-600 mt-3 line-clamp-2">{job.descriptionSnippet}</p>

          {job.tags && job.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {job.tags.slice(0, 5).map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                </span>
              ))}
              {job.tags.length > 5 && (
                <span className="text-xs text-gray-500 self-center">
                  +{job.tags.length - 5} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
        <a
          href={job.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          Apply Now
        </a>
        <span className="text-xs text-gray-400">via {job.source}</span>
      </div>
    </div>
  );
}
