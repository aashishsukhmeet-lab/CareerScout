// ============================================
// CareerScout - Modern AI Career Platform
// Updated with AI-Powered Onboarding Flow
// ============================================

import { CONFIG } from './js/config.js';
import { loadMemory, saveMemory, hasMemory, clearMemory } from './js/memory.js';
import { showOnboarding, hideOnboarding, initOnboarding } from './js/onboarding.js';
import { sortJobsByMatch } from './js/matching.js';

// ========== STATE MANAGEMENT ==========
const APP_STATE = {
  jobs: [],
  savedJobs: new Set(),
  seenJobs: new Set(),
  userProfile: null,
  preferences: {
    titles: ['Product Manager', 'Business Analyst'],
    locations: ['New York', 'Remote'],
    companies: ['Google', 'Stripe', 'Meta'],
    recencyDays: 7
  },
  metrics: {
    reviewed: 0,
    saved: 0,
    applied: 0
  },
  useLiveAI: false,
  apiKey: '',
  theme: 'light',
  searchInProgress: false
};

// ========== MOCK JOB DATA (Fallback) ==========
const MOCK_JOBS = [
  {
    id: "j1",
    job_title: "Senior Product Manager",
    employer_name: "Stripe",
    job_city: "Remote",
    job_state: "",
    job_employment_type: "FULLTIME",
    job_posted_at_datetime_utc: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    job_description: "Lead product strategy for payment APIs serving millions of businesses worldwide. Work with engineering teams to build scalable solutions. Required skills: Product Strategy, SQL, API Design, Analytics.",
    job_min_salary: 180000,
    job_max_salary: 240000,
    job_is_remote: true,
    job_apply_link: "#"
  },
  {
    id: "j2",
    job_title: "Product Manager - AI",
    employer_name: "OpenAI",
    job_city: "San Francisco",
    job_state: "CA",
    job_employment_type: "FULLTIME",
    job_posted_at_datetime_utc: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    job_description: "Lead product development for cutting-edge AI capabilities. Shape the future of artificial intelligence products. Required skills: AI/ML, Product Strategy, Python, APIs.",
    job_min_salary: 220000,
    job_max_salary: 300000,
    job_is_remote: false,
    job_apply_link: "#"
  },
  {
    id: "j3",
    job_title: "Business Analyst",
    employer_name: "Salesforce",
    job_city: "New York",
    job_state: "NY",
    job_employment_type: "FULLTIME",
    job_posted_at_datetime_utc: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    job_description: "Analyze customer data and provide insights to drive business growth. Partner with sales and marketing teams. Required skills: SQL, Tableau, Salesforce, Excel.",
    job_min_salary: 110000,
    job_max_salary: 150000,
    job_is_remote: false,
    job_apply_link: "#"
  },
  {
    id: "j4",
    job_title: "Senior Business Analyst",
    employer_name: "Microsoft",
    job_city: "Remote",
    job_state: "",
    job_employment_type: "FULLTIME",
    job_posted_at_datetime_utc: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    job_description: "Partner with engineering teams to optimize cloud infrastructure performance. Drive data-driven decisions. Required skills: Power BI, SQL, Python, Azure.",
    job_min_salary: 140000,
    job_max_salary: 180000,
    job_is_remote: true,
    job_apply_link: "#"
  },
  {
    id: "j5",
    job_title: "Technical Product Manager",
    employer_name: "Google",
    job_city: "Mountain View",
    job_state: "CA",
    job_employment_type: "FULLTIME",
    job_posted_at_datetime_utc: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    job_description: "Build ML-powered features for Google Search affecting billions of users. Work at the cutting edge of technology. Required skills: APIs, Python, Data Analysis, Machine Learning.",
    job_min_salary: 200000,
    job_max_salary: 280000,
    job_is_remote: false,
    job_apply_link: "#"
  }
];

// ========== UTILITY FUNCTIONS ==========
const Utils = {
  save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  },

  load(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
      return defaultValue;
    }
  },

  formatTimeAgo(dateString) {
    if (!dateString) return 'Recently';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const days = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      
      if (days === 0) return 'Today';
      if (days === 1) return 'Yesterday';
      if (days < 7) return `${days} days ago`;
      if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
      return `${Math.floor(days / 30)} months ago`;
    } catch {
      return 'Recently';
    }
  },

  getCompanyInitials(company) {
    return company
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  },

  formatSalary(job) {
    const min = job.job_min_salary;
    const max = job.job_max_salary;
    
    if (!min && !max) return 'Competitive';
    
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    
    if (min && max) return `${formatter.format(min)} - ${formatter.format(max)}`;
    if (min) return `${formatter.format(min)}+`;
    return `Up to ${formatter.format(max)}`;
  }
};

// ========== THEME MANAGEMENT ==========
const Theme = {
  init() {
    const savedTheme = Utils.load('theme', 'light');
    APP_STATE.theme = savedTheme;
    this.apply(savedTheme);
  },

  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    APP_STATE.theme = theme;
    Utils.save('theme', theme);

    const toggle = document.getElementById('themeToggle');
    const darkModeToggle = document.getElementById('darkModeToggle');

    if (toggle) {
      if (theme === 'dark') {
        toggle.classList.add('active');
      } else {
        toggle.classList.remove('active');
      }
    }

    if (darkModeToggle) {
      const icon = darkModeToggle.querySelector('.nav-icon');
      const text = darkModeToggle.querySelector('span:last-child');
      if (theme === 'dark') {
        icon.textContent = '☀️';
        text.textContent = 'Light';
      } else {
        icon.textContent = '🌙';
        text.textContent = 'Dark';
      }
    }
  },

  toggle() {
    const newTheme = APP_STATE.theme === 'light' ? 'dark' : 'light';
    this.apply(newTheme);
  }
};

// ========== JOB SEARCH ==========
const JobSearch = {
  async searchRealJobs() {
    if (!APP_STATE.userProfile) {
      console.warn('No user profile available for search');
      return [];
    }

    if (!CONFIG.ENABLE_REAL_JOBS || !CONFIG.JOBS_API_KEY || CONFIG.JOBS_API_KEY === 'YOUR_RAPIDAPI_KEY_HERE') {
      console.warn('Real job search not configured, using mock data');
      return MOCK_JOBS;
    }

    const query = APP_STATE.userProfile.role || 'software engineer';
    const location = APP_STATE.userProfile.location || '';
    const isRemote = location.toLowerCase().includes('remote');

    try {
      const params = new URLSearchParams({
        query,
        page: '1',
        num_pages: '1',
        date_posted: 'week',
        remote_jobs_only: isRemote ? 'true' : 'false'
      });

      if (location && !isRemote) {
        params.set('location', location);
      }

      const url = `https://jsearch.p.rapidapi.com/search?${params.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': CONFIG.JOBS_API_KEY,
          'X-RapidAPI-Host': CONFIG.JOBS_API_HOST
        }
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Using cached data.');
        }
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'OK' && data.data && data.data.length > 0) {
        console.log(`✅ Found ${data.data.length} real jobs`);
        return data.data;
      }

      console.warn('No jobs found, using mock data');
      return MOCK_JOBS;

    } catch (error) {
      console.error('Job search error:', error);
      this.showToast(error.message, 'warning');
      return MOCK_JOBS;
    }
  },

  showToast(message, type = 'info') {
    let toast = document.getElementById('toast');
    
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    
    toast.className = `toast toast-${type} show`;
    toast.textContent = message;
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 4000);
  }
};

// ========== JOB FEED RENDERING ==========
const JobFeed = {
  render() {
    const feedElement = document.getElementById('jobFeed');
    const loadingElement = document.getElementById('loadingState');
    const emptyElement = document.getElementById('emptyState');

    if (!feedElement) return;

    if (loadingElement) loadingElement.style.display = 'none';
    if (emptyElement) emptyElement.style.display = 'none';

    if (APP_STATE.jobs.length === 0) {
      if (emptyElement) emptyElement.style.display = 'block';
      feedElement.innerHTML = '';
      return;
    }

    feedElement.innerHTML = APP_STATE.jobs
      .map(job => this.createJobCard(job))
      .join('');

    this.attachEventListeners();
  },

  createJobCard(job) {
    const isSaved = APP_STATE.savedJobs.has(job.id || job.job_id);
    const matchData = job.matchData || { score: 0, reasons: [] };
    const companyInitials = Utils.getCompanyInitials(job.employer_name || job.company || 'Company');

    // Determine match badge class
    let matchClass = 'low';
    if (matchData.score >= 70) matchClass = 'high';
    else if (matchData.score >= 50) matchClass = 'medium';

    const jobLocation = job.job_is_remote 
      ? 'Remote' 
      : `${job.job_city || ''}${job.job_city && job.job_state ? ', ' : ''}${job.job_state || ''}`;

    return `
      <div class="job-card animate-fade-in" data-job-id="${job.id || job.job_id}">
        <div class="job-card-header">
          <div style="display: flex; align-items: start; flex: 1;">
            <div class="job-company-logo">${companyInitials}</div>
            <div class="job-info">
              <h3 class="job-title">${job.job_title || job.title}</h3>
              <div class="job-company">${job.employer_name || job.company}</div>
              <div class="job-meta">
                <span class="job-meta-item">📍 ${jobLocation}</span>
                <span class="job-meta-item">💼 ${job.job_employment_type || job.type || 'Full-time'}</span>
                <span class="job-meta-item">⏰ ${Utils.formatTimeAgo(job.job_posted_at_datetime_utc || job.postedAt)}</span>
                <span class="job-meta-item">💰 ${Utils.formatSalary(job)}</span>
              </div>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
            <div class="match-badge ${matchClass}">
              ✨ ${matchData.score}% Match
            </div>
            <div class="save-icon ${isSaved ? 'saved' : ''}" data-action="save" data-job-id="${job.id || job.job_id}">
              ${isSaved ? '❤️' : '🤍'}
            </div>
          </div>
        </div>

        <p class="job-description">${(job.job_description || job.description || '').substring(0, 200)}...</p>

        ${matchData.reasons.length > 0 ? `
        <div class="match-explanation">
          <div class="match-explanation-title">Why this matches</div>
          <ul class="match-explanation-list">
            ${matchData.reasons.map(reason => `<li>${reason}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        <div style="display: flex; gap: 12px; margin-top: 16px;">
          <button class="btn btn-primary" data-action="apply" data-job-id="${job.id || job.job_id}">
            Apply Now
          </button>
          <button class="btn btn-secondary" data-action="details" data-job-id="${job.id || job.job_id}">
            View Details
          </button>
        </div>
      </div>
    `;
  },

  attachEventListeners() {
    document.querySelectorAll('[data-action="save"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const jobId = btn.dataset.jobId;
        this.toggleSave(jobId);
      });
    });

    document.querySelectorAll('[data-action="apply"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const jobId = btn.dataset.jobId;
        this.handleApply(jobId);
      });
    });

    document.querySelectorAll('[data-action="details"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const jobId = btn.dataset.jobId;
        this.handleDetails(jobId);
      });
    });
  },

  toggleSave(jobId) {
    if (APP_STATE.savedJobs.has(jobId)) {
      APP_STATE.savedJobs.delete(jobId);
    } else {
      APP_STATE.savedJobs.add(jobId);
      APP_STATE.metrics.saved++;
    }

    Utils.save('savedJobs', Array.from(APP_STATE.savedJobs));
    Utils.save('metrics', APP_STATE.metrics);

    this.render();
    Metrics.update();
  },

  handleApply(jobId) {
    const job = APP_STATE.jobs.find(j => (j.id || j.job_id) === jobId);
    if (!job) return;

    APP_STATE.metrics.applied++;
    Utils.save('metrics', APP_STATE.metrics);
    Metrics.update();

    // Open apply link if available
    if (job.job_apply_link && job.job_apply_link !== '#') {
      window.open(job.job_apply_link, '_blank');
    } else {
      alert(`🎉 Great choice! In a real application, you would be directed to apply for:\n\n${job.job_title || job.title} at ${job.employer_name || job.company}`);
    }
  },

  handleDetails(jobId) {
    const job = APP_STATE.jobs.find(j => (j.id || j.job_id) === jobId);
    if (!job) return;

    APP_STATE.metrics.reviewed++;
    Utils.save('metrics', APP_STATE.metrics);
    Metrics.update();

    const description = job.job_description || job.description || 'No description available';
    alert(`📋 Job Details:\n\n${job.job_title || job.title}\n${job.employer_name || job.company}\n${job.job_city || job.location || ''}\n\n${description.substring(0, 300)}...\n\nSalary: ${Utils.formatSalary(job)}`);
  },

  showLoading() {
    const loadingElement = document.getElementById('loadingState');
    if (loadingElement) loadingElement.style.display = 'flex';
  },

  hideLoading() {
    const loadingElement = document.getElementById('loadingState');
    if (loadingElement) loadingElement.style.display = 'none';
  }
};

// ========== METRICS ==========
const Metrics = {
  update() {
    const reviewedEl = document.getElementById('jobsReviewed');
    const savedEl = document.getElementById('jobsSaved');
    const appliedEl = document.getElementById('jobsApplied');
    const matchRateEl = document.getElementById('matchRate');

    if (reviewedEl) reviewedEl.textContent = APP_STATE.metrics.reviewed;
    if (savedEl) savedEl.textContent = APP_STATE.metrics.saved;
    if (appliedEl) appliedEl.textContent = APP_STATE.metrics.applied;

    if (matchRateEl) {
      const totalJobs = APP_STATE.jobs.length;
      const highMatchJobs = APP_STATE.jobs.filter(j => {
        const score = j.matchData?.score || 0;
        return score >= 70;
      }).length;
      const matchRate = totalJobs > 0 ? Math.round((highMatchJobs / totalJobs) * 100) : 0;
      matchRateEl.textContent = `${matchRate}%`;
    }
  }
};

// ========== PREFERENCES ==========
const Preferences = {
  load() {
    const saved = Utils.load('preferences', null);
    if (saved) {
      APP_STATE.preferences = saved;
    }
    this.updateUI();
  },

  updateUI() {
    const titlesInput = document.getElementById('jobTitlesInput');
    const locationsInput = document.getElementById('locationsInput');
    const companiesInput = document.getElementById('companiesInput');
    const recencySelect = document.getElementById('recencySelect');

    if (titlesInput) titlesInput.value = APP_STATE.preferences.titles.join(', ');
    if (locationsInput) locationsInput.value = APP_STATE.preferences.locations.join(', ');
    if (companiesInput) companiesInput.value = APP_STATE.preferences.companies.join(', ');
    if (recencySelect) recencySelect.value = APP_STATE.preferences.recencyDays;
  },

  save() {
    const titlesInput = document.getElementById('jobTitlesInput');
    const locationsInput = document.getElementById('locationsInput');
    const companiesInput = document.getElementById('companiesInput');
    const recencySelect = document.getElementById('recencySelect');

    APP_STATE.preferences = {
      titles: titlesInput.value.split(',').map(s => s.trim()).filter(s => s),
      locations: locationsInput.value.split(',').map(s => s.trim()).filter(s => s),
      companies: companiesInput.value.split(',').map(s => s.trim()).filter(s => s),
      recencyDays: parseInt(recencySelect.value)
    };

    Utils.save('preferences', APP_STATE.preferences);

    const btn = document.getElementById('savePreferencesBtn');
    if (btn) {
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span>✅</span><span>Saved!</span>';
      btn.classList.add('btn-success');

      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.classList.remove('btn-success');
      }, 2000);
    }

    App.loadJobs();
  }
};

// ========== MAIN APP ==========
const App = {
  async init() {
    console.log('🎯 CareerScout initializing...');

    // Load saved data
    Theme.init();
    Preferences.load();

    const savedJobs = Utils.load('savedJobs', []);
    APP_STATE.savedJobs = new Set(savedJobs);

    const savedMetrics = Utils.load('metrics', null);
    if (savedMetrics) {
      APP_STATE.metrics = savedMetrics;
    }

    // Initialize onboarding
    initOnboarding();

    // Check for existing user profile
    if (hasMemory()) {
      console.log('✅ User profile found in memory');
      APP_STATE.userProfile = loadMemory();
      
      // Show welcome back toast
      JobSearch.showToast(
        `Welcome back! Searching for ${APP_STATE.userProfile.role} jobs in ${APP_STATE.userProfile.location}...`,
        'success'
      );
      
      // Load jobs automatically
      await this.loadJobs();
    } else {
      console.log('📋 No user profile found, showing onboarding');
      
      // Show onboarding for first-time users
      if (!CONFIG.SHOW_FAKE_JOBS) {
        setTimeout(() => showOnboarding(), 500);
      } else {
        // Show mock jobs as fallback
        await this.loadJobs();
      }
    }

    // Setup event listeners
    this.setupEventListeners();

    // Update metrics
    Metrics.update();

    console.log('✅ CareerScout ready!');
  },

  async loadJobs() {
    if (APP_STATE.searchInProgress) {
      console.log('Search already in progress, skipping...');
      return;
    }

    APP_STATE.searchInProgress = true;
    JobFeed.showLoading();

    try {
      let jobs = [];

      // If we have a user profile, search for real jobs
      if (APP_STATE.userProfile && CONFIG.ENABLE_REAL_JOBS) {
        jobs = await JobSearch.searchRealJobs();
      } else {
        // Use mock jobs as fallback
        jobs = MOCK_JOBS;
      }

      // Apply matching algorithm if we have a profile
      if (APP_STATE.userProfile) {
        const sortedJobs = sortJobsByMatch(jobs, APP_STATE.userProfile);
        APP_STATE.jobs = sortedJobs;
      } else {
        APP_STATE.jobs = jobs.map(job => ({
          ...job,
          matchData: { score: 0, reasons: [] }
        }));
      }

      JobFeed.hideLoading();
      JobFeed.render();
      Metrics.update();

    } catch (error) {
      console.error('Error loading jobs:', error);
      JobSearch.showToast('Failed to load jobs. Please try again.', 'error');
      JobFeed.hideLoading();
    } finally {
      APP_STATE.searchInProgress = false;
    }
  },

  setupEventListeners() {
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => Theme.toggle());
    }

    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
      darkModeToggle.addEventListener('click', () => Theme.toggle());
    }

    // Refresh feed
    const refreshBtn = document.getElementById('refreshFeedBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadJobs());
    }

    // Save preferences
    const savePrefsBtn = document.getElementById('savePreferencesBtn');
    if (savePrefsBtn) {
      savePrefsBtn.addEventListener('click', () => Preferences.save());
    }

    // Reset memory
    const resetBtn = document.getElementById('resetMemoryBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetMemory());
    }

    // Reset profile (show onboarding again)
    const resetProfileBtn = document.getElementById('resetProfileBtn');
    if (resetProfileBtn) {
      resetProfileBtn.addEventListener('click', () => this.resetProfile());
    }

    // AI toggle
    const aiToggle = document.getElementById('aiToggle');
    const apiKeySection = document.getElementById('apiKeySection');
    if (aiToggle && apiKeySection) {
      aiToggle.addEventListener('click', () => {
        aiToggle.classList.toggle('active');
        APP_STATE.useLiveAI = aiToggle.classList.contains('active');
        apiKeySection.style.display = APP_STATE.useLiveAI ? 'block' : 'none';
        Utils.save('useLiveAI', APP_STATE.useLiveAI);
      });

      const savedAI = Utils.load('useLiveAI', false);
      if (savedAI) {
        aiToggle.classList.add('active');
        apiKeySection.style.display = 'block';
        APP_STATE.useLiveAI = true;
      }
    }

    // Header search
    const headerSearch = document.getElementById('headerSearchInput');
    if (headerSearch) {
      headerSearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleSearch(e.target.value);
        }
      });
    }

    // Navigation items
    document.querySelectorAll('.header-nav-item[data-page]').forEach(item => {
      item.addEventListener('click', (e) => {
        const page = item.dataset.page;
        this.navigateTo(page);
      });
    });
  },

  handleSearch(query) {
    if (!query.trim()) return;

    alert(`🔍 Search feature coming soon!\n\nYou searched for: "${query}"\n\nIn the meantime, check out the "Search Real Jobs" button for live job search.`);
  },

  navigateTo(page) {
    document.querySelectorAll('.header-nav-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

    if (page === 'jobs') {
      window.location.href = 'search.html';
    } else if (page === 'saved') {
      alert('📑 Saved Jobs page coming soon!\n\nYou have ' + APP_STATE.savedJobs.size + ' saved jobs.');
    }
  },

  resetMemory() {
    if (!confirm('Are you sure you want to reset all saved data? This cannot be undone.')) {
      return;
    }

    APP_STATE.savedJobs.clear();
    APP_STATE.seenJobs.clear();
    APP_STATE.metrics = { reviewed: 0, saved: 0, applied: 0 };

    localStorage.removeItem('savedJobs');
    localStorage.removeItem('seenJobs');
    localStorage.removeItem('metrics');

    Metrics.update();
    JobFeed.render();

    alert('✅ Memory reset successfully!');
  },

  resetProfile() {
    if (!confirm('Reset your profile? You will go through onboarding again.')) {
      return;
    }

    clearMemory();
    APP_STATE.userProfile = null;
    
    JobSearch.showToast('Profile cleared. Let\'s start fresh!', 'info');
    
    setTimeout(() => {
      showOnboarding();
    }, 500);
  },

  onOnboardingComplete() {
    // Reload user profile
    APP_STATE.userProfile = loadMemory();
    
    // Load jobs with new profile
    this.loadJobs();
  }
};

// ========== INITIALIZE APP ==========
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}

// Export for debugging and onboarding callback
window.CareerScoutApp = {
  state: APP_STATE,
  utils: Utils,
  theme: Theme,
  feed: JobFeed,
  metrics: Metrics,
  preferences: Preferences,
  onOnboardingComplete: () => App.onOnboardingComplete()
};
