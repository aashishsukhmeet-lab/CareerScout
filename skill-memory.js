// ========== ADAPTIVE SKILL MEMORY & CONVERSATIONAL LEARNING MODULE ==========
// This module provides intelligent conversational learning capabilities that extract
// user skills, preferences, and career goals through natural dialogue.

class AdaptiveSkillMemory {
  constructor() {
    // Initialize skill memory graph from localStorage
    this.skillGraph = this.loadSkillGraph();
    
    // Conversation state
    this.conversationContext = {
      currentTopic: null,
      pendingConfirmations: [],
      conversationHistory: [],
      lastInteractionTime: null,
      sessionInsights: []
    };
    
    // Skill taxonomy and categories
    this.skillTaxonomy = {
      technical: {
        programming: ['JavaScript', 'Python', 'Java', 'C++', 'TypeScript', 'Go', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin'],
        frameworks: ['React', 'Angular', 'Vue.js', 'Node.js', 'Django', 'Flask', 'Spring', 'Express', '.NET'],
        databases: ['SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'DynamoDB', 'Cassandra', 'Oracle'],
        cloud: ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'CloudFormation'],
        tools: ['Git', 'Jenkins', 'Jira', 'Confluence', 'CircleCI', 'GitHub Actions', 'GitLab CI'],
        dataScience: ['Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'TensorFlow', 'PyTorch', 'Scikit-learn'],
        mobile: ['iOS Development', 'Android Development', 'React Native', 'Flutter', 'Swift', 'Kotlin']
      },
      business: {
        management: ['Project Management', 'Product Management', 'Program Management', 'Agile', 'Scrum', 'Kanban'],
        strategy: ['Business Strategy', 'Product Strategy', 'Go-to-Market', 'Competitive Analysis', 'Market Research'],
        finance: ['Financial Analysis', 'Budgeting', 'Forecasting', 'Financial Modeling', 'Accounting', 'P&L Management'],
        operations: ['Operations Management', 'Process Improvement', 'Supply Chain', 'Logistics', 'Quality Assurance']
      },
      soft: {
        leadership: ['Team Leadership', 'Mentoring', 'Coaching', 'Conflict Resolution', 'Decision Making'],
        communication: ['Public Speaking', 'Written Communication', 'Presentation Skills', 'Stakeholder Management', 'Negotiation'],
        collaboration: ['Cross-functional Collaboration', 'Remote Team Management', 'Facilitation', 'Consensus Building'],
        analytical: ['Problem Solving', 'Critical Thinking', 'Data Analysis', 'Research', 'Strategic Thinking']
      },
      domain: {
        industries: ['Healthcare', 'Finance', 'E-commerce', 'Education', 'Entertainment', 'SaaS', 'Fintech', 'Biotech'],
        specializations: ['Cybersecurity', 'DevOps', 'UX Design', 'Data Engineering', 'Sales Engineering', 'Solution Architecture']
      }
    };
    
    // Conversation templates and follow-up questions
    this.conversationTemplates = {
      skillConfirmation: [
        "I noticed you mentioned {skill}. Would you say you have experience with that?",
        "It sounds like you work with {skill}. How long have you been using it?",
        "You brought up {skill} - is that something you use regularly in your work?"
      ],
      skillDepth: [
        "On a scale of 1-5, how would you rate your expertise in {skill}?",
        "Have you worked on any projects where {skill} was central to the solution?",
        "What aspects of {skill} do you enjoy most?"
      ],
      relatedSkills: [
        "Since you know {skill}, do you also have experience with {relatedSkill}?",
        "Have you worked with {relatedSkill}? It often goes hand-in-hand with {skill}.",
        "Many {skill} professionals also use {relatedSkill}. Is that true for you?"
      ],
      careerGoals: [
        "What kind of role are you targeting in your job search?",
        "Are you looking to stay in your current field or explore something new?",
        "What's most important to you in your next position?",
        "Where do you see your career heading in the next 2-3 years?"
      ],
      workPreferences: [
        "Do you prefer working remotely, in-office, or hybrid?",
        "Are you open to relocating for the right opportunity?",
        "What size company do you prefer - startup, mid-size, or enterprise?",
        "What's your ideal team size to work with?"
      ],
      leadership: [
        "Have you led or managed teams before?",
        "Do you have experience with cross-functional team leadership?",
        "Are you interested in management or IC (individual contributor) roles?",
        "Have you mentored or coached other team members?"
      ],
      methodology: [
        "Do you have experience working in Agile environments?",
        "Have you worked with Scrum or Kanban methodologies?",
        "Are you familiar with DevOps practices?",
        "Have you been part of a remote-first team?"
      ]
    };
    
    // NLP patterns for skill extraction
    this.skillPatterns = {
      experience: /(?:experienced? (?:with|in)|worked with|used|proficient (?:in|with)|skilled (?:in|with)|knowledge of|familiar with)\s+([A-Za-z0-9\s\.\+\-]+)/gi,
      proficiency: /(?:expert|advanced|intermediate|beginner|junior|senior)\s+(?:in|with|level)?\s*([A-Za-z0-9\s\.\+\-]+)/gi,
      tools: /(?:using|use|utilized|leveraging|implementing)\s+([A-Za-z0-9\s\.\+\-]+)\s+(?:for|to|in)/gi,
      years: /(\d+)\s*(?:\+)?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience\s+)?(?:with|in|using)?\s*([A-Za-z0-9\s\.\+\-]+)/gi,
      certifications: /(?:certified|certification|certificate)\s+(?:in|for)?\s*([A-Za-z0-9\s\.\+\-]+)/gi,
      projectBased: /(?:built|created|developed|designed|implemented|architected)\s+(?:a|an)?\s*([A-Za-z0-9\s\.\+\-]+)/gi
    };
    
    // Initialize conversation state
    this.initializeConversation();
  }
  
  // ========== CORE SKILL GRAPH MANAGEMENT ==========
  
  loadSkillGraph() {
    const saved = localStorage.getItem('skillMemoryGraph');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading skill graph:', e);
      }
    }
    
    return {
      skills: {},
      preferences: {},
      careerGoals: {},
      workStyle: {},
      metadata: {
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      }
    };
  }
  
  saveSkillGraph() {
    this.skillGraph.metadata.lastUpdated = new Date().toISOString();
    localStorage.setItem('skillMemoryGraph', JSON.stringify(this.skillGraph));
    
    // Trigger custom event for UI updates
    window.dispatchEvent(new CustomEvent('skillGraphUpdated', { 
      detail: this.skillGraph 
    }));
  }
  
  addSkill(skillName, metadata = {}) {
    const normalizedSkill = this.normalizeSkillName(skillName);
    
    if (!this.skillGraph.skills[normalizedSkill]) {
      this.skillGraph.skills[normalizedSkill] = {
        name: skillName,
        normalizedName: normalizedSkill,
        proficiency: metadata.proficiency || 'intermediate',
        yearsOfExperience: metadata.yearsOfExperience || null,
        category: this.categorizeSkill(skillName),
        confirmed: metadata.confirmed || false,
        confidence: metadata.confidence || 0.7,
        sources: metadata.sources || ['conversation'],
        addedAt: new Date().toISOString(),
        lastMentioned: new Date().toISOString(),
        relatedSkills: [],
        projects: metadata.projects || []
      };
      
      this.saveSkillGraph();
      return true;
    } else {
      // Update existing skill
      this.skillGraph.skills[normalizedSkill].lastMentioned = new Date().toISOString();
      this.skillGraph.skills[normalizedSkill].confidence = Math.min(
        1.0, 
        this.skillGraph.skills[normalizedSkill].confidence + 0.1
      );
      this.saveSkillGraph();
      return false;
    }
  }
  
  removeSkill(skillName) {
    const normalizedSkill = this.normalizeSkillName(skillName);
    if (this.skillGraph.skills[normalizedSkill]) {
      delete this.skillGraph.skills[normalizedSkill];
      this.saveSkillGraph();
      return true;
    }
    return false;
  }
  
  updateSkillProficiency(skillName, proficiency) {
    const normalizedSkill = this.normalizeSkillName(skillName);
    if (this.skillGraph.skills[normalizedSkill]) {
      this.skillGraph.skills[normalizedSkill].proficiency = proficiency;
      this.skillGraph.skills[normalizedSkill].confirmed = true;
      this.saveSkillGraph();
      return true;
    }
    return false;
  }
  
  confirmSkill(skillName) {
    const normalizedSkill = this.normalizeSkillName(skillName);
    if (this.skillGraph.skills[normalizedSkill]) {
      this.skillGraph.skills[normalizedSkill].confirmed = true;
      this.skillGraph.skills[normalizedSkill].confidence = 1.0;
      this.saveSkillGraph();
      return true;
    }
    return false;
  }
  
  getSkills(options = {}) {
    const skills = Object.values(this.skillGraph.skills);
    
    // Filter by category
    if (options.category) {
      return skills.filter(s => s.category === options.category);
    }
    
    // Filter by confirmed status
    if (options.confirmed !== undefined) {
      return skills.filter(s => s.confirmed === options.confirmed);
    }
    
    // Sort by confidence
    if (options.sortByConfidence) {
      return skills.sort((a, b) => b.confidence - a.confidence);
    }
    
    return skills;
  }
  
  getSkillsByCategory() {
    const categorized = {};
    Object.values(this.skillGraph.skills).forEach(skill => {
      if (!categorized[skill.category]) {
        categorized[skill.category] = [];
      }
      categorized[skill.category].push(skill);
    });
    return categorized;
  }
  
  // ========== NLP & SKILL EXTRACTION ==========
  
  extractSkillsFromText(text) {
    const extractedSkills = [];
    const lowercaseText = text.toLowerCase();
    
    // Pattern-based extraction
    Object.entries(this.skillPatterns).forEach(([patternName, regex]) => {
      let match;
      while ((match = regex.exec(text)) !== null) {
        const skillText = match[1] || match[2];
        if (skillText) {
          extractedSkills.push({
            skill: skillText.trim(),
            pattern: patternName,
            confidence: 0.8
          });
        }
      }
    });
    
    // Keyword matching against taxonomy
    Object.values(this.skillTaxonomy).forEach(category => {
      Object.values(category).forEach(skillList => {
        skillList.forEach(skill => {
          if (lowercaseText.includes(skill.toLowerCase())) {
            extractedSkills.push({
              skill: skill,
              pattern: 'taxonomy',
              confidence: 0.9
            });
          }
        });
      });
    });
    
    // Deduplicate and normalize
    const uniqueSkills = [];
    const seen = new Set();
    
    extractedSkills.forEach(item => {
      const normalized = this.normalizeSkillName(item.skill);
      if (!seen.has(normalized)) {
        seen.add(normalized);
        uniqueSkills.push(item);
      }
    });
    
    return uniqueSkills;
  }
  
  normalizeSkillName(skillName) {
    return skillName
      .toLowerCase()
      .trim()
      .replace(/[^\w\s\+\.\-]/g, '')
      .replace(/\s+/g, '-');
  }
  
  categorizeSkill(skillName) {
    const normalized = skillName.toLowerCase();
    
    for (const [mainCategory, subCategories] of Object.entries(this.skillTaxonomy)) {
      for (const [subCategory, skills] of Object.entries(subCategories)) {
        if (skills.some(s => normalized.includes(s.toLowerCase()) || s.toLowerCase().includes(normalized))) {
          return `${mainCategory}/${subCategory}`;
        }
      }
    }
    
    return 'other/general';
  }
  
  findRelatedSkills(skillName, limit = 3) {
    const category = this.categorizeSkill(skillName);
    const [mainCat, subCat] = category.split('/');
    
    if (this.skillTaxonomy[mainCat] && this.skillTaxonomy[mainCat][subCat]) {
      const relatedSkills = this.skillTaxonomy[mainCat][subCat]
        .filter(s => s.toLowerCase() !== skillName.toLowerCase())
        .slice(0, limit);
      return relatedSkills;
    }
    
    return [];
  }
  
  // ========== CONVERSATIONAL LEARNING ==========
  
  initializeConversation() {
    this.conversationContext = {
      currentTopic: null,
      pendingConfirmations: [],
      conversationHistory: [],
      lastInteractionTime: Date.now(),
      sessionInsights: [],
      questionsAsked: new Set(),
      skillsDiscussed: new Set()
    };
  }
  
  processUserMessage(message) {
    // Update conversation history
    this.conversationContext.conversationHistory.push({
      type: 'user',
      message: message,
      timestamp: new Date().toISOString()
    });
    
    this.conversationContext.lastInteractionTime = Date.now();
    
    // Extract skills from message
    const extractedSkills = this.extractSkillsFromText(message);
    
    // Add skills to pending confirmations
    extractedSkills.forEach(item => {
      this.conversationContext.pendingConfirmations.push({
        skill: item.skill,
        confidence: item.confidence,
        pattern: item.pattern
      });
    });
    
    // Determine response strategy
    const response = this.generateResponse(message, extractedSkills);
    
    // Update conversation history with assistant response
    this.conversationContext.conversationHistory.push({
      type: 'assistant',
      message: response.message,
      timestamp: new Date().toISOString(),
      intent: response.intent
    });
    
    return response;
  }
  
  generateResponse(userMessage, extractedSkills) {
    const lowercaseMessage = userMessage.toLowerCase();
    
    // Check if user is confirming a skill
    if (this.isConfirmation(lowercaseMessage) && this.conversationContext.pendingConfirmations.length > 0) {
      return this.handleConfirmation(true);
    }
    
    // Check if user is denying a skill
    if (this.isDenial(lowercaseMessage) && this.conversationContext.pendingConfirmations.length > 0) {
      return this.handleConfirmation(false);
    }
    
    // If skills were extracted, ask for confirmation
    if (extractedSkills.length > 0) {
      const skill = extractedSkills[0].skill;
      this.conversationContext.currentTopic = skill;
      
      return {
        intent: 'confirm_skill',
        message: this.selectTemplate('skillConfirmation', { skill }),
        followUpOptions: ['Yes', 'No', 'Tell me more'],
        extractedSkills: extractedSkills
      };
    }
    
    // If no skills extracted, ask contextual follow-ups
    return this.generateContextualFollowUp();
  }
  
  generateContextualFollowUp() {
    const confirmedSkills = this.getSkills({ confirmed: true });
    const totalSkills = this.getSkills();
    
    // If user has few skills, ask about career goals
    if (confirmedSkills.length < 3) {
      const template = this.selectRandomTemplate('careerGoals');
      return {
        intent: 'gather_goals',
        message: template,
        followUpOptions: null
      };
    }
    
    // If user has technical skills, ask about leadership
    const hasTechnicalSkills = confirmedSkills.some(s => s.category.startsWith('technical/'));
    if (hasTechnicalSkills && !this.conversationContext.questionsAsked.has('leadership')) {
      this.conversationContext.questionsAsked.add('leadership');
      const template = this.selectRandomTemplate('leadership');
      return {
        intent: 'gather_leadership',
        message: template,
        followUpOptions: null
      };
    }
    
    // Ask about work preferences
    if (!this.conversationContext.questionsAsked.has('workPreferences')) {
      this.conversationContext.questionsAsked.add('workPreferences');
      const template = this.selectRandomTemplate('workPreferences');
      return {
        intent: 'gather_preferences',
        message: template,
        followUpOptions: null
      };
    }
    
    // Ask about methodologies
    if (!this.conversationContext.questionsAsked.has('methodology')) {
      this.conversationContext.questionsAsked.add('methodology');
      const template = this.selectRandomTemplate('methodology');
      return {
        intent: 'gather_methodology',
        message: template,
        followUpOptions: null
      };
    }
    
    // Default: ask about related skills
    if (confirmedSkills.length > 0) {
      const randomSkill = confirmedSkills[Math.floor(Math.random() * confirmedSkills.length)];
      const relatedSkills = this.findRelatedSkills(randomSkill.name);
      
      if (relatedSkills.length > 0) {
        const relatedSkill = relatedSkills[0];
        const template = this.selectTemplate('relatedSkills', { 
          skill: randomSkill.name, 
          relatedSkill 
        });
        
        return {
          intent: 'explore_related',
          message: template,
          followUpOptions: ['Yes', 'No', 'Not yet']
        };
      }
    }
    
    // Fallback
    return {
      intent: 'general',
      message: "Thanks for sharing! Is there anything else about your experience you'd like to tell me?",
      followUpOptions: null
    };
  }
  
  handleConfirmation(confirmed) {
    if (this.conversationContext.pendingConfirmations.length === 0) {
      return {
        intent: 'acknowledgment',
        message: "Got it! What else would you like to share?",
        followUpOptions: null
      };
    }
    
    const pending = this.conversationContext.pendingConfirmations.shift();
    
    if (confirmed) {
      // Add skill to graph
      this.addSkill(pending.skill, {
        confirmed: true,
        confidence: 1.0,
        sources: ['conversation']
      });
      
      this.conversationContext.skillsDiscussed.add(this.normalizeSkillName(pending.skill));
      
      // Ask about proficiency
      const template = this.selectTemplate('skillDepth', { skill: pending.skill });
      
      return {
        intent: 'gather_depth',
        message: `Great! ${template}`,
        followUpOptions: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
        confirmedSkill: pending.skill
      };
    } else {
      return {
        intent: 'acknowledgment',
        message: "No problem! Let's talk about something else. What other technologies or skills do you work with?",
        followUpOptions: null
      };
    }
  }
  
  isConfirmation(message) {
    const confirmationPatterns = ['yes', 'yeah', 'yep', 'correct', 'right', 'exactly', 'sure', 'definitely', 'absolutely', 'i do', 'i have'];
    return confirmationPatterns.some(pattern => message.includes(pattern));
  }
  
  isDenial(message) {
    const denialPatterns = ['no', 'nope', 'not really', 'incorrect', 'wrong', 'nah', "don't", 'never', "haven't"];
    return denialPatterns.some(pattern => message.includes(pattern));
  }
  
  selectTemplate(category, variables = {}) {
    const templates = this.conversationTemplates[category];
    if (!templates || templates.length === 0) return '';
    
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    // Replace variables
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(`{${key}}`, value);
    });
    
    return result;
  }
  
  selectRandomTemplate(category) {
    const templates = this.conversationTemplates[category];
    if (!templates || templates.length === 0) return "Tell me more about your experience.";
    return templates[Math.floor(Math.random() * templates.length)];
  }
  
  // ========== SESSION INSIGHTS ==========
  
  generateSessionInsights() {
    const skills = this.getSkills({ confirmed: true });
    const categorized = this.getSkillsByCategory();
    
    const insights = {
      totalSkills: skills.length,
      categories: Object.keys(categorized).length,
      strongestCategory: null,
      suggestedRoles: [],
      learningRecommendations: [],
      profileCompleteness: 0
    };
    
    // Find strongest category
    let maxSkills = 0;
    Object.entries(categorized).forEach(([category, skillList]) => {
      if (skillList.length > maxSkills) {
        maxSkills = skillList.length;
        insights.strongestCategory = category;
      }
    });
    
    // Calculate profile completeness
    insights.profileCompleteness = Math.min(100, (skills.length / 15) * 100);
    
    // Suggest roles based on skills
    if (categorized['technical/programming'] && categorized['technical/programming'].length >= 2) {
      insights.suggestedRoles.push('Software Engineer', 'Full Stack Developer');
    }
    if (categorized['business/management'] && categorized['business/management'].length >= 2) {
      insights.suggestedRoles.push('Product Manager', 'Project Manager');
    }
    if (categorized['technical/dataScience'] && categorized['technical/dataScience'].length >= 2) {
      insights.suggestedRoles.push('Data Scientist', 'Machine Learning Engineer');
    }
    if (categorized['soft/leadership'] && categorized['soft/leadership'].length >= 2) {
      insights.suggestedRoles.push('Engineering Manager', 'Team Lead');
    }
    
    return insights;
  }
  
  // ========== EXPORT / IMPORT ==========
  
  exportProfile() {
    return {
      skillGraph: this.skillGraph,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
  }
  
  importProfile(profileData) {
    if (profileData.skillGraph) {
      this.skillGraph = profileData.skillGraph;
      this.saveSkillGraph();
      return true;
    }
    return false;
  }
  
  resetProfile() {
    this.skillGraph = {
      skills: {},
      preferences: {},
      careerGoals: {},
      workStyle: {},
      metadata: {
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      }
    };
    this.saveSkillGraph();
    this.initializeConversation();
  }
}

// ========== CONVERSATIONAL CHAT UI COMPONENT ==========

class ConversationalChatUI {
  constructor(skillMemoryInstance) {
    this.skillMemory = skillMemoryInstance;
    this.chatContainer = null;
    this.inputField = null;
    this.isOpen = false;
    
    this.initialize();
  }
  
  initialize() {
    this.createChatWidget();
    this.attachEventListeners();
  }
  
  createChatWidget() {
    // Create chat widget HTML
    const chatHTML = `
      <div id="conversationalChatWidget" class="chat-widget">
        <button id="chatToggleBtn" class="chat-toggle-btn">
          <span class="chat-icon">💬</span>
          <span class="chat-badge" id="chatBadge" style="display: none;">!</span>
        </button>
        
        <div id="chatWindow" class="chat-window" style="display: none;">
          <div class="chat-header">
            <div class="chat-header-info">
              <div class="chat-avatar">🤖</div>
              <div>
                <div class="chat-header-title">CareerScout Assistant</div>
                <div class="chat-header-status">Online</div>
              </div>
            </div>
            <button id="chatCloseBtn" class="chat-close-btn">✕</button>
          </div>
          
          <div id="chatMessages" class="chat-messages">
            <div class="chat-message assistant">
              <div class="message-avatar">🤖</div>
              <div class="message-content">
                <div class="message-text">
                  Hi! I'm here to learn about your skills and help you find the perfect job. 
                  Let's start - what kind of role are you looking for?
                </div>
              </div>
            </div>
          </div>
          
          <div class="chat-input-area">
            <input 
              type="text" 
              id="chatInput" 
              class="chat-input" 
              placeholder="Type your message..."
              autocomplete="off"
            />
            <button id="chatSendBtn" class="chat-send-btn">
              <span>➤</span>
            </button>
          </div>
          
          <div id="quickReplies" class="quick-replies" style="display: none;"></div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', chatHTML);
    
    this.chatContainer = document.getElementById('chatWindow');
    this.inputField = document.getElementById('chatInput');
  }
  
  attachEventListeners() {
    const toggleBtn = document.getElementById('chatToggleBtn');
    const closeBtn = document.getElementById('chatCloseBtn');
    const sendBtn = document.getElementById('chatSendBtn');
    const input = document.getElementById('chatInput');
    
    toggleBtn?.addEventListener('click', () => this.toggleChat());
    closeBtn?.addEventListener('click', () => this.closeChat());
    sendBtn?.addEventListener('click', () => this.sendMessage());
    
    input?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendMessage();
      }
    });
  }
  
  toggleChat() {
    this.isOpen = !this.isOpen;
    this.chatContainer.style.display = this.isOpen ? 'flex' : 'none';
    
    if (this.isOpen) {
      this.inputField?.focus();
      this.hideBadge();
    }
  }
  
  closeChat() {
    this.isOpen = false;
    this.chatContainer.style.display = 'none';
  }
  
  sendMessage() {
    const message = this.inputField.value.trim();
    if (!message) return;
    
    // Add user message to chat
    this.addMessage(message, 'user');
    this.inputField.value = '';
    
    // Process with skill memory
    setTimeout(() => {
      const response = this.skillMemory.processUserMessage(message);
      this.addMessage(response.message, 'assistant');
      
      // Show quick reply options
      if (response.followUpOptions) {
        this.showQuickReplies(response.followUpOptions);
      } else {
        this.hideQuickReplies();
      }
      
      // If skill was confirmed, show notification
      if (response.confirmedSkill) {
        this.showSkillConfirmedNotification(response.confirmedSkill);
      }
    }, 500);
  }
  
  addMessage(text, sender) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageHTML = `
      <div class="chat-message ${sender}">
        ${sender === 'assistant' ? '<div class="message-avatar">🤖</div>' : ''}
        <div class="message-content">
          <div class="message-text">${text}</div>
          <div class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>
    `;
    
    messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  showQuickReplies(options) {
    const quickRepliesContainer = document.getElementById('quickReplies');
    quickRepliesContainer.innerHTML = options.map(option => 
      `<button class="quick-reply-btn" data-reply="${option}">${option}</button>`
    ).join('');
    
    quickRepliesContainer.style.display = 'flex';
    
    // Attach click handlers
    quickRepliesContainer.querySelectorAll('.quick-reply-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.inputField.value = btn.dataset.reply;
        this.sendMessage();
      });
    });
  }
  
  hideQuickReplies() {
    const quickRepliesContainer = document.getElementById('quickReplies');
    quickRepliesContainer.style.display = 'none';
  }
  
  showBadge() {
    document.getElementById('chatBadge').style.display = 'block';
  }
  
  hideBadge() {
    document.getElementById('chatBadge').style.display = 'none';
  }
  
  showSkillConfirmedNotification(skill) {
    // Show toast notification
    if (typeof showToast === 'function') {
      showToast(`✓ Added skill: ${skill}`, 'success');
    }
    
    // Trigger skill graph update event
    window.dispatchEvent(new CustomEvent('skillConfirmed', { 
      detail: { skill } 
    }));
  }
}

// ========== EXPORT ==========
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AdaptiveSkillMemory, ConversationalChatUI };
}
