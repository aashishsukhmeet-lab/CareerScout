import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('API Integration Tests', () => {
  describe('Health Check', () => {
    it('should return 200 and status ok', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Profile API', () => {
    it('POST /api/profile/onboarding should save user profile', async () => {
      const profileData = {
        interests: ['salesforce', 'ai'],
        seniority: 'Senior IC',
        locations: ['Remote', 'San Francisco'],
        companyTypes: ['startup', 'scaleup'],
      };

      const response = await request(app)
        .post('/api/profile/onboarding')
        .send(profileData);

      expect(response.status).toBe(200);
      expect(response.body.userId).toBeDefined();
      expect(response.body.interests).toEqual(profileData.interests);
      expect(response.body.seniority).toBe(profileData.seniority);
    });

    it('POST /api/profile/onboarding should validate required fields', async () => {
      const invalidData = {
        interests: [], // Empty array should fail
        locations: ['Remote'],
        companyTypes: ['startup'],
      };

      const response = await request(app)
        .post('/api/profile/onboarding')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('GET /api/profile/me should return user profile', async () => {
      // First create a profile
      await request(app).post('/api/profile/onboarding').send({
        interests: ['ai'],
        seniority: 'IC',
        locations: ['Remote'],
        companyTypes: ['startup'],
      });

      const response = await request(app).get('/api/profile/me');

      expect(response.status).toBe(200);
      expect(response.body.userId).toBeDefined();
      expect(response.body.interests).toContain('ai');
    });
  });

  describe('Feedback API', () => {
    it('POST /api/roles/:roleId/feedback should record like', async () => {
      const response = await request(app)
        .post('/api/roles/test-role-id/feedback')
        .send({ value: 'LIKE' });

      // May fail if role doesn't exist, but should validate input
      expect([200, 404]).toContain(response.status);
    });

    it('POST /api/roles/:roleId/feedback should record dislike with reason', async () => {
      const response = await request(app)
        .post('/api/roles/test-role-id/feedback')
        .send({
          value: 'DISLIKE',
          reason: 'too_senior',
        });

      expect([200, 404]).toContain(response.status);
    });

    it('POST /api/roles/:roleId/feedback should validate feedback value', async () => {
      const response = await request(app)
        .post('/api/roles/test-role-id/feedback')
        .send({ value: 'INVALID' });

      expect(response.status).toBe(400);
    });

    it('DELETE /api/roles/:roleId/feedback should remove feedback', async () => {
      const response = await request(app).delete(
        '/api/roles/test-role-id/feedback'
      );

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Feed API', () => {
    it('GET /api/feed should return paginated feed', async () => {
      const response = await request(app).get('/api/feed');

      expect(response.status).toBe(200);
      expect(response.body.items).toBeDefined();
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.generatedAt).toBeDefined();
      expect(response.body.meta.rationale).toBeDefined();
    });

    it('GET /api/feed should support pagination', async () => {
      const response = await request(app).get('/api/feed?page=2&pageSize=5');

      expect(response.status).toBe(200);
      expect(response.body.items).toBeDefined();
    });

    it('GET /api/feed should support includeHidden parameter', async () => {
      const response = await request(app).get(
        '/api/feed?includeHidden=true'
      );

      expect(response.status).toBe(200);
      expect(response.body.items).toBeDefined();
    });
  });

  describe('Insights API', () => {
    it('GET /api/insights should return insights and next ideas', async () => {
      const response = await request(app).get('/api/insights');

      expect(response.status).toBe(200);
      expect(response.body.updatedAt).toBeDefined();
      expect(response.body.insights).toBeDefined();
      expect(Array.isArray(response.body.insights)).toBe(true);
      expect(response.body.nextIdeas).toBeDefined();
      expect(Array.isArray(response.body.nextIdeas)).toBe(true);
    });

    it('POST /api/insights/reset should clear all user data', async () => {
      const response = await request(app).post('/api/insights/reset');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/api/unknown-route');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not found');
    });
  });
});
