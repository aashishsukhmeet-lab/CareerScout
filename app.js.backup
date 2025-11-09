// ============================================
// CareerScout - Modern AI Career Platform
// ============================================

// ========== STATE MANAGEMENT ==========
const APP_STATE = {
  jobs: [],
  savedJobs: new Set(),
  seenJobs: new Set(),
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
  theme: 'light'
};

// ========== MOCK JOB DATA ==========
const MOCK_JOBS = [
  {
    id: "j1",
    title: "Senior Product Manager",
    company: "Stripe",
    location: "Remote",
    type: "Full-time",
    postedDaysAgo: 2,
    skills: ["Product Strategy", "SQL", "API Design", "Analytics"],
    description: "Lead product strategy for payment APIs serving millions of businesses worldwide. Work with engineering teams to build scalable solutions.",
    salary: "$180k-240k",
    matchScore: 0.92
  },
  {
    id: "j2",
    title: "Product Manager - AI",
    company: "OpenAI",
    location: "San Francisco, CA",
    type: "Full-time",
    postedDaysAgo: 1,
    skills: ["AI/ML", "Product Strategy", "Python", "APIs"],
    description: "Lead product development for cutting-edge AI capabilities. Shape the future of artificial intelligence products.",
    salary: "$220k-300k",
    matchScore: 0.88
  },
  {
    id: "j3",
    title: "Business Analyst",
    company: "Salesforce",
    location: "New York, NY",
    type: "Full-time",
    postedDaysAgo: 3,
    skills: ["SQL", "Tableau", "Salesforce", "Excel"],
    description: "Analyze customer data and provide insights to drive business growth. Partner with sales and marketing teams.",
    salary: "$110k-150k",
    matchScore: 0.85
  },
  {
    id: "j4",
    title: "Senior Business Analyst",
    company: "Microsoft",
    location: "Remote",
    type: "Full-time",
    postedDaysAgo: 4,
    skills: ["Power BI", "SQL", "Python", "Azure"],
    description: "Partner with engineering teams to optimize cloud infrastructure performance. Drive data-driven decisions.",
    salary: "$140k-180k",
    matchScore: 0.82
  },
  {
    id: "j5",
    title: "Technical Product Manager",
    company: "Google",
    location: "Mountain View, CA",
    type: "Full-time",
    postedDaysAgo: 1,
    skills: ["APIs", "Python", "Data Analysis", "Machine Learning"],
    description: "Build ML-powered features for Google Search affecting billions of users. Work at the cutting edge of technology.",
    salary: "$200k-280k",
    matchScore: 0.90
  },
  {
    id: "j6",
    title: "Product Manager - Payments",
    company: "Square",
    location: "Remote",
    type: "Full-time",
    postedDaysAgo: 2,
    skills: ["Fintech", "Product Strategy", "SQL", "APIs"],
    description: "Shape the future of commerce for small businesses. Build payment solutions that empower entrepreneurs.",
    salary: "$155k-205k",
    matchScore: 0.86
  },
  {
    id: "j7",
    title: "Data Analyst",
    company: "Netflix",
    location: "Los Gatos, CA",
    type: "Full-time",
    postedDaysAgo: 2,
    skills: ["SQL", "Python", "Statistics", "A/B Testing"],
    description: "Analyze viewer behavior to optimize content recommendations. Impact millions of entertainment decisions.",
    salary: "$120k-160k",
    matchScore: 0.78
  },
  {
    id: "j8",
    title: "Associate Product Manager",
    company: "Meta",
    location: "Menlo Park, CA",
    type: "Full-time",
    postedDaysAgo: 3,
    skills: ["Product Design", "Analytics", "SQL", "Experimentation"],
    description: "Early career role building social features for billions of users. Learn from world-class product leaders.",
    salary: "$140k-180k",
    matchScore: 0.80
  },
  {
    id: "j9",
    title: "Product Manager - Infrastructure",
    company: "Databricks",
    location: "Remote",
    type: "Full-time",
    postedDaysAgo: 4,
    skills: ["Cloud", "SQL", "APIs", "Data Engineering"],
    description: "Build platform tools for data teams at scale. Work with Apache Spark and modern data infrastructure.",
    salary: "$175k-225k",
    matchScore: 0.84
  },
  {
    id: "j10",
    title: "Business Intelligence Analyst",
    company: "Airbnb",
    location: "San Francisco, CA",
    type: "Full-time",
    postedDaysAgo: 5,
    skills: ["SQL", "Tableau", "Python", "Statistics"],
    description: "Generate insights on host and guest behavior to drive product decisions. Work with a global marketplace.",
    salary: "$130k-170k",
    matchScore: 0.81
  }
];

// ========== UTILITY FUNCTIONS ==========
const Utils = {
  // Save to localStorage
  save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  },

  // Load from localStorage
  load(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
      return defaultValue;
    }
  },

  // Generate match reason
  getMatchReason(job, preferences) {
    const reasons = [];

    if (preferences.titles.some(t => job.title.toLowerCase().includes(t.toLowerCase()))) {
      reasons.push('Title match');
    }

    if (preferences.locations.some(l => job.location.toLowerCase().includes(l.toLowerCase()))) {
      reasons.push('Location match');
    }

    if (preferences.companies.some(c => job.company.toLowerCase().includes(c.toLowerCase()))) {
      reasons.push('Target company');
    }

    if (job.postedDaysAgo <= 3) {
      reasons.push('Recently posted');
    }

    if (job.matchScore >= 0.85) {
      reasons.push('High AI match score');
    }

    return reasons.length > 0 ? reasons.join(' • ') : 'Based on your profile';
  },

  // Format time ago
  formatTimeAgo(days) {
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  },

  // Get company initials
  getCompanyInitials(company) {
    return company
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  },

  // Calculate match percentage
  getMatchPercentage(score) {
    return Math.round(score * 100);
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

    // Update dark mode toggle
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

// ========== JOB FEED RENDERING ==========
const JobFeed = {
  render() {
    const feedElement = document.getElementById('jobFeed');
    const loadingElement = document.getElementById('loadingState');
    const emptyElement = document.getElementById('emptyState');

    if (!feedElement) return;

    // Hide loading and empty states
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

    // Attach event listeners
    this.attachEventListeners();
  },

  createJobCard(job) {
    const isSaved = APP_STATE.savedJobs.has(job.id);
    const matchReason = Utils.getMatchReason(job, APP_STATE.preferences);
    const matchPercentage = Utils.getMatchPercentage(job.matchScore);
    const companyInitials = Utils.getCompanyInitials(job.company);

    return `
      <div class="job-card animate-fade-in" data-job-id="${job.id}">
        <div class="job-card-header">
          <div style="display: flex; align-items: start; flex: 1;">
            <div class="job-company-logo">${companyInitials}</div>
            <div class="job-info">
              <h3 class="job-title">${job.title}</h3>
              <div class="job-company">${job.company}</div>
              <div class="job-meta">
                <span class="job-meta-item">📍 ${job.location}</span>
                <span class="job-meta-item">💼 ${job.type}</span>
                <span class="job-meta-item">⏰ ${Utils.formatTimeAgo(job.postedDaysAgo)}</span>
                <span class="job-meta-item">💰 ${job.salary}</span>
              </div>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
            <div class="confidence-badge">
              ✨ ${matchPercentage}% Match
            </div>
            <div class="save-icon ${isSaved ? 'saved' : ''}" data-action="save" data-job-id="${job.id}">
              ${isSaved ? '❤️' : '🤍'}
            </div>
          </div>
        </div>

        <p class="job-description">${job.description}</p>

        <div class="ai-insight">
          <div class="ai-insight-title">AI Insight</div>
          <div class="ai-insight-text">${matchReason}</div>
        </div>

        <div class="tags">
          ${job.skills.map(skill => `<span class="tag">${skill}</span>`).join('')}
          ${job.location.toLowerCase().includes('remote') ? '<span class="tag tag-remote">🌍 Remote</span>' : ''}
        </div>

        <div style="display: flex; gap: 12px; margin-top: 16px;">
          <button class="btn btn-primary" data-action="apply" data-job-id="${job.id}">
            Apply Now
          </button>
          <button class="btn btn-secondary" data-action="details" data-job-id="${job.id}">
            View Details
          </button>
          <button class="btn btn-outline" data-action="share" data-job-id="${job.id}">
            Share
          </button>
        </div>
      </div>
    `;
  },

  attachEventListeners() {
    // Save button
    document.querySelectorAll('[data-action="save"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const jobId = btn.dataset.jobId;
        this.toggleSave(jobId);
      });
    });

    // Apply button
    document.querySelectorAll('[data-action="apply"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const jobId = btn.dataset.jobId;
        this.handleApply(jobId);
      });
    });

    // Details button
    document.querySelectorAll('[data-action="details"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const jobId = btn.dataset.jobId;
        this.handleDetails(jobId);
      });
    });

    // Share button
    document.querySelectorAll('[data-action="share"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const jobId = btn.dataset.jobId;
        this.handleShare(jobId);
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
    const job = APP_STATE.jobs.find(j => j.id === jobId);
    if (!job) return;

    APP_STATE.metrics.applied++;
    Utils.save('metrics', APP_STATE.metrics);
    Metrics.update();

    alert(`🎉 Great choice! In a real application, you would be directed to apply for:\n\n${job.title} at ${job.company}`);
  },

  handleDetails(jobId) {
    const job = APP_STATE.jobs.find(j => j.id === jobId);
    if (!job) return;

    APP_STATE.metrics.reviewed++;
    Utils.save('metrics', APP_STATE.metrics);
    Metrics.update();

    alert(`📋 Job Details:\n\n${job.title}\n${job.company}\n${job.location}\n\n${job.description}\n\nSkills: ${job.skills.join(', ')}\nSalary: ${job.salary}`);
  },

  handleShare(jobId) {
    const job = APP_STATE.jobs.find(j => j.id === jobId);
    if (!job) return;

    const shareText = `Check out this job: ${job.title} at ${job.company}`;

    if (navigator.share) {
      navigator.share({
        title: job.title,
        text: shareText,
        url: window.location.href
      }).catch(err => console.log('Error sharing:', err));
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText)
        .then(() => alert('✅ Job details copied to clipboard!'))
        .catch(() => alert('❌ Could not copy to clipboard'));
    }
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
      const highMatchJobs = APP_STATE.jobs.filter(j => j.matchScore >= 0.8).length;
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

    // Show success feedback
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

    // Refresh feed with new preferences
    App.loadJobs();
  }
};

// ========== MAIN APP ==========
const App = {
  init() {
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

    // Load jobs
    this.loadJobs();

    // Setup event listeners
    this.setupEventListeners();

    // Update metrics
    Metrics.update();

    console.log('✅ CareerScout ready!');
  },

  loadJobs() {
    JobFeed.showLoading();

    // Simulate API call delay
    setTimeout(() => {
      // Filter and sort jobs based on preferences
      let filteredJobs = [...MOCK_JOBS];

      // Filter by recency
      filteredJobs = filteredJobs.filter(
        job => job.postedDaysAgo <= APP_STATE.preferences.recencyDays
      );

      // Sort by match score
      filteredJobs.sort((a, b) => b.matchScore - a.matchScore);

      APP_STATE.jobs = filteredJobs;
      JobFeed.hideLoading();
      JobFeed.render();
      Metrics.update();
    }, 500);
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

      // Load saved AI setting
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
    // Update active state
    document.querySelectorAll('.header-nav-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

    // Handle navigation
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
  }
};

// ========== INITIALIZE APP ==========
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}

// Export for debugging
window.CareerScoutApp = {
  state: APP_STATE,
  utils: Utils,
  theme: Theme,
  feed: JobFeed,
  metrics: Metrics,
  preferences: Preferences
};
