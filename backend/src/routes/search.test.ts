import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import * as rapidapi from '../services/rapidapi';

// Mock the rapidapi service
vi.mock('../services/rapidapi', () => ({
  searchJobs: vi.fn(),
  getCacheKey: vi.fn((params) => JSON.stringify(params)),
}));

describe('Job Search API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/jobs/search', () => {
    it('should return 400 when query parameter is missing', async () => {
      const response = await request(app).get('/api/jobs/search');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid query parameters');
      expect(response.body.details).toBeDefined();
    });

    it('should return 400 when query is empty', async () => {
      const response = await request(app).get('/api/jobs/search?q=');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid query parameters');
    });

    it('should successfully search jobs with valid query', async () => {
      const mockResponse = {
        items: [
          {
            id: 'job-1',
            title: 'Software Engineer',
            company: 'Tech Corp',
            location: 'San Francisco, CA',
            remote: false,
            postedAt: '2025-01-15T00:00:00Z',
            descriptionSnippet: 'We are looking for...',
            source: 'JSearch',
            applyUrl: 'https://example.com/apply',
            tags: ['javascript', 'react'],
          },
        ],
        page: 1,
        nextPage: 2,
        totalApprox: 100,
        meta: {
          provider: 'JSearch',
          generatedAt: '2025-01-20T00:00:00Z',
        },
      };

      vi.mocked(rapidapi.searchJobs).mockResolvedValue(mockResponse);

      const response = await request(app).get('/api/jobs/search?q=software engineer');

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].title).toBe('Software Engineer');
      expect(response.body.page).toBe(1);
      expect(response.body.nextPage).toBe(2);
      expect(response.body.meta.provider).toBe('JSearch');
    });

    it('should handle page parameter', async () => {
      const mockResponse = {
        items: [],
        page: 3,
        totalApprox: 100,
        meta: {
          provider: 'JSearch',
          generatedAt: '2025-01-20T00:00:00Z',
        },
      };

      vi.mocked(rapidapi.searchJobs).mockResolvedValue(mockResponse);

      const response = await request(app).get('/api/jobs/search?q=engineer&page=3');

      expect(response.status).toBe(200);
      expect(rapidapi.searchJobs).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'engineer',
          page: 3,
        })
      );
    });

    it('should handle location filter', async () => {
      const mockResponse = {
        items: [],
        page: 1,
        totalApprox: 50,
        meta: {
          provider: 'JSearch',
          generatedAt: '2025-01-20T00:00:00Z',
        },
      };

      vi.mocked(rapidapi.searchJobs).mockResolvedValue(mockResponse);

      const response = await request(app).get(
        '/api/jobs/search?q=developer&location=New York'
      );

      expect(response.status).toBe(200);
      expect(rapidapi.searchJobs).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'developer',
          location: 'New York',
        })
      );
    });

    it('should handle remote filter', async () => {
      const mockResponse = {
        items: [],
        page: 1,
        totalApprox: 75,
        meta: {
          provider: 'JSearch',
          generatedAt: '2025-01-20T00:00:00Z',
        },
      };

      vi.mocked(rapidapi.searchJobs).mockResolvedValue(mockResponse);

      const response = await request(app).get('/api/jobs/search?q=engineer&remote=true');

      expect(response.status).toBe(200);
      expect(rapidapi.searchJobs).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'engineer',
          remote: true,
        })
      );
    });

    it('should handle employmentType filter', async () => {
      const mockResponse = {
        items: [],
        page: 1,
        totalApprox: 25,
        meta: {
          provider: 'JSearch',
          generatedAt: '2025-01-20T00:00:00Z',
        },
      };

      vi.mocked(rapidapi.searchJobs).mockResolvedValue(mockResponse);

      const response = await request(app).get(
        '/api/jobs/search?q=manager&employmentType=FULLTIME,PARTTIME'
      );

      expect(response.status).toBe(200);
      expect(rapidapi.searchJobs).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'manager',
          employmentType: ['FULLTIME', 'PARTTIME'],
        })
      );
    });

    it('should handle postedSinceDays filter', async () => {
      const mockResponse = {
        items: [],
        page: 1,
        totalApprox: 10,
        meta: {
          provider: 'JSearch',
          generatedAt: '2025-01-20T00:00:00Z',
        },
      };

      vi.mocked(rapidapi.searchJobs).mockResolvedValue(mockResponse);

      const response = await request(app).get(
        '/api/jobs/search?q=analyst&postedSinceDays=7'
      );

      expect(response.status).toBe(200);
      expect(rapidapi.searchJobs).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'analyst',
          postedSinceDays: 7,
        })
      );
    });

    it('should return 429 on rate limit error', async () => {
      vi.mocked(rapidapi.searchJobs).mockRejectedValue({
        code: 'RATE_LIMIT',
        message: 'Too many requests. Please try again in a few moments.',
        status: 429,
      });

      const response = await request(app).get('/api/jobs/search?q=engineer');

      expect(response.status).toBe(429);
      expect(response.body.error).toBe('Rate limit exceeded');
      expect(response.body.code).toBe('RATE_LIMIT');
    });

    it('should handle provider errors', async () => {
      vi.mocked(rapidapi.searchJobs).mockRejectedValue({
        code: 'PROVIDER_ERROR',
        message: 'RapidAPI error: Service Unavailable',
        status: 503,
      });

      const response = await request(app).get('/api/jobs/search?q=developer');

      expect(response.status).toBe(503);
      expect(response.body.error).toBe('Provider error');
      expect(response.body.code).toBe('PROVIDER_ERROR');
    });

    it('should handle generic errors', async () => {
      vi.mocked(rapidapi.searchJobs).mockRejectedValue(
        new Error('Network error')
      );

      const response = await request(app).get('/api/jobs/search?q=designer');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Search failed');
    });

    it('should return empty results gracefully', async () => {
      const mockResponse = {
        items: [],
        page: 1,
        totalApprox: 0,
        meta: {
          provider: 'JSearch',
          generatedAt: '2025-01-20T00:00:00Z',
        },
      };

      vi.mocked(rapidapi.searchJobs).mockResolvedValue(mockResponse);

      const response = await request(app).get('/api/jobs/search?q=xyz123nonexistent');

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(0);
      expect(response.body.totalApprox).toBe(0);
    });

    it('should validate page is a positive integer', async () => {
      const response = await request(app).get('/api/jobs/search?q=engineer&page=-1');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid query parameters');
    });

    it('should validate page does not exceed maximum', async () => {
      const response = await request(app).get('/api/jobs/search?q=engineer&page=999');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid query parameters');
    });

    it('should validate query length', async () => {
      const longQuery = 'a'.repeat(201);
      const response = await request(app).get(`/api/jobs/search?q=${longQuery}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid query parameters');
    });
  });
});
