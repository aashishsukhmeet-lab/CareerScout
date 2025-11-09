import { PrismaClient, UserSignal, FeedbackValue, DislikeReason } from '@prisma/client';
import { Insight } from '../types';
import { getAdjacentTags } from '../utils/tagGraph';

const prisma = new PrismaClient();

interface SignalPayload {
  roleId?: string;
  tags?: string[];
  value?: FeedbackValue;
  reason?: DislikeReason;
  interests?: string[];
  seniority?: string;
  locations?: string[];
  companyTypes?: string[];
  [key: string]: any;
}

/**
 * Compute insights from user signals
 */
export async function computeInsights(userId: string): Promise<Insight[]> {
  // Fetch recent signals (last 50 or all if less)
  const signals = await prisma.userSignal.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  if (signals.length === 0) {
    return [];
  }

  const insights: Insight[] = [];

  // 1. Top liked tags
  const likedTagsInsight = analyzeLikedTags(signals);
  if (likedTagsInsight) insights.push(likedTagsInsight);

  // 2. Most common dislike reason
  const dislikeReasonInsight = analyzeDislikeReasons(signals);
  if (dislikeReasonInsight) insights.push(dislikeReasonInsight);

  // 3. Seniority preference
  const seniorityInsight = analyzeSeniorityPreference(signals);
  if (seniorityInsight) insights.push(seniorityInsight);

  // 4. Engagement patterns (time-based)
  const engagementInsight = analyzeEngagementPatterns(signals);
  if (engagementInsight) insights.push(engagementInsight);

  // 5. Exploration diversity
  const diversityInsight = analyzeDiversity(signals);
  if (diversityInsight) insights.push(diversityInsight);

  return insights;
}

/**
 * Analyze liked tags to identify top preferences
 */
function analyzeLikedTags(signals: UserSignal[]): Insight | null {
  const likeSignals = signals.filter(s => s.type === 'LIKE');

  if (likeSignals.length < 3) return null;

  const tagCounts = new Map<string, number>();

  for (const signal of likeSignals) {
    const payload = signal.payload as SignalPayload;
    if (payload.tags) {
      for (const tag of payload.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }
  }

  // Get top 3 tags
  const sortedTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (sortedTags.length === 0) return null;

  const topTags = sortedTags.map(([tag, count]) => `${tag} (${count})`).join(', ');

  return {
    title: `Strong interest in: ${sortedTags.map(t => t[0]).join(', ')}`,
    detail: `${likeSignals.length} likes in last ${signals.length} interactions. Top tags: ${topTags}`,
    weight: 5,
  };
}

/**
 * Analyze dislike reasons to understand what to avoid
 */
function analyzeDislikeReasons(signals: UserSignal[]): Insight | null {
  const dislikeSignals = signals.filter(s => s.type === 'DISLIKE');

  if (dislikeSignals.length < 2) return null;

  const reasonCounts = new Map<string, number>();

  for (const signal of dislikeSignals) {
    const payload = signal.payload as SignalPayload;
    if (payload.reason) {
      reasonCounts.set(payload.reason, (reasonCounts.get(payload.reason) || 0) + 1);
    }
  }

  if (reasonCounts.size === 0) return null;

  const topReason = Array.from(reasonCounts.entries())
    .sort((a, b) => b[1] - a[1])[0];

  const reasonLabel = topReason[0].replace(/_/g, ' ');
  const percentage = Math.round((topReason[1] / dislikeSignals.length) * 100);

  return {
    title: `Most common dislike: ${reasonLabel}`,
    detail: `${topReason[1]} of ${dislikeSignals.length} dislikes (${percentage}%) cite "${reasonLabel}"`,
    weight: 4,
  };
}

/**
 * Analyze seniority preferences from likes
 */
function analyzeSeniorityPreference(signals: UserSignal[]): Insight | null {
  const likeSignals = signals.filter(s => s.type === 'LIKE');

  if (likeSignals.length < 5) return null;

  // Infer seniority from tags
  const seniorityIndicators = {
    junior: ['junior', 'associate', 'entry'],
    mid: ['mid', 'intermediate'],
    senior: ['senior', 'staff', 'principal'],
    lead: ['lead', 'manager', 'director', 'head'],
  };

  const seniorityCounts = new Map<string, number>();

  for (const signal of likeSignals) {
    const payload = signal.payload as SignalPayload;
    if (payload.tags) {
      const tags = payload.tags.map(t => t.toLowerCase());

      for (const [level, keywords] of Object.entries(seniorityIndicators)) {
        if (tags.some(tag => keywords.some(kw => tag.includes(kw)))) {
          seniorityCounts.set(level, (seniorityCounts.get(level) || 0) + 1);
        }
      }
    }
  }

  if (seniorityCounts.size === 0) return null;

  const topSeniority = Array.from(seniorityCounts.entries())
    .sort((a, b) => b[1] - a[1])[0];

  return {
    title: `Prefers ${topSeniority[0]} level roles`,
    detail: `${topSeniority[1]} of last ${likeSignals.length} likes match ${topSeniority[0]} level`,
    weight: 3,
  };
}

/**
 * Analyze engagement patterns (time of day, day of week)
 */
function analyzeEngagementPatterns(signals: UserSignal[]): Insight | null {
  if (signals.length < 10) return null;

  const hourCounts = new Map<number, number>();

  for (const signal of signals) {
    const hour = signal.createdAt.getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  }

  const topHour = Array.from(hourCounts.entries())
    .sort((a, b) => b[1] - a[1])[0];

  const timeLabel =
    topHour[0] < 12 ? 'morning' :
    topHour[0] < 17 ? 'afternoon' :
    'evening';

  return {
    title: `Most active in the ${timeLabel}`,
    detail: `Peak activity around ${topHour[0]}:00 (${topHour[1]} interactions)`,
    weight: 2,
  };
}

/**
 * Analyze diversity of explored tags
 */
function analyzeDiversity(signals: UserSignal[]): Insight | null {
  const likeSignals = signals.filter(s => s.type === 'LIKE');

  if (likeSignals.length < 5) return null;

  const uniqueTags = new Set<string>();

  for (const signal of likeSignals) {
    const payload = signal.payload as SignalPayload;
    if (payload.tags) {
      payload.tags.forEach(tag => uniqueTags.add(tag));
    }
  }

  if (uniqueTags.size < 3) {
    return {
      title: 'Limited tag diversity',
      detail: `Only ${uniqueTags.size} unique tags in liked roles. Consider exploring more areas.`,
      weight: 2,
    };
  }

  return {
    title: 'Good exploration diversity',
    detail: `Engaged with ${uniqueTags.size} different tags across ${likeSignals.length} likes`,
    weight: 3,
  };
}

/**
 * Generate next exploration ideas based on current interests
 */
export async function generateNextIdeas(userId: string): Promise<string[]> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
  });

  if (!profile) return [];

  const currentInterests = profile.interests;
  const adjacentTags = getAdjacentTags(currentInterests);

  // Get tags user has already liked
  const signals = await prisma.userSignal.findMany({
    where: { userId, type: 'LIKE' },
    take: 30,
  });

  const likedTags = new Set<string>();
  for (const signal of signals) {
    const payload = signal.payload as SignalPayload;
    if (payload.tags) {
      payload.tags.forEach(tag => likedTags.add(tag.toLowerCase()));
    }
  }

  // Filter out tags user has already engaged with
  const newIdeas = adjacentTags.filter(tag => !likedTags.has(tag.toLowerCase()));

  // Return top 5 suggestions
  return newIdeas.slice(0, 5);
}

/**
 * Save insights to database
 */
export async function saveInsights(userId: string, insights: Insight[]): Promise<void> {
  // Delete old insights
  await prisma.userInsight.deleteMany({
    where: { userId },
  });

  // Create new insights
  for (const insight of insights) {
    await prisma.userInsight.create({
      data: {
        userId,
        title: insight.title,
        detail: insight.detail,
        weight: insight.weight,
      },
    });
  }
}

/**
 * Record a user signal
 */
export async function recordSignal(
  userId: string,
  type: string,
  payload: SignalPayload
): Promise<void> {
  await prisma.userSignal.create({
    data: {
      userId,
      type,
      payload,
    },
  });

  // Recompute insights if we have enough signals
  const signalCount = await prisma.userSignal.count({
    where: { userId },
  });

  if (signalCount >= 10 && signalCount % 5 === 0) {
    // Recompute every 5 signals after reaching 10
    const insights = await computeInsights(userId);
    await saveInsights(userId, insights);
  }
}
