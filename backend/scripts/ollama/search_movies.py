import sys
import json
import urllib.request
import urllib.parse
import re

# Maps genre names to Wikipedia "List of..." article titles
GENRE_LIST_PAGES = {
    'Horror':    'List of horror films of the 2010s',
    'Romance':   'List of romantic drama films',
    'Comedy':    'List of American comedy films of the 2010s',
    'Sci-Fi':    'List of science fiction films of the 2010s',
    'Action':    'List of action films of the 2010s',
    'Drama':     'List of drama films of the 2010s',
    'Thriller':  'List of thriller films',
    'Adventure': 'List of adventure films of the 2010s',
}

def get_movie_titles(query, limit=10):
    """
    Uses Wikipedia's free search API to find real film titles matching the query.
    Returns clean movie title strings (strips year suffixes like '(2015 film)').
    API docs: https://www.mediawiki.org/wiki/API:Search
    """
    encoded = urllib.parse.quote(query + ' film')
    url = (
        'https://en.wikipedia.org/w/api.php'
        f'?action=query&list=search&srsearch={encoded}'
        f'&srlimit={limit}&srnamespace=0&format=json'
    )
    headers = {'User-Agent': 'CineMatch/1.0 (movie recommendation research)'}
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
        results = data.get('query', {}).get('search', [])
        titles = []
        seen = set()
        for r in results:
            title = r.get('title', '')
            # Strip disambiguation suffixes: "Alien (1979 film)" -> "Alien"
            clean = re.sub(r'\s*\(\d{4}\s+film\)$', '', title).strip()
            clean = re.sub(r'\s*\(film\)$', '', clean).strip()
            # Skip list articles, years, or very short titles
            if clean.lower().startswith('list of') or len(clean) < 2:
                continue
            key = clean.lower()
            if key in seen:
                continue
            seen.add(key)
            titles.append(clean)
        return titles
    except Exception:
        return []

if __name__ == '__main__':
    if len(sys.argv) > 1:
        query = ' '.join(sys.argv[1:])
        results = get_movie_titles(query)
        print(json.dumps(results))
    else:
        print(json.dumps([]))
