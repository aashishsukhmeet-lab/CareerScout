# CareerScout - AI-Powered Role Feed Application

A sophisticated job role matching platform that learns from user preferences and provides personalized recommendations. Built with React, TypeScript, Node.js, Express, Prisma, and PostgreSQL.

## Features

### 1. Like/Dislike Feedback System
- **Optimistic UI updates** for instant feedback
- **Dislike reasons** with categorization (too_senior, too_junior, location_mismatch, etc.)
- **Undo functionality** to reverse feedback decisions
- **Smart filtering** - disliked roles automatically hidden from feed

### 2. Personalized Onboarding
- **5-step wizard** collecting user preferences:
  1. Primary interests (salesforce, ai, fintech, product, etc.)
  2. Seniority preference (IC, Senior IC, Lead/Manager)
  3. Location preferences (with support for multiple locations)
  4. Company type preferences (startup, scaleup, public, etc.)
  5. Review and submit

### 3. Intelligent Feed Ranking
The feed uses a sophisticated ranking algorithm:

**Base Score Components:**
- **Recency decay**: `score *= 0.85^(daysOld)` - newer roles rank higher
- **Tag similarity**: Jaccard similarity + match count bonus
- **Like boost**: +2.0 for roles similar to previously liked roles
- **Location match**: +0.5 bonus for location alignment
- **Diversity penalty**: -0.2 for >2 roles from same company in top 10

**Exploration Guarantee:**
- At least 20% of results are "exploratory" (adjacent tags not in user interests)
- Uses static tag adjacency graph for intelligent suggestions

### 4. Memory & Insights System
The app learns from user behavior and provides transparent insights:

**Signal Collection:**
- Every interaction creates a `UserSignal` (LIKE, DISLIKE, VIEW, REFRESH, etc.)
- Signals are append-only for complete history tracking

**Insight Generation:**
Insights are automatically computed from signals:
- **Top liked tags**: "Strong interest in: ai, salesforce"
- **Dislike patterns**: "Most common dislike: too senior (67%)"
- **Seniority preferences**: Inferred from liked role levels
- **Engagement patterns**: Time-of-day activity analysis
- **Diversity metrics**: Tag exploration breadth

**Next Ideas:**
- Suggests adjacent tags based on current interests
- Filters out already-explored areas

### 5. Refresh Feed
- Invalidates cache and regenerates feed with new ranking
- Shows timestamp of last refresh
- Applies current preferences and feedback history

## Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **ORM**: Prisma with PostgreSQL
- **Validation**: Zod schemas
- **Testing**: Vitest + Supertest

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand (lightweight global state)
- **Data Fetching**: React Query (TanStack Query)
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Testing**: Vitest + React Testing Library

## Project Structure

```
CareerScout/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── seed.ts             # Sample data seeder
│   ├── src/
│   │   ├── routes/             # API route handlers
│   │   │   ├── profile.ts
│   │   │   ├── roles.ts
│   │   │   ├── feed.ts
│   │   │   └── insights.ts
│   │   ├── services/           # Business logic
│   │   │   ├── ranking.ts      # Role ranking algorithm
│   │   │   └── insights.ts     # Insight computation
│   │   ├── utils/              # Utility functions
│   │   │   ├── similarity.ts   # Tag similarity metrics
│   │   │   ├── tagGraph.ts     # Tag adjacency graph
│   │   │   └── auth.ts         # Auth stub
│   │   ├── types/              # TypeScript types
│   │   └── index.ts            # Express app entry
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── OnboardingWizard.tsx
│   │   │   ├── Feed.tsx
│   │   │   ├── RoleCard.tsx
│   │   │   └── WhatWeLearned.tsx
│   │   ├── hooks/              # Custom React hooks
│   │   │   ├── useApi.ts       # API query hooks
│   │   │   └── useAppStore.ts  # Zustand store
│   │   ├── api/                # API client
│   │   │   └── client.ts
│   │   ├── types/              # TypeScript types
│   │   ├── App.tsx             # Main app component
│   │   ├── main.tsx            # Entry point
│   │   └── index.css           # Tailwind imports
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
└── README.md
```

## Setup & Installation

### Prerequisites
- Node.js 18+ and pnpm (or npm/yarn)
- PostgreSQL 14+
- Git

### Environment Variables

Create `backend/.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/careerscout?schema=public"
PORT=3001
NODE_ENV=development
```

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd CareerScout
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   pnpm install
   ```

3. **Setup database**
   ```bash
   # Generate Prisma client
   pnpm prisma:generate

   # Run migrations
   pnpm prisma:migrate

   # Seed sample data
   pnpm prisma:seed
   ```

4. **Install frontend dependencies**
   ```bash
   cd ../frontend
   pnpm install
   ```

### Running the Application

**Development mode:**

```bash
# Terminal 1 - Backend
cd backend
pnpm dev

# Terminal 2 - Frontend
cd frontend
pnpm dev
```

- Backend API: http://localhost:3001
- Frontend: http://localhost:3000

**Production build:**

```bash
# Backend
cd backend
pnpm build
pnpm start

# Frontend
cd frontend
pnpm build
pnpm preview
```

## API Endpoints

### Profile
- `POST /api/profile/onboarding` - Save user preferences
- `GET /api/profile/me` - Get user profile

### Feedback
- `POST /api/roles/:roleId/feedback` - Submit like/dislike
- `DELETE /api/roles/:roleId/feedback` - Undo feedback

### Feed
- `GET /api/feed?page=1&pageSize=20&includeHidden=false` - Get personalized feed

### Insights
- `GET /api/insights` - Get user insights and next ideas
- `POST /api/insights/reset` - Reset all user memory

## Testing

### Backend Tests

```bash
cd backend

# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage
```

**Test Coverage:**
- Unit tests for ranking algorithm
- Unit tests for similarity utilities
- Integration tests for all API endpoints
- Validation testing with Zod schemas

### Frontend Tests

```bash
cd frontend

# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage
```

**Test Coverage:**
- Component rendering tests
- User interaction tests
- State management tests
- API integration mocks

## How It Works

### Ranking Formula

The feed ranking combines multiple signals:

```typescript
score = recencyScore + tagScore + likeBoost + locationScore - diversityPenalty

where:
  recencyScore = 0.85^(daysOld)
  tagScore = jaccard(roleTags, userInterests) * 2 + matchCount * 0.3
  likeBoost = maxSimilarity(roleTags, likedRoleTags) * 2
  locationScore = locationMatch ? 0.5 : 0.2
  diversityPenalty = sameCompanyCount > 2 ? 0.2 : 0
```

### Insight Rules

Insights are computed when:
- User has ≥10 signals recorded
- Every 5 new signals after that threshold

**Insight Types:**
1. **Top Liked Tags** (weight: 5)
   - Requires ≥3 likes
   - Shows top 3 tags by frequency

2. **Dislike Reasons** (weight: 4)
   - Requires ≥2 dislikes with reasons
   - Shows most common reason

3. **Seniority Preference** (weight: 3)
   - Requires ≥5 likes
   - Infers from tags: junior, senior, lead, etc.

4. **Engagement Patterns** (weight: 2)
   - Requires ≥10 signals
   - Analyzes time-of-day activity

5. **Diversity Analysis** (weight: 2-3)
   - Requires ≥5 likes
   - Measures unique tag exploration

## Acceptance Criteria Status

✅ **Like feedback** - Optimistic UI, persists, reorders feed
✅ **Dislike feedback** - Roles disappear from default feed
✅ **Dislike reasons** - Dropdown with 6 reason categories
✅ **Undo** - Reverses feedback and updates feed
✅ **Onboarding impact** - >60% of top 10 match user tags
✅ **Refresh feed** - Shows toast, new ordering, ≥20% exploration
✅ **What We Learned** - Shows insights after 10 interactions
✅ **Reset memory** - Clears all data, returns to onboarding

## Database Schema

**Key Models:**
- `Role` - Job postings with tags
- `RoleFeedback` - User likes/dislikes
- `UserProfile` - Onboarding preferences
- `UserSignal` - Append-only behavior log
- `UserInsight` - Computed insights

See `backend/prisma/schema.prisma` for full schema.

## Future Enhancements

- Real authentication (replace stub)
- Email notifications for new matching roles
- Saved searches and alerts
- Company profiles with reviews
- Application tracking
- Multi-user support with social features
- ML-based ranking (replace heuristic)
- A/B testing framework

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

---

**Built with ❤️ by the CareerScout team**
