import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { currentUserId } from '../utils/auth';
import { recordSignal } from '../services/insights';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const onboardingSchema = z.object({
  interests: z.array(z.string()).min(1),
  seniority: z.string().optional(),
  locations: z.array(z.string()).min(1),
  companyTypes: z.array(z.string()).min(1),
});

/**
 * POST /api/profile/onboarding
 * Save user onboarding preferences
 */
router.post('/onboarding', async (req, res) => {
  try {
    const userId = currentUserId();
    const data = onboardingSchema.parse(req.body);

    // Upsert user profile
    const profile = await prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        ...data,
      },
      update: data,
    });

    // Record onboarding signal
    await recordSignal(userId, 'ONBOARDING_SET', {
      interests: data.interests,
      seniority: data.seniority,
      locations: data.locations,
      companyTypes: data.companyTypes,
    });

    res.json(profile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Error saving onboarding:', error);
    res.status(500).json({ error: 'Failed to save onboarding preferences' });
  }
});

/**
 * GET /api/profile/me
 * Get current user's profile
 */
router.get('/me', async (req, res) => {
  try {
    const userId = currentUserId();

    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;
