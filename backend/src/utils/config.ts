/**
 * Environment configuration validation
 */

export interface RapidAPIConfig {
  key: string;
  host: string;
  baseUrl: string;
  defaultQuery: string;
  pageSize: number;
}

export function getRapidAPIConfig(): RapidAPIConfig {
  const key = process.env.RAPIDAPI_KEY;
  const host = process.env.RAPIDAPI_HOST || 'jsearch.p.rapidapi.com';
  const baseUrl = process.env.RAPIDAPI_BASE_URL || 'https://jsearch.p.rapidapi.com';
  const defaultQuery = process.env.DEFAULT_SEED_QUERY || 'product manager';
  const pageSize = parseInt(process.env.PAGE_SIZE || '20', 10);

  // Only validate in non-test environments
  if (process.env.NODE_ENV !== 'test' && !key) {
    throw new Error(
      '❌ RAPIDAPI_KEY is required but not set. Please add it to your .env file.\n' +
      'Get your key at: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch'
    );
  }

  return {
    key: key || 'test-key',
    host,
    baseUrl,
    defaultQuery,
    pageSize,
  };
}

export function validateConfig(): void {
  try {
    getRapidAPIConfig();
    console.log('✅ RapidAPI configuration validated');
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Configuration error');
    process.exit(1);
  }
}
