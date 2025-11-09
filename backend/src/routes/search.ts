import express from 'express';
import { z } from 'zod';
import { searchJobs, getCacheKey } from '../services/rapidapi';
import { LRUCache } from '../utils/cache';
import { SearchResponse } from '../types';

const router = express.Router();

// Cache for search results (5 minute TTL, max 100 entries)
const searchCache = new LRUCache<SearchResponse>(100, 5);

// Validation schema
const searchParamsSchema = z.object({
  q: z.string().min(1, 'Query is required').max(200, 'Query too long'),
  page: z.coerce.number().int().min(1).max(50).optional().default(1),
  location: z.string().max(100).optional(),
  remote: z
    .string()
    .optional()
    .transform(val => {
      if (val === undefined || val === '') return undefined;
      return val === 'true' || val === '1';
    }),
  employmentType: z
    .string()
    .optional()
    .transform(val => {
      if (!val) return undefined;
      return val.split(',').map(t => t.trim().toUpperCase());
    }),
  postedSinceDays: z.coerce.number().int().min(1).max(90).optional(),
});

/**
 * GET /api/jobs/search
 * Search for jobs via RapidAPI
 */
router.get('/', async (req, res) => {
  try {
    // Validate input
    const validation = searchParamsSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: validation.error.format(),
      });
    }

    const params = validation.data;

    // Check cache
    const cacheKey = getCacheKey(params);
    const cached = searchCache.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    // Fetch from RapidAPI
    const results = await searchJobs(params);

    // Cache results
    searchCache.set(cacheKey, results);

    // Return results
    res.json(results);
  } catch (error: any) {
    console.error('Search error:', error);

    // Handle rate limit
    if (error.code === 'RATE_LIMIT') {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: error.message,
        code: 'RATE_LIMIT',
      });
    }

    // Handle provider errors
    if (error.code === 'PROVIDER_ERROR') {
      return res.status(error.status || 502).json({
        error: 'Provider error',
        message: error.message,
        code: 'PROVIDER_ERROR',
      });
    }

    // Generic error
    res.status(500).json({
      error: 'Search failed',
      message: error.message || 'An unexpected error occurred',
    });
  }
});

export default router;
