// ============================================
// Onboarding Module - UI Flow Management
// ============================================
// Handles 3-step onboarding modal

import { parseResumeFile, validateResumeText, isPDFJSLoaded } from './resume.js';
import { analyzeResume } from './ai.js';
import { saveMemory } from './memory.js';

let currentStep = 1;
let onboardingData = {
  role: '',
  location: '',
  resumeText: ''
};

/**
 * Show onboarding modal
 */
export function showOnboarding() {
  const modal = document.getElementById('onboardingModal');
  if (!modal) {
    console.error('Onboarding modal not found');
    return;
  }
  
  currentStep = 1;
  onboardingData = { role: '', location: '', resumeText: '' };
  
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  
  updateStep();
  
  console.log('📋 Onboarding started');
}

/**
 * Hide onboarding modal
 */
export function hideOnboarding() {
  const modal = document.getElementById('onboardingModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

/**
 * Initialize onboarding event listeners
 */
export function initOnboarding() {
  // Step 1: Role
  const roleForm = document.getElementById('roleForm');
  if (roleForm) {
    roleForm.addEventListener('submit', handleRoleSubmit);
  }
  
  // Step 2: Location
  const locationForm = document.getElementById('locationForm');
  if (locationForm) {
    locationForm.addEventListener('submit', handleLocationSubmit);
  }
  
  // Step 3: Resume
  const resumeForm = document.getElementById('resumeForm');
  if (resumeForm) {
    resumeForm.addEventListener('submit', handleResumeSubmit);
  }
  
  // File upload
  const fileInput = document.getElementById('resumeFileInput');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileUpload);
  }
  
  // Drag and drop
  const uploadArea = document.getElementById('uploadArea');
  if (uploadArea) {
    uploadArea.addEventListener('click', () => fileInput?.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('drop', handleDrop);
    uploadArea.addEventListener('dragleave', handleDragLeave);
  }
  
  // Skip AI button
  const skipAIBtn = document.getElementById('skipAIBtn');
  if (skipAIBtn) {
    skipAIBtn.addEventListener('click', handleSkipAI);
  }
  
  console.log('✅ Onboarding initialized');
}

/**
 * Update UI for current step
 */
function updateStep() {
  // Update progress indicator
  document.getElementById('progressText').textContent = `${currentStep}/3`;
  
  // Update progress bar
  const progressBar = document.querySelector('.progress-bar-fill');
  if (progressBar) {
    progressBar.style.width = `${(currentStep / 3) * 100}%`;
  }
  
  // Hide all steps
  document.querySelectorAll('.onboarding-step').forEach(step => {
    step.style.display = 'none';
  });
  
  // Show current step
  const currentStepEl = document.getElementById(`step${currentStep}`);
  if (currentStepEl) {
    currentStepEl.style.display = 'block';
  }
  
  // Focus on input
  setTimeout(() => {
    const input = currentStepEl?.querySelector('input, textarea');
    input?.focus();
  }, 100);
}

/**
 * Handle role form submission
 * @param {Event} e - Form event
 */
function handleRoleSubmit(e) {
  e.preventDefault();
  
  const roleInput = document.getElementById('roleInput');
  const role = roleInput?.value.trim();
  
  if (!role) {
    showToast('Please enter a role', 'error');
    return;
  }
  
  onboardingData.role = role;
  currentStep = 2;
  updateStep();
  
  console.log('✅ Role saved:', role);
}

/**
 * Handle location form submission
 * @param {Event} e - Form event
 */
function handleLocationSubmit(e) {
  e.preventDefault();
  
  const locationInput = document.getElementById('locationInput');
  const location = locationInput?.value.trim();
  
  if (!location) {
    showToast('Please enter a location', 'error');
    return;
  }
  
  onboardingData.location = location;
  currentStep = 3;
  updateStep();
  
  console.log('✅ Location saved:', location);
}

/**
 * Handle resume form submission
 * @param {Event} e - Form event
 */
async function handleResumeSubmit(e) {
  e.preventDefault();
  
  const textarea = document.getElementById('resumeTextarea');
  const resumeText = textarea?.value.trim();
  
  if (!resumeText) {
    showToast('Please paste your resume text or upload a file', 'error');
    return;
  }
  
  // Validate text
  const validation = validateResumeText(resumeText);
  if (!validation.valid) {
    showToast(validation.error, 'error');
    return;
  }
  
  onboardingData.resumeText = resumeText;
  
  // Complete onboarding with AI analysis
  await completeOnboarding();
}

/**
 * Handle file upload
 * @param {Event} e - Change event
 */
async function handleFileUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  
  await processFile(file);
}

/**
 * Handle drag over
 * @param {Event} e - Drag event
 */
function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.add('drag-over');
}

/**
 * Handle drag leave
 * @param {Event} e - Drag event
 */
function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove('drag-over');
}

/**
 * Handle drop
 * @param {Event} e - Drop event
 */
async function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove('drag-over');
  
  const file = e.dataTransfer.files?.[0];
  if (!file) return;
  
  await processFile(file);
}

/**
 * Process uploaded file
 * @param {File} file - File to process
 */
async function processFile(file) {
  showToast('Processing file...', 'info');
  showSkeleton();
  
  try {
    const text = await parseResumeFile(file);
    
    // Populate textarea
    const textarea = document.getElementById('resumeTextarea');
    if (textarea) {
      textarea.value = text;
    }
    
    onboardingData.resumeText = text;
    
    showToast(`✅ Extracted ${text.length} characters from ${file.name}`, 'success');
    hideSkeleton();
    
  } catch (error) {
    console.error('File processing error:', error);
    showToast(error.message, 'error');
    hideSkeleton();
  }
}

/**
 * Skip AI analysis
 */
function handleSkipAI() {
  const textarea = document.getElementById('resumeTextarea');
  const text = textarea?.value.trim();
  
  if (!text || text.length < 50) {
    showToast('Please enter some information about yourself', 'error');
    return;
  }
  
  completeOnboardingWithoutAI();
}

/**
 * Complete onboarding with AI analysis
 */
async function completeOnboarding() {
  showSkeleton();
  showToast('Analyzing your resume with AI...', 'info');
  
  try {
    // Analyze resume
    const profile = await analyzeResume(onboardingData.resumeText);
    
    // Create full profile
    const fullProfile = {
      role: onboardingData.role,
      location: onboardingData.location,
      skills: profile.skills || [],
      keywords: profile.keywords || [],
      titles: profile.titles || [],
      seniority: profile.seniority || 'Mid',
      resumeSummary: profile.summary || ''
    };
    
    // Save to memory
    saveMemory(fullProfile);
    
    // Hide modal
    hideOnboarding();
    hideSkeleton();
    
    // Show success toast
    showToast(`✅ Profile created! Searching for ${onboardingData.role} jobs...`, 'success');
    
    // Trigger app refresh
    if (window.CareerScoutApp?.onOnboardingComplete) {
      window.CareerScoutApp.onOnboardingComplete();
    }
    
    console.log('✅ Onboarding complete:', fullProfile);
    
  } catch (error) {
    console.error('Onboarding error:', error);
    showToast('AI analysis failed. Using basic profile.', 'warning');
    hideSkeleton();
    
    // Fallback to basic profile
    completeOnboardingWithoutAI();
  }
}

/**
 * Complete onboarding without AI (fallback)
 */
function completeOnboardingWithoutAI() {
  const basicProfile = {
    role: onboardingData.role,
    location: onboardingData.location,
    skills: [],
    keywords: [],
    titles: [onboardingData.role],
    seniority: 'Mid',
    resumeSummary: `Looking for ${onboardingData.role} positions in ${onboardingData.location}`
  };
  
  saveMemory(basicProfile);
  hideOnboarding();
  
  showToast(`✅ Profile saved! Searching for ${onboardingData.role} jobs...`, 'success');
  
  if (window.CareerScoutApp?.onOnboardingComplete) {
    window.CareerScoutApp.onOnboardingComplete();
  }
  
  console.log('✅ Onboarding complete (without AI):', basicProfile);
}

/**
 * Show loading skeleton
 */
function showSkeleton() {
  const skeleton = document.getElementById('loadingSkeleton');
  if (skeleton) {
    skeleton.style.display = 'block';
  }
}

/**
 * Hide loading skeleton
 */
function hideSkeleton() {
  const skeleton = document.getElementById('loadingSkeleton');
  if (skeleton) {
    skeleton.style.display = 'none';
  }
}

/**
 * Show toast notification
 * @param {string} message - Message to show
 * @param {string} type - Toast type: success, error, warning, info
 */
function showToast(message, type = 'info') {
  // Create toast if it doesn't exist
  let toast = document.getElementById('toast');
  
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  
  // Set type class
  toast.className = `toast toast-${type} show`;
  toast.textContent = message;
  
  // Auto hide after 4 seconds
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}
