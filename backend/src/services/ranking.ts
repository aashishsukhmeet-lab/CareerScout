import { Role } from '@prisma/client';
import { ScoredRole, RankingContext } from '../types';
import { jaccardSimilarity, countTagMatches, hasTagOverlap } from '../utils/similarity';

/**
 * Calculate recency decay score
 * score *= 0.85^(daysOld)
 */
function calculateRecencyScore(createdAt: Date): number {
  const now = new Date();
  const daysOld = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return Math.pow(0.85, daysOld);
}

/**
 * Calculate tag similarity score between role and user interests
 */
function calculateTagScore(roleTags: string[], userInterests: string[]): number {
  if (userInterests.length === 0) return 0.5; // Neutral if no interests

  const matchCount = countTagMatches(roleTags, userInterests);
  const jaccard = jaccardSimilarity(roleTags, userInterests);

  // Base score from Jaccard + bonus for multiple matches
  return jaccard * 2 + matchCount * 0.3;
}

/**
 * Calculate boost from liked similar roles
 */
function calculateLikeBoost(
  roleTags: string[],
  feedbackHistory: RankingContext['feedbackHistory']
): { boost: number; reason?: string } {
  const likes = feedbackHistory.filter(f => f.value === 'LIKE');

  if (likes.length === 0) return { boost: 0 };

  let maxSimilarity = 0;
  let mostSimilarRole: string | null = null;

  for (const like of likes) {
    const similarity = jaccardSimilarity(roleTags, like.tags);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      mostSimilarRole = like.roleId;
    }
  }

  // Boost proportional to similarity with liked roles
  const boost = maxSimilarity * 2;

  return {
    boost,
    reason: boost > 0.5
      ? `Similar to liked roles (${Math.round(maxSimilarity * 100)}% match)`
      : undefined,
  };
}

/**
 * Calculate location match score
 */
function calculateLocationScore(
  roleLocation: string | null,
  userLocations: string[]
): number {
  if (!roleLocation || userLocations.length === 0) return 0.5; // Neutral

  const roleLoc = roleLocation.toLowerCase();

  // Check for exact or partial matches
  for (const userLoc of userLocations) {
    const userLocLower = userLoc.toLowerCase();
    if (roleLoc.includes(userLocLower) || userLocLower.includes(roleLoc)) {
      return 1.0;
    }
  }

  // Remote is always a match if user wants remote
  if (userLocations.some(l => l.toLowerCase().includes('remote')) && roleLoc.includes('remote')) {
    return 1.0;
  }

  return 0.2; // Penalty for location mismatch
}

/**
 * Main ranking function
 */
export function rankRoles(
  roles: Role[],
  context: RankingContext
): ScoredRole[] {
  const { userProfile, feedbackHistory } = context;

  // Build disliked role set for filtering
  const dislikedRoleIds = new Set(
    feedbackHistory.filter(f => f.value === 'DISLIKE').map(f => f.roleId)
  );

  const scoredRoles: ScoredRole[] = [];

  for (const role of roles) {
    // Skip disliked roles (they'll be filtered separately)
    if (dislikedRoleIds.has(role.id)) continue;

    const rationale: string[] = [];
    let score = 0;

    // 1. Recency decay (base score 0-1)
    const recencyScore = calculateRecencyScore(role.createdAt);
    score += recencyScore;
    if (recencyScore > 0.7) {
      rationale.push(`Recent posting (${Math.round(recencyScore * 100)}%)`);
    }

    // 2. Tag similarity to user interests
    if (userProfile?.interests) {
      const tagScore = calculateTagScore(role.tags, userProfile.interests);
      score += tagScore;

      const matchCount = countTagMatches(role.tags, userProfile.interests);
      if (matchCount > 0) {
        const matchedTags = role.tags.filter(t =>
          userProfile.interests.some(i => i.toLowerCase() === t.toLowerCase())
        );
        rationale.push(`Matches interests: ${matchedTags.slice(0, 3).join(', ')}`);
      }
    }

    // 3. Like boost - similar to previously liked roles
    const { boost: likeBoost, reason: likeReason } = calculateLikeBoost(
      role.tags,
      feedbackHistory
    );
    score += likeBoost;
    if (likeReason) {
      rationale.push(likeReason);
    }

    // 4. Location match
    if (userProfile?.locations) {
      const locationScore = calculateLocationScore(role.location, userProfile.locations);
      score += locationScore * 0.5; // Weight location less than tags

      if (locationScore > 0.8) {
        rationale.push(`Location match: ${role.location}`);
      } else if (locationScore < 0.3) {
        rationale.push(`Location mismatch`);
      }
    }

    scoredRoles.push({
      ...role,
      score,
      rationale,
    });
  }

  // Sort by score descending
  scoredRoles.sort((a, b) => b.score - a.score);

  // Apply diversity penalty - penalize if >2 roles from same company in top 10
  const companyCount = new Map<string, number>();
  const diversityPenaltyRoles = new Set<string>();

  for (let i = 0; i < Math.min(scoredRoles.length, 10); i++) {
    const role = scoredRoles[i];
    const count = (companyCount.get(role.company) || 0) + 1;
    companyCount.set(role.company, count);

    if (count > 2) {
      diversityPenaltyRoles.add(role.id);
      role.score -= 0.2;
      role.rationale.push('Diversity penalty (>2 from same company)');
    }
  }

  // Re-sort after diversity penalty
  scoredRoles.sort((a, b) => b.score - a.score);

  return scoredRoles;
}

/**
 * Filter roles to ensure exploration (at least 20% new/adjacent tags)
 */
export function ensureExploration(
  scoredRoles: ScoredRole[],
  userInterests: string[],
  explorationRatio: number = 0.2
): { roles: ScoredRole[]; explorationCount: number } {
  if (userInterests.length === 0) {
    return { roles: scoredRoles, explorationCount: 0 };
  }

  const explorationRoles: ScoredRole[] = [];
  const familiarRoles: ScoredRole[] = [];

  for (const role of scoredRoles) {
    // Check if this role has tags outside user interests (exploration)
    const hasNewTags = role.tags.some(
      tag => !userInterests.some(i => i.toLowerCase() === tag.toLowerCase())
    );

    if (hasNewTags) {
      explorationRoles.push(role);
    } else {
      familiarRoles.push(role);
    }
  }

  // Ensure at least explorationRatio of results are exploratory
  const targetExplorationCount = Math.ceil(scoredRoles.length * explorationRatio);

  if (explorationRoles.length < targetExplorationCount) {
    // Not enough exploration, return what we have
    return {
      roles: scoredRoles,
      explorationCount: explorationRoles.length,
    };
  }

  // Interleave exploration and familiar roles
  const result: ScoredRole[] = [];
  let exploreIdx = 0;
  let familiarIdx = 0;

  const exploreFreq = 1 / explorationRatio; // e.g., 1/0.2 = 5, so 1 in every 5

  for (let i = 0; i < scoredRoles.length; i++) {
    if (i % Math.floor(exploreFreq) === Math.floor(exploreFreq) - 1 && exploreIdx < explorationRoles.length) {
      const role = explorationRoles[exploreIdx++];
      role.rationale.push('🔍 Exploration pick');
      result.push(role);
    } else if (familiarIdx < familiarRoles.length) {
      result.push(familiarRoles[familiarIdx++]);
    } else if (exploreIdx < explorationRoles.length) {
      result.push(explorationRoles[exploreIdx++]);
    }
  }

  return {
    roles: result,
    explorationCount: targetExplorationCount,
  };
}
