import crypto from 'crypto';
import { JobPosting, SearchParams, SearchResponse } from '../types';
import { getRapidAPIConfig } from '../utils/config';

// JSearch API response types (based on actual API)
interface JSearchJob {
  job_id: string;
  employer_name: string;
  job_title: string;
  job_description: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_is_remote: boolean;
  job_posted_at_timestamp?: number;
  job_posted_at_datetime_utc?: string;
  job_apply_link: string;
  job_employment_type?: string;
  job_min_salary?: number;
  job_max_salary?: number;
  job_salary_currency?: string;
  job_salary_period?: string;
  job_required_skills?: string[];
  employer_website?: string;
}

interface JSearchResponse {
  status: string;
  request_id?: string;
  data: JSearchJob[];
  num_pages?: number;
}

/**
 * Map days to JSearch date_posted filter values
 */
function mapDaysToApi(days: number): string {
  if (days <= 1) return 'today';
  if (days <= 3) return '3days';
  if (days <= 7) return 'week';
  if (days <= 14) return 'month'; // JSearch doesn't have 14 days, use month
  return 'all';
}

/**
 * Generate stable ID from job data if provider doesn't provide one
 */
function hashId(job: JSearchJob): string {
  if (job.job_id) return job.job_id;
  const data = `${job.employer_name}-${job.job_title}-${job.job_posted_at_datetime_utc}`;
  return crypto.createHash('md5').update(data).digest('hex').slice(0, 16);
}

/**
 * Normalize JSearch response to our JobPosting format
 */
function normalizeJob(job: JSearchJob): JobPosting {
  // Build location string
  let location = 'Not specified';
  if (job.job_city && job.job_state) {
    location = `${job.job_city}, ${job.job_state}`;
  } else if (job.job_city) {
    location = job.job_city;
  } else if (job.job_state) {
    location = job.job_state;
  }

  // Extract snippet from description
  const descriptionSnippet = job.job_description
    ? job.job_description.slice(0, 200).replace(/<[^>]*>/g, '') + '...'
    : '';

  // Parse salary
  let salary: JobPosting['salary'] | undefined;
  if (job.job_min_salary || job.job_max_salary) {
    salary = {
      min: job.job_min_salary,
      max: job.job_max_salary,
      currency: job.job_salary_currency || 'USD',
      period: (job.job_salary_period as 'year' | 'month' | 'hour') || 'year',
    };
  }

  // Parse posted date
  let postedAt = new Date().toISOString();
  if (job.job_posted_at_datetime_utc) {
    postedAt = job.job_posted_at_datetime_utc;
  } else if (job.job_posted_at_timestamp) {
    postedAt = new Date(job.job_posted_at_timestamp * 1000).toISOString();
  }

  return {
    id: hashId(job),
    title: job.job_title,
    company: job.employer_name,
    location,
    remote: job.job_is_remote,
    postedAt,
    descriptionSnippet,
    source: 'JSearch',
    applyUrl: job.job_apply_link,
    salary,
    tags: job.job_required_skills,
    raw: job,
  };
}

/**
 * Search jobs via RapidAPI JSearch
 */
export async function searchJobs(params: SearchParams): Promise<SearchResponse> {
  const config = getRapidAPIConfig();
  const { q, page = 1, location, remote, employmentType, postedSinceDays } = params;

  // Build query URL
  const url = new URL('/search', config.baseUrl);
  url.searchParams.set('query', q);
  url.searchParams.set('page', String(page));
  url.searchParams.set('num_pages', '1');

  if (remote !== undefined) {
    url.searchParams.set('remote_jobs_only', String(remote));
  }
  if (location) {
    url.searchParams.set('query', `${q} in ${location}`);
  }
  if (employmentType && employmentType.length > 0) {
    url.searchParams.set('employment_types', employmentType.join(','));
  }
  if (postedSinceDays) {
    url.searchParams.set('date_posted', mapDaysToApi(postedSinceDays));
  }

  // Make request
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': config.key,
      'X-RapidAPI-Host': config.host,
    },
  });

  // Handle errors
  if (!response.ok) {
    if (response.status === 429) {
      throw {
        code: 'RATE_LIMIT',
        message: 'Too many requests. Please try again in a few moments.',
        status: 429,
      };
    }

    const errorBody = await response.text().catch(() => 'Unknown error');
    throw {
      code: 'PROVIDER_ERROR',
      message: `RapidAPI error: ${response.statusText}`,
      status: response.status,
      details: errorBody,
    };
  }

  // Parse response
  const data: JSearchResponse = await response.json();

  // Normalize jobs
  const jobs = (data.data || []).map(normalizeJob);

  return {
    items: jobs,
    page,
    nextPage: data.num_pages && page < data.num_pages ? page + 1 : undefined,
    totalApprox: data.num_pages ? data.num_pages * config.pageSize : jobs.length,
    meta: {
      provider: 'JSearch',
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Generate cache key for search params
 */
export function getCacheKey(params: SearchParams): string {
  return JSON.stringify(params);
}
