// ============================================
// CareerScout Configuration Template
// ============================================
// Copy this file to config.js and add your API keys
// config.js is gitignored for security

export const CONFIG = {
  // ========== OpenAI or Compatible API ==========
  // Get your key at: https://platform.openai.com/api-keys
  AI_API_BASE: 'https://api.openai.com/v1',
  AI_API_KEY: 'YOUR_OPENAI_KEY_HERE', // sk-...
  AI_MODEL: 'gpt-4o-mini', // Cost-effective model for resume parsing
  
  // ========== RapidAPI JSearch Integration ==========
  // Get your key at: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
  // Free tier: 2,500 requests/month
  JOBS_API_KEY: 'YOUR_RAPIDAPI_KEY_HERE',
  JOBS_API_HOST: 'jsearch.p.rapidapi.com',
  JOBS_API_BASE: 'https://jsearch.p.rapidapi.com',
  
  // ========== Feature Flags ==========
  SHOW_FAKE_JOBS: false,    // Show mock jobs when no profile exists
  ENABLE_AI: true,           // Enable AI resume analysis
  ENABLE_REAL_JOBS: true,    // Fetch real jobs via RapidAPI
  
  // ========== Search Defaults ==========
  DEFAULT_RESULTS: 20,       // Number of jobs to fetch
  MAX_RESULTS: 50,           // Maximum results per search
  CACHE_DURATION_MS: 300000, // Cache job results for 5 minutes
  
  // ========== Matching Algorithm Weights ==========
  WEIGHTS: {
    KEYWORD_SKILL: 0.40,     // 40% - Keyword/skill overlap
    TITLE_SIMILARITY: 0.30,  // 30% - Job title similarity
    LOCATION_MATCH: 0.20,    // 20% - Location match
    SENIORITY_FIT: 0.10      // 10% - Seniority fit
  }
};
