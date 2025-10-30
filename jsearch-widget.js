// jsearch-widget.js - Vanilla JS Job Search Widget
// No React, no build step required

// ========== STATE MANAGEMENT ==========
let state = {
  query: '',
  location: '',
  radius: '25',
  remoteOnly: false,
  loading: false,
  error: null,
  results: [],
  lastRequestUrl: '',
  apiBase: '/api'
};

// ========== UTILITIES ==========
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  } catch {
    return dateString;
  }
}

function formatSalary(job) {
  const min = job.job_min_salary;
  const max = job.job_max_salary;
  const currency = job.job_salary_currency || 'USD';
  const period = job.job_salary_period || 'YEAR';
  
  if (!min && !max) return 'Not specified';
  
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  
  let salaryStr = '';
  if (min && max) {
    salaryStr = `${formatter.format(min)} - ${formatter.format(max)}`;
  } else if (min) {
    salaryStr = `${formatter.format(min)}+`;
  } else {
    salaryStr = `Up to ${formatter.format(max)}`;
  }
  
  const periodMap = {
    'YEAR': '/year',
    'MONTH': '/month',
    'WEEK': '/week',
    'HOUR': '/hour'
  };
  
  return salaryStr + (periodMap[period] || '');
}

function extractSkills(job) {
  const skills = [];
  
  // Check highlights
  if (job.job_highlights?.Qualifications) {
    job.job_highlights.Qualifications.forEach(q => {
      const skillKeywords = ['experience', 'proficient', 'knowledge', 'skilled', 'familiar'];
      if (skillKeywords.some(kw => q.toLowerCase().includes(kw))) {
        skills.push(q);
      }
    });
  }
  
  // Check description for common skills
  const description = (job.job_description || '').toLowerCase();
  const commonSkills = [
    'Python', 'Java', 'JavaScript', 'React', 'Node.js', 'SQL', 'AWS', 'Azure',
    'Docker', 'Kubernetes', 'Git', 'Agile', 'Scrum', 'REST API', 'GraphQL',
    'TypeScript', 'Angular', 'Vue.js', 'MongoDB', 'PostgreSQL', 'Redis'
  ];
  
  commonSkills.forEach(skill => {
    if (description.includes(skill.toLowerCase()) && skills.length < 5) {
      skills.push(skill);
    }
  });
  
  return skills.slice(0, 5); // Max 5 skills
}

// ========== API CALLS ==========
async function searchJobs() {
  state.loading = true;
  state.error = null;
  state.results = [];
  render();
  
  const params = new URLSearchParams({
    query: state.query || 'software engineer',
    page: '1',
    remote_jobs_only: state.remoteOnly ? 'true' : 'false'
  });
  
  if (state.location && !state.remoteOnly) {
    params.set('location', state.location);
    if (state.radius) {
      params.set('radius', state.radius);
    }
  }
  
  const url = `${state.apiBase}/jsearch?${params.toString()}`;
  state.lastRequestUrl = url;
  
  // Save to localStorage
  try {
    localStorage.setItem('jsearch:lastQuery', JSON.stringify({
      query: state.query,
      location: state.location,
      radius: state.radius,
      remoteOnly: state.remoteOnly
    }));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
  
  try {
    const response = await fetch(url);
    
    if (response.status === 429) {
      throw new Error('Rate limited by API. Please try again in a few minutes.');
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.data) {
      state.results = data.data;
    } else {
      throw new Error(data.error || 'No results found');
    }
  } catch (err) {
    state.error = err.message;
    console.error('Search error:', err);
  } finally {
    state.loading = false;
    render();
  }
}

// ========== RENDER FUNCTIONS ==========
function render() {
  const root = document.getElementById('jsearch-root');
  if (!root) return;
  
  root.innerHTML = `
    <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
      ${renderSearchForm()}
    </div>
    
    ${state.loading ? renderLoading() : ''}
    ${state.error ? renderError() : ''}
    ${state.results.length > 0 ? renderResults() : ''}
    ${state.lastRequestUrl && !state.loading ? renderDebugInfo() : ''}
  `;
  
  attachEventListeners();
}

function renderSearchForm() {
  return `
    <form id="search-form" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Keywords -->
        <div>
          <label for="query" class="block text-sm font-semibold text-gray-700 mb-1">
            Job Title / Keywords
          </label>
          <input
            type="text"
            id="query"
            name="query"
            placeholder="e.g., Product Manager, Software Engineer"
            value="${state.query}"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <!-- Location -->
        <div>
          <label for="location" class="block text-sm font-semibold text-gray-700 mb-1">
            Location (City, State, ZIP)
          </label>
          <input
            type="text"
            id="location"
            name="location"
            placeholder="e.g., New York, NY or 10001"
            value="${state.location}"
            ${state.remoteOnly ? 'disabled' : ''}
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${state.remoteOnly ? 'bg-gray-100' : ''}"
          />
        </div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Radius -->
        <div>
          <label for="radius" class="block text-sm font-semibold text-gray-700 mb-1">
            Search Radius (miles)
          </label>
          <select
            id="radius"
            name="radius"
            ${state.remoteOnly ? 'disabled' : ''}
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${state.remoteOnly ? 'bg-gray-100' : ''}"
          >
            <option value="5" ${state.radius === '5' ? 'selected' : ''}>5 miles</option>
            <option value="10" ${state.radius === '10' ? 'selected' : ''}>10 miles</option>
            <option value="25" ${state.radius === '25' ? 'selected' : ''}>25 miles</option>
            <option value="50" ${state.radius === '50' ? 'selected' : ''}>50 miles</option>
            <option value="100" ${state.radius === '100' ? 'selected' : ''}>100 miles</option>
          </select>
        </div>
        
        <!-- Remote Only -->
        <div class="flex items-end">
          <label class="flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="remoteOnly"
              name="remoteOnly"
              ${state.remoteOnly ? 'checked' : ''}
              class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span class="ml-2 text-sm font-semibold text-gray-700">Remote Only</span>
          </label>
        </div>
        
        <!-- Search Button -->
        <div class="flex items-end">
          <button
            type="submit"
            class="w-full bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition"
          >
            🔍 Search Jobs
          </button>
        </div>
      </div>
    </form>
  `;
}

function renderLoading() {
  return `
    <div class="bg-white rounded-lg shadow-lg p-8 text-center">
      <div class="loading-spinner"></div>
      <p class="text-gray-600 mt-4">Searching for jobs...</p>
    </div>
  `;
}

function renderError() {
  return `
    <div class="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg shadow-lg mb-6" role="alert">
      <div class="flex items-start">
        <span class="text-2xl mr-3">⚠️</span>
        <div>
          <h3 class="text-red-800 font-bold text-lg mb-1">Search Error</h3>
          <p class="text-red-700">${state.error}</p>
        </div>
      </div>
    </div>
  `;
}

function renderResults() {
  const resultCount = state.results.length;
  
  return `
    <div class="bg-white rounded-lg shadow-lg p-6">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-2xl font-bold text-gray-800" aria-live="polite">
          Found ${resultCount} Job${resultCount !== 1 ? 's' : ''}
        </h2>
      </div>
      
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b-2 border-gray-200">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Title</th>
              <th class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Company</th>
              <th class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Type</th>
              <th class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Location</th>
              <th class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Posted</th>
              <th class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Salary</th>
              <th class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Skills</th>
              <th class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${state.results.map((job, index) => renderJobRow(job, index)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderJobRow(job, index) {
  const skills = extractSkills(job);
  const isRemote = job.job_is_remote || false;
  
  return `
    <tr class="hover:bg-gray-50 transition ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
      <!-- Title -->
      <td class="px-4 py-3">
        <div class="font-semibold text-gray-900">${job.job_title || 'N/A'}</div>
        ${job.job_employment_type ? `<span class="inline-block px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded mt-1">${job.job_employment_type}</span>` : ''}
      </td>
      
      <!-- Company -->
      <td class="px-4 py-3">
        <div class="font-medium text-gray-800">${job.employer_name || 'N/A'}</div>
        ${job.employer_logo ? `<img src="${job.employer_logo}" alt="${job.employer_name}" class="h-6 mt-1" onerror="this.style.display='none'">` : ''}
      </td>
      
      <!-- Type -->
      <td class="px-4 py-3">
        <span class="text-sm text-gray-600">${job.job_employment_type || 'N/A'}</span>
      </td>
      
      <!-- Location -->
      <td class="px-4 py-3">
        <div class="text-sm text-gray-700">
          ${isRemote ? '🌐 Remote' : (job.job_city && job.job_state ? `${job.job_city}, ${job.job_state}` : job.job_country || 'N/A')}
        </div>
      </td>
      
      <!-- Posted -->
      <td class="px-4 py-3">
        <span class="text-sm text-gray-600">${formatDate(job.job_posted_at_datetime_utc)}</span>
      </td>
      
      <!-- Salary -->
      <td class="px-4 py-3">
        <span class="text-sm font-medium text-green-700">${formatSalary(job)}</span>
      </td>
      
      <!-- Skills -->
      <td class="px-4 py-3">
        <div class="flex flex-wrap gap-1">
          ${skills.length > 0 ? skills.map(skill => `
            <span class="inline-block px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-200 rounded">${skill}</span>
          `).join('') : '<span class="text-xs text-gray-500">N/A</span>'}
        </div>
      </td>
      
      <!-- Actions -->
      <td class="px-4 py-3">
        <div class="flex gap-2">
          ${job.job_apply_link ? `
            <a href="${job.job_apply_link}" target="_blank" rel="noopener noreferrer" 
               class="inline-block px-3 py-1 text-sm font-semibold text-white bg-blue-600 rounded hover:bg-blue-700 transition">
              Apply
            </a>
          ` : ''}
          ${job.job_google_link ? `
            <a href="${job.job_google_link}" target="_blank" rel="noopener noreferrer"
               class="inline-block px-3 py-1 text-sm font-semibold text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition">
              View
            </a>
          ` : ''}
        </div>
      </td>
    </tr>
  `;
}

function renderDebugInfo() {
  return `
    <div class="bg-gray-100 rounded-lg p-4 mt-6">
      <details>
        <summary class="cursor-pointer text-sm font-semibold text-gray-700">🔧 Debug Info</summary>
        <div class="mt-2 text-xs text-gray-600 break-all">
          <strong>Request URL:</strong> ${state.lastRequestUrl}
        </div>
      </details>
    </div>
  `;
}

// ========== EVENT HANDLERS ==========
function attachEventListeners() {
  const form = document.getElementById('search-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      state.query = document.getElementById('query').value;
      state.location = document.getElementById('location').value;
      state.radius = document.getElementById('radius').value;
      state.remoteOnly = document.getElementById('remoteOnly').checked;
      searchJobs();
    });
  }
  
  const remoteCheckbox = document.getElementById('remoteOnly');
  if (remoteCheckbox) {
    remoteCheckbox.addEventListener('change', (e) => {
      state.remoteOnly = e.target.checked;
      render();
    });
  }
}

// ========== INITIALIZATION ==========
function loadSavedQuery() {
  try {
    const saved = localStorage.getItem('jsearch:lastQuery');
    if (saved) {
      const parsed = JSON.parse(saved);
      state.query = parsed.query || '';
      state.location = parsed.location || '';
      state.radius = parsed.radius || '25';
      state.remoteOnly = parsed.remoteOnly || false;
    }
  } catch (e) {
    console.warn('Failed to load saved query:', e);
  }
}

// ========== PUBLIC API ==========
export function mountJSearchWidget({ root, apiBase, useTailwind = true }) {
  if (!root) {
    console.error('mountJSearchWidget: root element is required');
    return;
  }
  
  state.apiBase = apiBase || '/api';
  
  // Load saved query
  loadSavedQuery();
  
  // Initial render
  render();
  
  console.log('JSearch Widget mounted successfully');
}
