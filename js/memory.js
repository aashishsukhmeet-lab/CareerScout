// ============================================
// Memory Module - localStorage Wrapper
// ============================================
// Manages user profile persistence in localStorage

const MEMORY_KEY = 'careerscout.user';

/**
 * Load user profile from localStorage
 * @returns {Object|null} User profile or null if not found
 */
export function loadMemory() {
  try {
    const data = localStorage.getItem(MEMORY_KEY);
    if (!data) return null;
    
    const profile = JSON.parse(data);
    
    // Validate profile structure
    if (!profile.role || !profile.location) {
      console.warn('Invalid profile structure, clearing memory');
      clearMemory();
      return null;
    }
    
    return profile;
  } catch (error) {
    console.error('Failed to load memory:', error);
    return null;
  }
}

/**
 * Save user profile to localStorage
 * @param {Object} profile - User profile data
 */
export function saveMemory(profile) {
  try {
    // Add timestamp
    profile.lastSeenAt = new Date().toISOString();
    
    // Validate required fields
    if (!profile.role || !profile.location) {
      throw new Error('Profile must have role and location');
    }
    
    localStorage.setItem(MEMORY_KEY, JSON.stringify(profile));
    console.log('✅ Profile saved to memory');
    return true;
  } catch (error) {
    console.error('Failed to save memory:', error);
    return false;
  }
}

/**
 * Check if user profile exists
 * @returns {boolean} True if profile exists
 */
export function hasMemory() {
  try {
    const data = localStorage.getItem(MEMORY_KEY);
    if (!data) return false;
    
    const profile = JSON.parse(data);
    return !!(profile.role && profile.location);
  } catch (error) {
    return false;
  }
}

/**
 * Clear user profile from localStorage
 */
export function clearMemory() {
  try {
    localStorage.removeItem(MEMORY_KEY);
    console.log('🗑️ Memory cleared');
    return true;
  } catch (error) {
    console.error('Failed to clear memory:', error);
    return false;
  }
}

/**
 * Get memory statistics
 * @returns {Object} Statistics about memory usage
 */
export function getMemoryStats() {
  const profile = loadMemory();
  
  if (!profile) {
    return {
      exists: false,
      daysSinceLastSeen: null,
      skillCount: 0,
      keywordCount: 0
    };
  }
  
  const lastSeen = new Date(profile.lastSeenAt);
  const now = new Date();
  const daysSinceLastSeen = Math.floor((now - lastSeen) / (1000 * 60 * 60 * 24));
  
  return {
    exists: true,
    daysSinceLastSeen,
    skillCount: profile.skills?.length || 0,
    keywordCount: profile.keywords?.length || 0,
    seniority: profile.seniority || 'Unknown'
  };
}
