import { Router } from 'express';
import { PrismaClient, FeedbackValue } from '@prisma/client';
import { currentUserId } from '../utils/auth';
import { rankRoles, ensureExploration } from '../services/ranking';
import { FeedResponse } from '../types';
import { recordSignal } from '../services/insights';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/feed
 * Get personalized role feed
 * Query params:
 *   - page: number (default 1)
 *   - pageSize: number (default 20)
 *   - includeHidden: boolean (default false) - show disliked roles
 */
router.get('/', async (req, res) => {
  try {
    const userId = currentUserId();
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const includeHidden = req.query.includeHidden === 'true';

    // Fetch user profile
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    // Fetch user feedback history
    const feedbackHistory = await prisma.roleFeedback.findMany({
      where: { userId },
      include: {
        role: {
          select: { tags: true },
        },
      },
    });

    const feedbackWithTags = feedbackHistory.map(f => ({
      roleId: f.roleId,
      value: f.value,
      reason: f.reason,
      tags: f.role.tags,
    }));

    // Fetch insights
    const insights = await prisma.userInsight.findMany({
      where: { userId },
      select: {
        title: true,
        detail: true,
        weight: true,
      },
    });

    // Build set of disliked role IDs
    const dislikedRoleIds = new Set(
      feedbackHistory
        .filter(f => f.value === FeedbackValue.DISLIKE)
        .map(f => f.roleId)
    );

    // Fetch all roles (excluding disliked if not includeHidden)
    const roles = await prisma.role.findMany({
      where: includeHidden ? {} : {
        id: {
          notIn: Array.from(dislikedRoleIds),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Rank roles
    const rankedRoles = rankRoles(roles, {
      userProfile: userProfile || undefined,
      insights,
      feedbackHistory: feedbackWithTags,
    });

    // Ensure exploration
    const { roles: exploredRoles, explorationCount } = ensureExploration(
      rankedRoles,
      userProfile?.interests || [],
      0.2
    );

    // Paginate
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const paginatedRoles = exploredRoles.slice(startIdx, endIdx);
    const hasMore = endIdx < exploredRoles.length;

    // Build meta rationale
    const metaRationale = [
      `Ranked ${exploredRoles.length} roles`,
      `${explorationCount} exploration picks (20%+)`,
    ];

    if (userProfile) {
      metaRationale.push(`Matched interests: ${userProfile.interests.join(', ')}`);
    }

    if (dislikedRoleIds.size > 0 && !includeHidden) {
      metaRationale.push(`Filtered out ${dislikedRoleIds.size} disliked roles`);
    }

    const response: FeedResponse = {
      items: paginatedRoles,
      nextPage: hasMore ? page + 1 : undefined,
      meta: {
        generatedAt: new Date().toISOString(),
        rationale: metaRationale,
      },
    };

    // Record refresh signal
    if (page === 1) {
      await recordSignal(userId, 'REFRESH', {
        roleCount: exploredRoles.length,
        explorationCount,
      });
    }

    res.json(response);
  } catch (error) {
    console.error('Error generating feed:', error);
    res.status(500).json({ error: 'Failed to generate feed' });
  }
});

export default router;
