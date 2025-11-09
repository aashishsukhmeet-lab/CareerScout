import { describe, it, expect } from 'vitest';
import { rankRoles, ensureExploration } from './ranking';
import { Role, FeedbackValue } from '@prisma/client';

describe('Ranking Service', () => {
  const mockRoles: Role[] = [
    {
      id: '1',
      title: 'Salesforce Developer',
      company: 'Company A',
      location: 'Remote',
      tags: ['salesforce', 'crm'],
      description: null,
      createdAt: new Date('2024-01-15'),
    },
    {
      id: '2',
      title: 'AI Engineer',
      company: 'Company B',
      location: 'San Francisco',
      tags: ['ai', 'mlops'],
      description: null,
      createdAt: new Date('2024-01-20'),
    },
    {
      id: '3',
      title: 'Product Manager',
      company: 'Company C',
      location: 'New York',
      tags: ['product', 'pm'],
      description: null,
      createdAt: new Date('2024-01-10'),
    },
  ];

  describe('rankRoles', () => {
    it('should rank roles based on tag similarity', () => {
      const ranked = rankRoles(mockRoles, {
        userProfile: {
          interests: ['salesforce', 'crm'],
          seniority: 'Senior IC',
          locations: ['Remote'],
          companyTypes: ['startup'],
        },
        feedbackHistory: [],
      });

      expect(ranked[0].id).toBe('1'); // Salesforce role should rank first
      expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    });

    it('should boost roles similar to liked roles', () => {
      const ranked = rankRoles(mockRoles, {
        userProfile: {
          interests: ['product'],
          seniority: 'Senior IC',
          locations: ['Remote'],
          companyTypes: ['startup'],
        },
        feedbackHistory: [
          {
            roleId: 'prev-role',
            value: FeedbackValue.LIKE,
            tags: ['salesforce', 'crm'],
            reason: null,
          },
        ],
      });

      const salesforceRole = ranked.find((r) => r.id === '1');
      expect(salesforceRole!.score).toBeGreaterThan(0);
      expect(salesforceRole!.rationale).toContain(
        expect.stringContaining('Similar to liked roles')
      );
    });

    it('should filter out disliked roles', () => {
      const ranked = rankRoles(mockRoles, {
        userProfile: {
          interests: ['ai'],
          seniority: 'Senior IC',
          locations: ['Remote'],
          companyTypes: ['startup'],
        },
        feedbackHistory: [
          {
            roleId: '2',
            value: FeedbackValue.DISLIKE,
            tags: ['ai', 'mlops'],
            reason: null,
          },
        ],
      });

      expect(ranked.find((r) => r.id === '2')).toBeUndefined();
    });

    it('should apply diversity penalty for same company', () => {
      const sameCompanyRoles: Role[] = [
        {
          id: '1',
          title: 'Role 1',
          company: 'SameCompany',
          location: 'Remote',
          tags: ['ai'],
          description: null,
          createdAt: new Date(),
        },
        {
          id: '2',
          title: 'Role 2',
          company: 'SameCompany',
          location: 'Remote',
          tags: ['ai'],
          description: null,
          createdAt: new Date(),
        },
        {
          id: '3',
          title: 'Role 3',
          company: 'SameCompany',
          location: 'Remote',
          tags: ['ai'],
          description: null,
          createdAt: new Date(),
        },
      ];

      const ranked = rankRoles(sameCompanyRoles, {
        userProfile: {
          interests: ['ai'],
          seniority: 'Senior IC',
          locations: ['Remote'],
          companyTypes: ['startup'],
        },
        feedbackHistory: [],
      });

      // Third role from same company should have diversity penalty
      const thirdRole = ranked[2];
      expect(thirdRole.rationale).toContain(
        expect.stringContaining('Diversity penalty')
      );
    });

    it('should give location match bonus', () => {
      const ranked = rankRoles(mockRoles, {
        userProfile: {
          interests: ['ai'],
          seniority: 'Senior IC',
          locations: ['San Francisco'],
          companyTypes: ['startup'],
        },
        feedbackHistory: [],
      });

      const sfRole = ranked.find((r) => r.location === 'San Francisco');
      expect(sfRole!.rationale).toContain(
        expect.stringContaining('Location match')
      );
    });
  });

  describe('ensureExploration', () => {
    it('should maintain exploration ratio', () => {
      const rankedRoles = rankRoles(mockRoles, {
        userProfile: {
          interests: ['salesforce'],
          seniority: 'Senior IC',
          locations: ['Remote'],
          companyTypes: ['startup'],
        },
        feedbackHistory: [],
      });

      const { roles, explorationCount } = ensureExploration(
        rankedRoles,
        ['salesforce'],
        0.2
      );

      expect(roles.length).toBeGreaterThan(0);
      expect(explorationCount).toBeGreaterThan(0);
    });

    it('should mark exploration picks', () => {
      const rankedRoles = rankRoles(mockRoles, {
        userProfile: {
          interests: ['salesforce'],
          seniority: 'Senior IC',
          locations: ['Remote'],
          companyTypes: ['startup'],
        },
        feedbackHistory: [],
      });

      const { roles } = ensureExploration(rankedRoles, ['salesforce'], 0.3);

      const explorationRoles = roles.filter((r) =>
        r.rationale.some((rat) => rat.includes('Exploration'))
      );

      expect(explorationRoles.length).toBeGreaterThan(0);
    });
  });
});
