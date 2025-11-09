import { Router } from 'express';
import { PrismaClient, FeedbackValue, DislikeReason } from '@prisma/client';
import { z } from 'zod';
import { currentUserId } from '../utils/auth';
import { recordSignal } from '../services/insights';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const feedbackSchema = z.object({
  value: z.enum(['LIKE', 'DISLIKE']),
  reason: z.enum([
    'not_relevant',
    'too_senior',
    'too_junior',
    'location_mismatch',
    'compensation',
    'company_fit',
  ]).optional(),
});

/**
 * POST /api/roles/:roleId/feedback
 * Record user feedback (Like/Dislike) on a role
 */
router.post('/:roleId/feedback', async (req, res) => {
  try {
    const userId = currentUserId();
    const { roleId } = req.params;
    const data = feedbackSchema.parse(req.body);

    // Validate role exists
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Upsert feedback
    const feedback = await prisma.roleFeedback.upsert({
      where: {
        userId_roleId: { userId, roleId },
      },
      create: {
        userId,
        roleId,
        value: data.value as FeedbackValue,
        reason: data.reason as DislikeReason | undefined,
      },
      update: {
        value: data.value as FeedbackValue,
        reason: data.reason as DislikeReason | undefined,
      },
    });

    // Record signal
    await recordSignal(userId, data.value, {
      roleId,
      tags: role.tags,
      value: data.value as FeedbackValue,
      reason: data.reason as DislikeReason | undefined,
    });

    res.json(feedback);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Error recording feedback:', error);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

/**
 * DELETE /api/roles/:roleId/feedback
 * Undo/remove feedback on a role
 */
router.delete('/:roleId/feedback', async (req, res) => {
  try {
    const userId = currentUserId();
    const { roleId } = req.params;

    const deleted = await prisma.roleFeedback.deleteMany({
      where: {
        userId,
        roleId,
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: 'No feedback found to delete' });
    }

    res.json({ success: true, message: 'Feedback removed' });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

export default router;
