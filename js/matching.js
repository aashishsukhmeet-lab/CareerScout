// ============================================
// Matching Algorithm Module
// ============================================
// Computes match scores between jobs and user profiles

import { CONFIG } from './config.js';

/**
 * Calculate match score between a job and user profile
 * @param {Object} job - Job posting object
 * @param {Object} profile - User profile object
 * @returns {Object} Match result with score and reasons
 */
export function calculateMatchScore(job, profile) {
  const weights = CONFIG.WEIGHTS;
  
  // Extract job data
  const jobTitle = (job.job_title || job.title || '').toLowerCase();
  const jobLocation = (job.job_city || job.job_state || job.location || '').toLowerCase();
  const jobDescription = (job.job_description || job.description || '').toLowerCase();
  const jobSkills = extractSkillsFromText(jobDescription);
  
  // Extract profile data
  const userSkills = (profile.skills || []).map(s => s.toLowerCase());
  const userKeywords = (profile.keywords || []).map(k => k.toLowerCase());
  const userTitles = (profile.titles || []).map(t => t.toLowerCase());
  const userLocation = (profile.location || '').toLowerCase();
  const userSeniority = (profile.seniority || 'Mid').toLowerCase();
  
  // Calculate individual scores
  const keywordScore = calculateKeywordSkillScore(jobSkills, jobDescription, userSkills, userKeywords);
  const titleScore = calculateTitleSimilarity(jobTitle, userTitles);
  const locationScore = calculateLocationMatch(jobLocation, userLocation, job.job_is_remote);
  const seniorityScore = calculateSeniorityFit(jobTitle, jobDescription, userSeniority);
  
  // Weighted total score (0-100)
  const totalScore = Math.round(
    (keywordScore * weights.KEYWORD_SKILL * 100) +
    (titleScore * weights.TITLE_SIMILARITY * 100) +
    (locationScore * weights.LOCATION_MATCH * 100) +
    (seniorityScore * weights.SENIORITY_FIT * 100)
  );
  
  // Generate match reasons
  const reasons = generateMatchReasons({
    keywordScore,
    titleScore,
    locationScore,
    seniorityScore,
    userSkills,
    jobSkills,
    jobTitle,
    userTitles,
    jobLocation,
    userLocation,
    isRemote: job.job_is_remote
  });
  
  return {
    score: Math.min(100, Math.max(0, totalScore)),
    reasons,
    breakdown: {
      keywords: Math.round(keywordScore * 100),
      title: Math.round(titleScore * 100),
      location: Math.round(locationScore * 100),
      seniority: Math.round(seniorityScore * 100)
    }
  };
}

/**
 * Calculate keyword and skill overlap score
 * @param {Array} jobSkills - Skills found in job
 * @param {string} jobDescription - Full job description
 * @param {Array} userSkills - User's skills
 * @param {Array} userKeywords - User's keywords
 * @returns {number} Score 0-1
 */
function calculateKeywordSkillScore(jobSkills, jobDescription, userSkills, userKeywords) {
  let matches = 0;
  let total = userSkills.length + userKeywords.length;
  
  if (total === 0) return 0.5; // Neutral if no user skills
  
  // Check skill matches
  for (const skill of userSkills) {
    if (jobSkills.includes(skill) || jobDescription.includes(skill)) {
      matches++;
    }
  }
  
  // Check keyword matches
  for (const keyword of userKeywords) {
    if (jobDescription.includes(keyword)) {
      matches++;
    }
  }
  
  return Math.min(1, matches / total);
}

/**
 * Calculate job title similarity
 * @param {string} jobTitle - Job title
 * @param {Array} userTitles - User's previous titles
 * @returns {number} Score 0-1
 */
function calculateTitleSimilarity(jobTitle, userTitles) {
  if (userTitles.length === 0) return 0.5; // Neutral if no titles
  
  let maxSimilarity = 0;
  
  for (const userTitle of userTitles) {
    // Exact match
    if (jobTitle === userTitle) {
      return 1.0;
    }
    
    // Partial match (word overlap)
    const jobWords = new Set(jobTitle.split(/\s+/).filter(w => w.length > 3));
    const userWords = new Set(userTitle.split(/\s+/).filter(w => w.length > 3));
    
    const intersection = new Set([...jobWords].filter(x => userWords.has(x)));
    const union = new Set([...jobWords, ...userWords]);
    
    if (union.size > 0) {
      const similarity = intersection.size / union.size;
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
  }
  
  return maxSimilarity;
}

/**
 * Calculate location match score
 * @param {string} jobLocation - Job location
 * @param {string} userLocation - User's preferred location
 * @param {boolean} isRemote - Whether job is remote
 * @returns {number} Score 0-1
 */
function calculateLocationMatch(jobLocation, userLocation, isRemote) {
  // Remote jobs always score well if user wants remote
  if (isRemote && (userLocation.includes('remote') || userLocation.includes('anywhere'))) {
    return 1.0;
  }
  
  if (isRemote) {
    return 0.9; // Remote is generally good
  }
  
  // Check for location overlap
  if (jobLocation.includes(userLocation) || userLocation.includes(jobLocation)) {
    return 1.0;
  }
  
  // Extract city/state from both
  const jobParts = jobLocation.split(/,|\s+/).map(p => p.trim()).filter(p => p.length > 2);
  const userParts = userLocation.split(/,|\s+/).map(p => p.trim()).filter(p => p.length > 2);
  
  for (const jobPart of jobParts) {
    for (const userPart of userParts) {
      if (jobPart.includes(userPart) || userPart.includes(jobPart)) {
        return 0.8;
      }
    }
  }
  
  return 0.3; // Different location, but still possible
}

/**
 * Calculate seniority fit score
 * @param {string} jobTitle - Job title
 * @param {string} jobDescription - Job description
 * @param {string} userSeniority - User's seniority level
 * @returns {number} Score 0-1
 */
function calculateSeniorityFit(jobTitle, jobDescription, userSeniority) {
  const text = (jobTitle + ' ' + jobDescription).toLowerCase();
  
  // Detect job seniority
  let jobSeniority = 'mid';
  
  if (text.includes('senior') || text.includes('lead') || text.includes('principal') || text.includes('staff')) {
    jobSeniority = 'senior';
  } else if (text.includes('junior') || text.includes('entry') || text.includes('associate') || text.includes('intern')) {
    jobSeniority = 'junior';
  }
  
  // Perfect match
  if (jobSeniority === userSeniority) {
    return 1.0;
  }
  
  // Adjacent levels (e.g., Mid applying to Senior)
  if (
    (jobSeniority === 'mid' && userSeniority === 'senior') ||
    (jobSeniority === 'senior' && userSeniority === 'mid') ||
    (jobSeniority === 'mid' && userSeniority === 'junior') ||
    (jobSeniority === 'junior' && userSeniority === 'mid')
  ) {
    return 0.7;
  }
  
  // Mismatch (e.g., Junior applying to Senior)
  return 0.4;
}

/**
 * Generate human-readable match reasons
 * @param {Object} data - Match calculation data
 * @returns {Array<string>} Array of reason strings
 */
function generateMatchReasons(data) {
  const reasons = [];
  
  // Skill matches
  const matchingSkills = data.userSkills.filter(skill => 
    data.jobSkills.includes(skill)
  );
  
  if (matchingSkills.length > 0) {
    reasons.push(`${matchingSkills.slice(0, 3).join(', ')} skills match`);
  }
  
  // Title similarity
  if (data.titleScore > 0.7) {
    reasons.push('Similar role to your experience');
  }
  
  // Location
  if (data.isRemote) {
    reasons.push('Remote position');
  } else if (data.locationScore > 0.7) {
    reasons.push('Location match');
  }
  
  // Seniority
  if (data.seniorityScore > 0.9) {
    reasons.push('Perfect seniority fit');
  }
  
  // Default reason if none
  if (reasons.length === 0) {
    reasons.push('Matches your profile');
  }
  
  return reasons;
}

/**
 * Extract skills from job text
 * @param {string} text - Job description text
 * @returns {Array<string>} Extracted skills
 */
function extractSkillsFromText(text) {
  const commonSkills = [
    'python', 'java', 'javascript', 'typescript', 'react', 'node', 'angular', 'vue',
    'sql', 'nosql', 'mongodb', 'postgresql', 'mysql',
    'aws', 'azure', 'gcp', 'cloud',
    'docker', 'kubernetes', 'ci/cd', 'devops',
    'api', 'rest', 'graphql', 'microservices',
    'html', 'css', 'sass', 'tailwind',
    'git', 'github', 'gitlab',
    'agile', 'scrum', 'jira',
    'machine learning', 'ai', 'data science',
    'tableau', 'power bi', 'excel',
    'salesforce', 'sap', 'oracle'
  ];
  
  const found = [];
  const lowerText = text.toLowerCase();
  
  for (const skill of commonSkills) {
    if (lowerText.includes(skill)) {
      found.push(skill);
    }
  }
  
  return found;
}

/**
 * Sort jobs by match score
 * @param {Array} jobs - Array of job objects
 * @param {Object} profile - User profile
 * @returns {Array} Sorted jobs with match data
 */
export function sortJobsByMatch(jobs, profile) {
  return jobs
    .map(job => ({
      ...job,
      matchData: calculateMatchScore(job, profile)
    }))
    .sort((a, b) => b.matchData.score - a.matchData.score);
}
