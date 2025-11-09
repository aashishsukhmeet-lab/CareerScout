// ============================================
// Resume Parser Module
// ============================================
// Extracts text from PDF/DOCX files using PDF.js

// PDF.js will be loaded from CDN in index.html
// Global: window.pdfjsLib

/**
 * Parse uploaded file and extract text
 * @param {File} file - File object from input
 * @returns {Promise<string>} Extracted text
 */
export async function parseResumeFile(file) {
  if (!file) {
    throw new Error('No file provided');
  }
  
  const fileType = file.type;
  const fileName = file.name.toLowerCase();
  
  console.log(`📄 Parsing file: ${file.name} (${fileType})`);
  
  // Handle PDF files
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return await parsePDF(file);
  }
  
  // Handle text files
  if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
    return await parseTextFile(file);
  }
  
  // Handle DOCX (limited support - extract as text)
  if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
    // DOCX parsing is complex, suggest text paste fallback
    throw new Error('DOCX files are not fully supported. Please copy and paste your resume text instead.');
  }
  
  throw new Error('Unsupported file format. Please upload a PDF or TXT file, or paste your resume text.');
}

/**
 * Parse PDF file using PDF.js
 * @param {File} file - PDF file
 * @returns {Promise<string>} Extracted text
 */
async function parsePDF(file) {
  if (!window.pdfjsLib) {
    throw new Error('PDF.js library not loaded. Please refresh the page.');
  }
  
  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF document
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    console.log(`📖 PDF loaded: ${pdf.numPages} pages`);
    
    // Extract text from all pages
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Concatenate text items
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
    }
    
    // Clean up text
    fullText = cleanText(fullText);
    
    if (!fullText || fullText.length < 50) {
      throw new Error('Could not extract sufficient text from PDF. Please try copying and pasting your resume text instead.');
    }
    
    console.log(`✅ Extracted ${fullText.length} characters from PDF`);
    return fullText;
    
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}

/**
 * Parse plain text file
 * @param {File} file - Text file
 * @returns {Promise<string>} File contents
 */
async function parseTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = cleanText(e.target.result);
      
      if (!text || text.length < 50) {
        reject(new Error('Text file appears to be empty or too short'));
      } else {
        console.log(`✅ Loaded ${text.length} characters from text file`);
        resolve(text);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read text file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Clean and normalize text
 * @param {string} text - Raw text
 * @returns {string} Cleaned text
 */
function cleanText(text) {
  if (!text) return '';
  
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove special characters but keep punctuation
    .replace(/[^\w\s.,;:()@\-]/g, '')
    // Trim
    .trim();
}

/**
 * Validate resume text before AI analysis
 * @param {string} text - Resume text
 * @returns {Object} Validation result
 */
export function validateResumeText(text) {
  if (!text || typeof text !== 'string') {
    return {
      valid: false,
      error: 'No text provided'
    };
  }
  
  const trimmed = text.trim();
  
  if (trimmed.length < 100) {
    return {
      valid: false,
      error: 'Resume text is too short (minimum 100 characters)'
    };
  }
  
  if (trimmed.length > 50000) {
    return {
      valid: false,
      error: 'Resume text is too long (maximum 50,000 characters)'
    };
  }
  
  // Check for minimum word count
  const words = trimmed.split(/\s+/).length;
  if (words < 20) {
    return {
      valid: false,
      error: 'Resume must contain at least 20 words'
    };
  }
  
  return {
    valid: true,
    wordCount: words,
    charCount: trimmed.length
  };
}

/**
 * Check if PDF.js is loaded and ready
 * @returns {boolean} True if PDF.js is available
 */
export function isPDFJSLoaded() {
  return !!(window.pdfjsLib && window.pdfjsLib.getDocument);
}
