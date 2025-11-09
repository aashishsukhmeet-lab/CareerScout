# How CareerScout Works

## Ranking Algorithm Deep Dive

### Overview
CareerScout uses a multi-factor scoring system to rank roles, balancing relevance, recency, diversity, and user feedback.

### Score Components

#### 1. Recency Decay
```
recencyScore = 0.85^(daysOld)
```
- Exponential decay favoring recent postings
- A role posted today: score = 1.0
- A role posted 5 days ago: score ≈ 0.44
- A role posted 10 days ago: score ≈ 0.20

**Rationale**: Fresh roles are more likely to be actively hiring.

#### 2. Tag Similarity
```
tagScore = jaccard(roleTags, userInterests) * 2 + matchCount * 0.3
```

Where Jaccard similarity:
```
J(A, B) = |A ∩ B| / |A ∪ B|
```

**Example**:
- User interests: `['ai', 'mlops', 'python']`
- Role tags: `['ai', 'python', 'tensorflow']`
- Intersection: `['ai', 'python']` = 2
- Union: `['ai', 'mlops', 'python', 'tensorflow']` = 4
- Jaccard: 2/4 = 0.5
- Match count: 2
- **tagScore = 0.5 * 2 + 2 * 0.3 = 1.6**

**Rationale**: Combines percentage overlap with absolute match count to favor roles with both strong similarity and multiple relevant tags.

#### 3. Like Boost
```
likeBoost = maxSimilarity(roleTags, likedRoleTags) * 2
```

- Finds previously liked roles
- Computes Jaccard similarity with each
- Takes maximum similarity
- Multiplies by 2 for strong boost

**Example**:
- User liked a role with tags: `['salesforce', 'crm', 'integration']`
- Current role has tags: `['salesforce', 'crm', 'admin']`
- Similarity: 2/4 = 0.5
- **likeBoost = 0.5 * 2 = 1.0**

**Rationale**: "More like this" - boost roles similar to what user has explicitly liked.

#### 4. Location Match
```
locationScore = match ? 0.5 : 0.2
```

- Full match (exact or partial string match): +0.5
- Remote match when user wants remote: +0.5
- No match: +0.2 (small penalty)

**Rationale**: Location is important but not a hard filter; users may be flexible.

#### 5. Diversity Penalty
```
diversityPenalty = (sameCompanyCount > 2 in top 10) ? 0.2 : 0
```

- Applied only to roles beyond 2nd from same company in top 10
- Prevents single company dominating the feed

**Rationale**: Exposure to variety of opportunities.

### Final Score
```
finalScore = recencyScore + tagScore + likeBoost + (locationScore * 0.5) - diversityPenalty
```

**Typical Score Ranges**:
- Highly relevant recent role: 6-10
- Moderately relevant: 3-6
- Low relevance: 1-3

### Exploration Guarantee

The feed ensures ≥20% "exploration picks":

```typescript
explorationRatio = 0.2

// A role is exploratory if it has tags NOT in user interests
isExploratory = role.tags.some(tag => !userInterests.includes(tag))
```

**Interleaving Strategy**:
- Every 5th role (1/0.2) is forced to be exploratory
- Maintains score-based ordering within exploration/familiar buckets

**Example Feed (20 roles, 20% exploration = 4 exploratory)**:
```
[familiar, familiar, familiar, familiar, exploratory,
 familiar, familiar, familiar, familiar, exploratory,
 familiar, familiar, familiar, familiar, exploratory,
 familiar, familiar, familiar, familiar, exploratory]
```

## Insight Generation Rules

### Signal Collection

Every user action creates a `UserSignal`:

| Type | Triggers | Payload |
|------|----------|---------|
| LIKE | User likes a role | `{ roleId, tags, value: 'LIKE' }` |
| DISLIKE | User dislikes a role | `{ roleId, tags, value: 'DISLIKE', reason }` |
| VIEW | Role card rendered | `{ roleId }` |
| REFRESH | User refreshes feed | `{ roleCount, explorationCount }` |
| ONBOARDING_SET | User completes onboarding | `{ interests, seniority, locations, companyTypes }` |

Signals are **append-only** - never deleted (except on reset).

### Insight Computation

Triggered when:
1. User has ≥10 total signals
2. Every 5 new signals after threshold

#### Insight: Top Liked Tags
**Minimum data**: ≥3 likes

**Algorithm**:
```typescript
1. Filter signals where type === 'LIKE'
2. Extract all tags from liked roles
3. Count frequency of each tag
4. Sort by frequency descending
5. Take top 3

Example:
Likes: [
  { tags: ['ai', 'mlops'] },
  { tags: ['ai', 'python'] },
  { tags: ['ai', 'genai'] }
]

Tag counts: { ai: 3, mlops: 1, python: 1, genai: 1 }
Top 3: ['ai (3)', 'mlops (1)', 'python (1)']

Insight: "Strong interest in: ai, mlops, python"
Weight: 5 (highest)
```

#### Insight: Most Common Dislike Reason
**Minimum data**: ≥2 dislikes with reasons

**Algorithm**:
```typescript
1. Filter signals where type === 'DISLIKE' and reason exists
2. Count frequency of each reason
3. Sort by frequency descending
4. Take top reason

Example:
Dislikes: [
  { reason: 'too_senior' },
  { reason: 'too_senior' },
  { reason: 'location_mismatch' }
]

Reason counts: { too_senior: 2, location_mismatch: 1 }
Top: 'too_senior' (67%)

Insight: "Most common dislike: too senior"
Weight: 4
```

#### Insight: Seniority Preference
**Minimum data**: ≥5 likes

**Algorithm**:
```typescript
1. Filter signals where type === 'LIKE'
2. For each like, check tags for seniority indicators:
   - junior: ['junior', 'associate', 'entry']
   - mid: ['mid', 'intermediate']
   - senior: ['senior', 'staff', 'principal']
   - lead: ['lead', 'manager', 'director']
3. Count which level appears most
4. Report preference

Example:
Likes with tags: ['senior engineer', 'staff engineer', 'principal pm', 'senior analyst', 'associate developer']
Seniority counts: { senior: 3, lead: 1, junior: 1 }

Insight: "Prefers senior level roles"
Weight: 3
```

#### Insight: Engagement Patterns
**Minimum data**: ≥10 signals

**Algorithm**:
```typescript
1. Extract hour from createdAt of all signals
2. Count signals per hour
3. Find peak hour

Example:
Signals at: [14, 14, 15, 14, 10, 15, 14, 10, 14, 15]
Hour counts: { 10: 2, 14: 5, 15: 3 }
Peak: 14 (2pm)

Insight: "Most active in the afternoon"
Weight: 2
```

#### Insight: Diversity Analysis
**Minimum data**: ≥5 likes

**Algorithm**:
```typescript
1. Collect all unique tags from liked roles
2. Count unique tags
3. Compare to threshold

If uniqueTags < 3:
  Insight: "Limited tag diversity"
  Weight: 2
Else:
  Insight: "Good exploration diversity"
  Weight: 3

Example:
Liked tags: ['ai', 'mlops', 'python', 'genai', 'data', 'analytics', 'sql']
Unique: 7

Insight: "Good exploration diversity - engaged with 7 different tags"
Weight: 3
```

### Next Ideas Generation

**Algorithm**:
```typescript
1. Get user's current interests from profile
2. Look up adjacent tags in ADJACENT_TAGS graph
3. Get user's liked tags from recent signals
4. Filter out already-liked tags
5. Return top 5 suggestions

Example:
User interests: ['ai', 'salesforce']

Adjacent tags lookup:
  ai → ['mlops', 'genai', 'analytics', 'nlp']
  salesforce → ['crm', 'revops', 'support']

All adjacent: ['mlops', 'genai', 'analytics', 'nlp', 'crm', 'revops', 'support']

User already liked: ['mlops', 'crm']

Filtered suggestions: ['genai', 'analytics', 'nlp', 'revops', 'support']
Top 5: ['genai', 'analytics', 'nlp', 'revops', 'support']
```

## Tag Adjacency Graph

The `ADJACENT_TAGS` constant defines related concepts:

```typescript
{
  salesforce: ['crm', 'revops', 'support', 'integration'],
  ai: ['mlops', 'genai', 'analytics', 'nlp', 'llm'],
  fintech: ['payments', 'risk', 'fraud', 'lending'],
  product: ['pm', 'ux', 'experimentation', 'strategy'],
  // ... etc
}
```

**Purpose**:
1. **Exploration**: Suggest roles with adjacent tags
2. **Next Ideas**: Recommend new areas to explore
3. **Similarity**: Boost roles in related domains

**Maintenance**: Manually curated based on job market analysis.

## Dislike Filter Behavior

### Default Feed (includeHidden=false)
```sql
WHERE role.id NOT IN (
  SELECT roleId FROM RoleFeedback
  WHERE userId = ? AND value = 'DISLIKE'
)
```

Completely excludes disliked roles.

### Show Hidden (includeHidden=true)
```sql
-- No filter, all roles included
```

Disliked roles reappear but ranked low (no boost, may have penalty).

## Optimistic UI Updates

### Like/Dislike Flow
```
1. User clicks Like → UI immediately updates (optimistic)
2. API call initiated in background
3a. Success → no UI change (already updated)
3b. Failure → revert UI change, show error

React Query handles this automatically with:
- onMutate: optimistic update
- onError: rollback
- onSettled: refetch to sync
```

### Benefits
- Instant feedback
- Smooth UX even with network latency
- Automatic error handling

## Performance Considerations

### Backend
- **Indexing**: userId, roleId, createdAt indexed for fast queries
- **Pagination**: Default 20 items/page to limit response size
- **Caching**: React Query caches on client (5min default)

### Frontend
- **Lazy loading**: Only render visible role cards
- **Memoization**: React Query deduplicates requests
- **Optimistic updates**: Reduce perceived latency

### Database
- **Connection pooling**: Prisma manages connections
- **Transactions**: Insight updates use transactions
- **Batch operations**: Seed script uses bulk inserts

## Security Notes

### Current Implementation
- **Authentication**: Stubbed (always returns 'user-1')
- **Authorization**: None (single-user mode)
- **Input validation**: Zod schemas on all endpoints
- **SQL injection**: Protected by Prisma ORM

### Production Requirements
- Implement JWT or session-based auth
- Add user roles/permissions
- Rate limiting on API endpoints
- HTTPS/TLS encryption
- CORS whitelist specific origins
- Input sanitization
- Audit logging

---

This document explains the core algorithms and data flows. For implementation details, see the source code in `backend/src/services/`.
