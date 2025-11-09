from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os

app = Flask(__name__)

# Allow requests from your GitHub Pages site
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Your friend's RapidAPI key (we'll move this to environment variable later)
RAPIDAPI_KEY = os.environ.get('RAPIDAPI_KEY', '07a7dbe8f3msh3e7142e5f6f14cfp18e3cfjsn3b5e328da4fb')

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "message": "CareerScout Job Search API",
        "endpoints": {
            "/api/jsearch": "Search for jobs"
        }
    })

@app.route('/api/jsearch', methods=['GET', 'OPTIONS'])
def search_jobs():
    # Handle preflight request
    if request.method == 'OPTIONS':
        return '', 200
    
    # Get parameters from request
    query = request.args.get('query', '')
    location = request.args.get('location', '')
    page = request.args.get('page', '1')
    radius = request.args.get('radius', '25')
    remote_jobs_only = request.args.get('remote_jobs_only', 'false')
    
    # Validate required parameters
    if not query:
        return jsonify({"error": "Missing required parameter: query"}), 400
    
    # Build API request (using your friend's working code)
    url = "https://jsearch.p.rapidapi.com/search"
    params = {
        "query": query,
        "page": page,
        "num_pages": "1",
        "date_posted": "all",
    }
    
    # Add location parameters if not remote only
    if location and remote_jobs_only != "true":
        params["location"] = location
        params["radius"] = radius
    
    params["remote_jobs_only"] = "true" if remote_jobs_only == "true" else "false"
    
    headers = {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": "jsearch.p.rapidapi.com"
    }
    
    print(f"[API] Searching: {query} in {location or 'any location'}")
    
    try:
        # Make the API call
        response = requests.get(url, headers=headers, params=params, timeout=10)
        
        # Handle rate limiting
        if response.status_code == 429:
            print("[API] Rate limited!")
            return jsonify({
                "error": "Rate limited by RapidAPI. Please try again in a few minutes.",
                "status": 429
            }), 429
        
        # Handle other errors
        if response.status_code != 200:
            print(f"[API] Error {response.status_code}: {response.text}")
            return jsonify({
                "error": f"API error: {response.status_code}",
                "details": response.text
            }), response.status_code
        
        # Return successful response
        data = response.json()
        print(f"[API] Success! Found {len(data.get('data', []))} jobs")
        return jsonify(data), 200
    
    except requests.Timeout:
        print("[API] Request timeout")
        return jsonify({"error": "Request timeout. Please try again."}), 504
    
    except Exception as e:
        print(f"[API] Unexpected error: {str(e)}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e)
        }), 500

# Health check endpoint
@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
