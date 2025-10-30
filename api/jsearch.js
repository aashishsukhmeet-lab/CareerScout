// api/jsearch.js
// Vercel Serverless Function to proxy JSearch API requests
// This protects your RapidAPI key from being exposed in client code

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*'); // Change to your domain in production
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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
      error: 'Missing required parameter: query' 
    });
  }
  
  // Build API request
  const API_HOST = "jsearch.p.rapidapi.com";
  const API_URL = `https://${API_HOST}/search`;
  
  const params = new URLSearchParams({
    query: query,
    page: String(page),
    num_pages: "1",
    date_posted: "all",
  });
  
  if (location && remote_jobs_only !== "true") {
    params.set("location", location);
    if (radius) {
      params.set("radius", String(radius));
    }
  }
  
  params.set("remote_jobs_only", remote_jobs_only === "true" ? "true" : "false");
  
  const url = `${API_URL}?${params.toString()}`;
  
  console.log(`[JSearch Proxy] Request: ${url.substring(0, 100)}...`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        "X-RapidAPI-Key": API_KEY,
        "X-RapidAPI-Host": API_HOST,
      },
    });
    
    // Handle rate limiting
    if (response.status === 429) {
      console.warn('[JSearch Proxy] Rate limited by RapidAPI');
      return res.status(429).json({ 
        error: 'Rate limited by RapidAPI. Please try again in a few minutes.',
        status: 429
      });
    }
    
    // Handle other errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[JSearch Proxy] API Error ${response.status}:`, errorText);
      return res.status(response.status).json({
        error: `JSearch API error: ${response.statusText}`,
        status: response.status,
        details: errorText
      });
    }
    
    // Parse and return data
    const data = await response.json();
    console.log(`[JSearch Proxy] Success: ${data.data?.length || 0} jobs found`);
    
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('[JSearch Proxy] Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
