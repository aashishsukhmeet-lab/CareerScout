import { describe, it, expect } from 'vitest';
import {
  jaccardSimilarity,
  countTagMatches,
  hasTagOverlap,
  cosineSimilarity,
} from './similarity';

describe('Similarity Utils', () => {
  describe('jaccardSimilarity', () => {
    it('should return 1 for identical arrays', () => {
      const tags = ['ai', 'mlops', 'python'];
      expect(jaccardSimilarity(tags, tags)).toBe(1);
    });

    it('should return 0 for completely different arrays', () => {
      const tagsA = ['ai', 'mlops'];
      const tagsB = ['product', 'pm'];
      expect(jaccardSimilarity(tagsA, tagsB)).toBe(0);
    });

    it('should calculate partial similarity correctly', () => {
      const tagsA = ['ai', 'mlops', 'python'];
      const tagsB = ['ai', 'python', 'data'];
      // Intersection: ai, python (2) | Union: ai, mlops, python, data (4)
      expect(jaccardSimilarity(tagsA, tagsB)).toBe(0.5);
    });

    it('should be case insensitive', () => {
      const tagsA = ['AI', 'MLOps'];
      const tagsB = ['ai', 'mlops'];
      expect(jaccardSimilarity(tagsA, tagsB)).toBe(1);
    });
  });

  describe('countTagMatches', () => {
    it('should count matching tags', () => {
      const tagsA = ['ai', 'mlops', 'python'];
      const tagsB = ['ai', 'python', 'data'];
      expect(countTagMatches(tagsA, tagsB)).toBe(2);
    });

    it('should return 0 for no matches', () => {
      const tagsA = ['ai', 'mlops'];
      const tagsB = ['product', 'pm'];
      expect(countTagMatches(tagsA, tagsB)).toBe(0);
    });
  });

  describe('hasTagOverlap', () => {
    it('should return true for overlapping tags', () => {
      const tagsA = ['ai', 'mlops'];
      const tagsB = ['ai', 'data'];
      expect(hasTagOverlap(tagsA, tagsB)).toBe(true);
    });

    it('should return false for non-overlapping tags', () => {
      const tagsA = ['ai', 'mlops'];
      const tagsB = ['product', 'pm'];
      expect(hasTagOverlap(tagsA, tagsB)).toBe(false);
    });
  });

  describe('cosineSimilarity', () => {
    it('should calculate cosine similarity correctly', () => {
      const vectorA = { ai: 3, mlops: 2 };
      const vectorB = { ai: 1, mlops: 1, data: 1 };

      const similarity = cosineSimilarity(vectorA, vectorB);
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('should return 0 for orthogonal vectors', () => {
      const vectorA = { ai: 1 };
      const vectorB = { product: 1 };

      expect(cosineSimilarity(vectorA, vectorB)).toBe(0);
    });
  });
});
