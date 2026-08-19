import json
import os

with open("movies.json", 'r', encoding='utf-8') as f:
    movies = json.load(f)

for m in movies:
    # If poster relies on motchillu.app domain, convert to fallback or public img CDN
    if "motchillu.app" in m.get("poster", ""):
        slug = m.get("local_mp4", "").split("/")[-1].replace(".mp4", "")
        m["poster"] = f"https://img.ophim.live/uploads/movies/{slug}-poster.jpg"
        m["backdrop"] = f"https://img.ophim.live/uploads/movies/{slug}-thumb.jpg"

with open("movies.json", 'w', encoding='utf-8') as f:
    json.dump(movies, f, ensure_ascii=False, indent=2)

print(f"Fixed {len(movies)} poster URLs to public CDN img.ophim.live!")
