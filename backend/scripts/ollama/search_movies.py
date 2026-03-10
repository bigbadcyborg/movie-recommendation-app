import sys
import json
import urllib.request
import urllib.parse
import re

def search_movie(query):
    """
    Simulates a search for a movie using a public API or duckduckgo scrape.
    For this implementation, we use a simple search query to a public movie DB or search engine.
    """
    encoded_query = urllib.parse.quote(query)
    # Using a search endpoint (e.g., DuckDuckGo or a movie-specific API)
    url = f"https://duckduckgo.com/html/?q={encoded_query}+movie+details+site:imdb.com"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            html = response.read().decode('utf-8')
            
            # Simple regex to find titles and links from the search result
            links = re.findall(r'href="(https://www.imdb.com/title/tt\d+/)"', html)
            return links[:3] # Return top 3 imdb links
    except Exception as e:
        return [f"Error searching: {str(e)}"]

if __name__ == "__main__":
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
        results = search_movie(query)
        print(json.dumps(results))
    else:
        print(json.dumps([]))
