import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { currentUserId } from '../utils/auth';
import { computeInsights, generateNextIdeas, saveInsights } from '../services/insights';
import { LearnedResponse } from '../types';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/insights
 * Get user insights and suggested next exploration ideas
 */
router.get('/', async (req, res) => {
  try {
    const userId = currentUserId();

    // Fetch or compute insights
    let insights = await prisma.userInsight.findMany({
      where: { userId },
      select: {
        title: true,
        detail: true,
        weight: true,
        updatedAt: true,
      },
      orderBy: {
        weight: 'desc',
      },
    });

    // If no insights exist, compute them
    if (insights.length === 0) {
      const computed = await computeInsights(userId);
      if (computed.length > 0) {
        await saveInsights(userId, computed);
        insights = computed.map(i => ({
          ...i,
          updatedAt: new Date(),
        }));
      }
    }

    // Generate next exploration ideas
    const nextIdeas = await generateNextIdeas(userId);

    const response: LearnedResponse = {
      updatedAt: insights[0]?.updatedAt?.toISOString() || new Date().toISOString(),
      insights: insights.map(i => ({
        title: i.title,
        detail: i.detail,
        weight: i.weight,
      })),
      nextIdeas,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

/**
 * POST /api/insights/reset
 * Reset all user memory (profile, insights, signals)
 */
router.post('/reset', async (req, res) => {
  try {
    const userId = currentUserId();

    // Delete all user data
    await prisma.$transaction([
      prisma.userInsight.deleteMany({ where: { userId } }),
      prisma.userSignal.deleteMany({ where: { userId } }),
      prisma.roleFeedback.deleteMany({ where: { userId } }),
      prisma.userProfile.deleteMany({ where: { userId } }),
    ]);

    res.json({
      success: true,
      message: 'All user memory has been reset',
    });
  } catch (error) {
    console.error('Error resetting memory:', error);
    res.status(500).json({ error: 'Failed to reset memory' });
  }
});

export default router;
