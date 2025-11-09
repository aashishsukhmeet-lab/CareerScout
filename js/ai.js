// ============================================
// AI Module - Resume Analysis via OpenAI API
// ============================================
// Extracts structured profile data from resume text

import { CONFIG } from './config.js';

/**
 * Analyze resume text using OpenAI API
 * @param {string} resumeText - Plain text resume content
 * @returns {Promise<Object>} Structured profile data
 */
export async function analyzeResume(resumeText) {
  if (!CONFIG.ENABLE_AI) {
    console.warn('AI is disabled in config');
    return getFallbackProfile(resumeText);
  }
  
  if (!CONFIG.AI_API_KEY || CONFIG.AI_API_KEY === 'YOUR_OPENAI_KEY_HERE') {
    console.warn('AI API key not configured, using fallback');
    return getFallbackProfile(resumeText);
  }
  
  try {
    const response = await fetch(`${CONFIG.AI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.AI_API_KEY}`
      },
      body: JSON.stringify({
        model: CONFIG.AI_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a resume parser. Extract structured data from resumes and return ONLY valid JSON with this exact schema:
{
  "skills": ["skill1", "skill2", ...],
  "keywords": ["keyword1", "keyword2", ...],
  "titles": ["Job Title 1", "Job Title 2", ...],
  "seniority": "Junior" | "Mid" | "Senior",
  "summary": "One sentence professional summary"
}

Rules:
- skills: Technical skills only (e.g., "Python", "SQL", "AWS")
- keywords: Industry terms and domains (e.g., "analytics", "machine learning")
- titles: Relevant job titles from experience (max 3)
- seniority: Based on years of experience (0-2=Junior, 3-7=Mid, 8+=Senior)
- summary: Concise one-sentence summary
- Return ONLY the JSON object, no markdown, no explanation`
          },
          {
            role: 'user',
            content: `Extract profile data from this resume:\n\n${resumeText}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in API response');
    }
    
    // Parse JSON from response
    const profile = JSON.parse(content.trim());
    
    // Validate profile structure
    if (!profile.skills || !profile.keywords || !profile.titles || !profile.seniority || !profile.summary) {
      throw new Error('Invalid profile structure from API');
    }
    
    console.log('✅ Resume analyzed by AI:', profile);
    return profile;
    
  } catch (error) {
    console.error('AI analysis failed:', error);
    return getFallbackProfile(resumeText);
  }
}

/**
 * Simple keyword extraction fallback when AI is unavailable
 * @param {string} resumeText - Resume text
 * @returns {Object} Basic profile data
 */
function getFallbackProfile(resumeText) {
  const text = resumeText.toLowerCase();
  
  // Common technical skills to look for
  const skillPatterns = [
    'python', 'java', 'javascript', 'typescript', 'react', 'node',
    'sql', 'nosql', 'aws', 'azure', 'gcp', 'docker', 'kubernetes',
    'api', 'rest', 'graphql', 'html', 'css', 'git', 'agile'
  ];
  
  const skills = skillPatterns.filter(skill => text.includes(skill));
  
  // Common job titles
  const titlePatterns = [
    'software engineer', 'product manager', 'data analyst', 'business analyst',
    'developer', 'designer', 'architect', 'manager', 'director', 'consultant'
  ];
  
  const titles = titlePatterns.filter(title => text.includes(title));
  
  // Determine seniority from keywords
  let seniority = 'Mid';
  if (text.includes('senior') || text.includes('lead') || text.includes('principal')) {
    seniority = 'Senior';
  } else if (text.includes('junior') || text.includes('entry') || text.includes('associate')) {
    seniority = 'Junior';
  }
  
  // Extract keywords (simple approach)
  const keywords = [
    'analytics', 'strategy', 'data', 'machine learning', 'ai',
    'cloud', 'security', 'mobile', 'web', 'backend', 'frontend'
  ].filter(keyword => text.includes(keyword));
  
  const profile = {
    skills: skills.length > 0 ? skills : ['Technology', 'Problem Solving'],
    keywords: keywords.length > 0 ? keywords : ['Professional'],
    titles: titles.length > 0 ? titles.slice(0, 3) : ['Professional'],
    seniority,
    summary: `Professional with experience in ${skills.slice(0, 3).join(', ') || 'various areas'}`
  };
  
  console.log('⚠️ Using fallback profile extraction:', profile);
  return profile;
}

/**
 * Test AI connection
 * @returns {Promise<boolean>} True if AI is accessible
 */
export async function testAIConnection() {
  if (!CONFIG.ENABLE_AI || !CONFIG.AI_API_KEY || CONFIG.AI_API_KEY === 'YOUR_OPENAI_KEY_HERE') {
    return false;
  }
  
  try {
    const response = await fetch(`${CONFIG.AI_API_BASE}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CONFIG.AI_API_KEY}`
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('AI connection test failed:', error);
    return false;
  }
}
