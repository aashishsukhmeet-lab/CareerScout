# CareerScout - AI-Powered Role Feed Application

A sophisticated job role matching platform that learns from user preferences and provides personalized recommendations. Built with React, TypeScript, Node.js, Express, Prisma, and PostgreSQL.

## Features

### 1. Real Job Search via RapidAPI
- **Live job postings** from JSearch API (RapidAPI provider)
- **Server-side proxy** - API keys never exposed to browser
- **Advanced filtering**: location, remote, employment type, posted date
- **Debounced search** - Auto-search as you type (400ms delay)
- **Pagination** - Navigate through thousands of results
- **Smart caching** - 5-minute LRU cache for faster performance
- **Rate limit handling** - Graceful error messages with retry
- **URL state sync** - Shareable search URLs with filters

### 2. Like/Dislike Feedback System
- **Optimistic UI updates** for instant feedback
- **Dislike reasons** with categorization (too_senior, too_junior, location_mismatch, etc.)
- **Undo functionality** to reverse feedback decisions
- **Smart filtering** - disliked roles automatically hidden from feed

### 3. Personalized Onboarding
- **5-step wizard** collecting user preferences:
  1. Primary interests (salesforce, ai, fintech, product, etc.)
  2. Seniority preference (IC, Senior IC, Lead/Manager)
  3. Location preferences (with support for multiple locations)
  4. Company type preferences (startup, scaleup, public, etc.)
  5. Review and submit

### 4. Intelligent Feed Ranking
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

### 5. Memory & Insights System
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

### 6. Refresh Feed
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
│   │   │   ├── insights.ts
│   │   │   └── search.ts       # Job search proxy (NEW)
│   │   ├── services/           # Business logic
│   │   │   ├── ranking.ts      # Role ranking algorithm
│   │   │   ├── insights.ts     # Insight computation
│   │   │   └── rapidapi.ts     # RapidAPI integration (NEW)
│   │   ├── utils/              # Utility functions
│   │   │   ├── similarity.ts   # Tag similarity metrics
│   │   │   ├── tagGraph.ts     # Tag adjacency graph
│   │   │   ├── auth.ts         # Auth stub
│   │   │   ├── cache.ts        # LRU cache (NEW)
│   │   │   └── config.ts       # Env validation (NEW)
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
│   │   │   ├── WhatWeLearned.tsx
│   │   │   ├── Search.tsx      # Job search page (NEW)
│   │   │   ├── SearchBar.tsx   # Search input (NEW)
│   │   │   ├── JobFilters.tsx  # Filter sidebar (NEW)
│   │   │   ├── JobList.tsx     # Results list (NEW)
│   │   │   └── JobCard.tsx     # Job card (NEW)
│   │   ├── hooks/              # Custom React hooks
│   │   │   ├── useApi.ts       # API query hooks
│   │   │   ├── useAppStore.ts  # Zustand store
│   │   │   ├── useDebounce.ts  # Debounce hook (NEW)
│   │   │   └── useJobSearch.ts # Job search hook (NEW)
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
# RapidAPI Configuration (Required for job search)
RAPIDAPI_KEY=your_key_here
RAPIDAPI_HOST=jsearch.p.rapidapi.com
RAPIDAPI_BASE_URL=https://jsearch.p.rapidapi.com

# Search Configuration
DEFAULT_SEED_QUERY=product manager
PAGE_SIZE=20

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/careerscout?schema=public"

# Server
PORT=3001
NODE_ENV=development
```

**Getting Your RapidAPI Key:**

1. Sign up at [RapidAPI](https://rapidapi.com/)
2. Subscribe to [JSearch API](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch)
   - Free tier: 2,500 requests/month
   - Basic tier: $9.99/month for 25,000 requests
3. Copy your API key from the dashboard
4. Add to `backend/.env` as `RAPIDAPI_KEY=your_key_here`

⚠️ **Security Note:** The RapidAPI key is only used on the backend. The frontend calls `/api/jobs/search` which proxies to RapidAPI server-side. Never commit your `.env` file!

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

### Job Search (NEW!)
- `GET /api/jobs/search?q=engineer&page=1&location=Remote&remote=true&postedSinceDays=7`
  - **Query params:**
    - `q` (required): Search query
    - `page` (optional): Page number (1-50)
    - `location` (optional): Location filter
    - `remote` (optional): Remote jobs only (true/false)
    - `employmentType` (optional): Comma-separated types (FULLTIME,PARTTIME,CONTRACTOR,INTERN)
    - `postedSinceDays` (optional): Posted within N days (1-90)
  - **Response:** `SearchResponse` with items, pagination, and metadata

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

## Search Features

### How Job Search Works

1. **User enters query** in search bar (e.g., "software engineer")
2. **Debounce mechanism** waits 400ms for user to finish typing
3. **Frontend calls** `/api/jobs/search?q=software%20engineer`
4. **Backend validates** query params with Zod
5. **Cache check** - if recent result exists, return cached (5 min TTL)
6. **RapidAPI call** - server fetches from JSearch with API key
7. **Response normalization** - maps provider format to `JobPosting`
8. **Results cached** - stored in LRU cache for future requests
9. **Frontend renders** - displays job cards with apply links

### Error Handling

- **Rate limit (429)**: Shows friendly message "Too many requests, try again shortly"
- **Provider errors**: Shows specific error with retry button
- **No results**: Shows "No jobs found for '{query}'" with suggestions
- **Missing API key**: Dev mode shows warning banner at top

### Performance Optimizations

- **LRU cache**: 5-minute TTL, max 100 entries
- **Debounced search**: Reduces API calls while typing
- **Skeleton loaders**: Shows loading state without blocking UI
- **URL state sync**: Allows bookmarking and sharing searches
- **React Query caching**: Client-side cache with stale-while-revalidate

## Future Enhancements

- Real authentication (replace stub)
- Saved searches with email alerts
- Job application tracking
- Company profiles with reviews
- Salary insights and trends
- Multi-user support with social features
- ML-based ranking (replace heuristic)
- A/B testing framework
- Browser extension for job tracking

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

---

**Built with ❤️ by the CareerScout team**

---

## 🎯 Standalone Single-Page App (NEW!)

CareerScout now includes a standalone single-page application with AI-powered onboarding that works without the backend!

### Features

**AI-Powered Onboarding Flow:**
- ✨ First-visit detection - onboarding shown only on first visit
- 📝 3-step personalized onboarding:
  1. **Role** - What job are you looking for?
  2. **Location** - Where do you want to work?
  3. **Resume** - Upload PDF/TXT or paste text
- 🤖 AI resume analysis using OpenAI (with fallback)
- 💾 Profile persistence with localStorage
- 🔄 Auto-resume on page refresh

**Smart Job Matching:**
- 🎯 Weighted match scoring:
  - 40% keyword/skill overlap
  - 30% job title similarity
  - 20% location match
  - 10% seniority fit
- 📊 Match explanations ("Why this matches")
- 🏆 Match badges (high/medium/low)
- 🔍 Real job search via RapidAPI JSearch

**User Experience:**
- 📱 Mobile-responsive design
- 🌙 Dark mode support
- 🎨 LinkedIn-inspired UI
- ⚡ Fast, client-side rendering
- 🔔 Toast notifications

### Quick Start (Standalone App)

1. **Clone the repository:**
```bash
git clone https://github.com/aashishsukhmeet-lab/CareerScout.git
cd CareerScout
```

2. **Configure API keys:**
```bash
# Copy configuration template
cp js/config.example.js js/config.js

# Edit js/config.js and add your keys
```

3. **Get API Keys:**

**OpenAI API (for AI resume analysis):**
- Sign up at [platform.openai.com](https://platform.openai.com)
- Create an API key
- Add to `js/config.js`: `AI_API_KEY: 'sk-...'`
- **Note:** AI is optional - the app will work with a fallback if not configured

**RapidAPI JSearch (for job search):**
- Sign up at [rapidapi.com](https://rapidapi.com)
- Subscribe to [JSearch API](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) (free tier available)
- Add to `js/config.js`: `JOBS_API_KEY: 'your_key'`

4. **Open `index.html` in a browser:**
```bash
# Using Python
python3 -m http.server 8000

# Using Node.js
npx http-server -p 8000

# Then open: http://localhost:8000
```

That's it! No build process, no dependencies, no database needed.

### Configuration Options

Edit `js/config.js`:

```javascript
export const CONFIG = {
  // OpenAI API
  AI_API_BASE: 'https://api.openai.com/v1',
  AI_API_KEY: 'YOUR_KEY_HERE',
  AI_MODEL: 'gpt-4o-mini',  // Cost-effective
  
  // RapidAPI JSearch
  JOBS_API_KEY: 'YOUR_KEY_HERE',
  JOBS_API_HOST: 'jsearch.p.rapidapi.com',
  
  // Feature Flags
  SHOW_FAKE_JOBS: false,     // Show mock data without profile
  ENABLE_AI: true,           // Enable AI resume analysis
  ENABLE_REAL_JOBS: true,    // Fetch real jobs
  
  // Matching Weights (customize algorithm)
  WEIGHTS: {
    KEYWORD_SKILL: 0.40,     // 40% weight
    TITLE_SIMILARITY: 0.30,  // 30% weight
    LOCATION_MATCH: 0.20,    // 20% weight
    SENIORITY_FIT: 0.10      // 10% weight
  }
};
```

### File Structure (Standalone App)

```
CareerScout/
├── index.html              # Main page
├── app.js                  # Application logic (ES6 module)
├── style.css               # Styles
├── search.html             # Advanced job search page
├── js/
│   ├── config.example.js   # Configuration template
│   ├── config.js           # Your API keys (gitignored)
│   ├── memory.js           # localStorage wrapper
│   ├── ai.js               # AI resume analysis
│   ├── resume.js           # PDF/TXT parser
│   ├── matching.js         # Match scoring algorithm
│   └── onboarding.js       # Onboarding UI flow
└── .gitignore              # Excludes config.js
```

### How It Works

1. **First Visit:**
   - User sees onboarding modal (not fake jobs)
   - Completes 3-step flow
   - Uploads resume → AI extracts skills/keywords
   - Profile saved to localStorage

2. **Job Search:**
   - Fetches real jobs from RapidAPI JSearch
   - Based on user's role + location
   - Falls back to mock data if API unavailable

3. **Matching:**
   - Each job scored against user profile
   - Weighted algorithm (skills, title, location, seniority)
   - Jobs sorted by match score (0-100)
   - Explanations generated ("SQL match", "Remote preferred")

4. **Persistence:**
   - Profile stored in localStorage
   - On refresh: auto-loads profile + searches jobs
   - "Reset Profile" button clears and restarts

### Browser Compatibility

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers
- ⚠️ Requires JavaScript enabled
- ⚠️ PDF upload requires modern browser (for PDF.js)

### Security Notes

- 🔒 API keys stored in `js/config.js` (gitignored)
- 🔒 Keys used client-side (consider rate limits)
- 🔒 For production: use backend proxy for API calls
- 🔒 CSP headers configured in index.html

### Troubleshooting

**Onboarding not showing:**
- Check: `CONFIG.SHOW_FAKE_JOBS` should be `false`
- Clear localStorage: `localStorage.clear()`

**AI not working:**
- Verify API key in `js/config.js`
- Check browser console for errors
- Fallback will be used if AI fails

**Jobs not loading:**
- Verify RapidAPI key
- Check rate limits (free tier: 2,500/month)
- Mock jobs will be shown as fallback

**PDF upload fails:**
- Ensure PDF.js loaded (check console)
- Try text paste as alternative
- Some PDFs may have extraction issues

### Development

**Hot reload:**
```bash
# Use live-server for auto-reload
npx live-server --port=8000
```

**Testing:**
```bash
# Clear localStorage for fresh start
localStorage.clear()

# Test with mock data
# Set in config.js: ENABLE_REAL_JOBS: false
```

**Debugging:**
```javascript
// Access app state in console
window.CareerScoutApp.state

// Test AI connection
import { testAIConnection } from './js/ai.js';
await testAIConnection();
```

### Customization

**Change matching algorithm weights:**
Edit `js/config.js` → `WEIGHTS` object

**Modify onboarding steps:**
Edit `js/onboarding.js` → update step HTML and handlers

**Customize UI theme:**
Edit `style.css` → CSS variables in `:root`

**Add new skills to matching:**
Edit `js/matching.js` → `extractSkillsFromText()` function

---

