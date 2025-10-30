export default async function handler(req, res) {
  // CORS headers - MUST be first
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Get API key from environment
  const API_KEY = process.env.RAPIDAPI_KEY;
  if (!API_KEY) {
    console.error('Missing RAPIDAPI_KEY environment variable');
    return res.status(500).json({ 
      error: 'Server configuration error: Missing API key',
      hint: 'Set RAPIDAPI_KEY in Vercel project settings'
    });
  }
  
  // Extract query parameters
  const { 
    query, 
    location, 
    page = "1", 
    radius = "25", 
    remote_jobs_only = "false" 
  } = req.query;
  
  // Validate required params
  if (!query) {
    return res.status(400).json({ 
      error:
