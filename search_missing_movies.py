import requests
import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
}

queries = ["obsession", "odyssey", "am anh", "hanh trinh"]

print("Searching missing movie titles across PhimAPI & OPhim...")

for q in queries:
    url = f"https://phimapi.com/v1/api/tim-kiem?keyword={q}&limit=20"
    try:
        r = requests.get(url, headers=headers, timeout=5)
        if r.status_code == 200:
            data = r.json().get("data", {})
            items = data.get("items", [])
            print(f"\nQuery '{q}' returned {len(items)} items:")
            for item in items[:5]:
                print(f"  - [{item.get('year')}] {item.get('name')} ({item.get('origin_name')}) | type: {item.get('type')} | slug: {item.get('slug')}")
    except Exception as e:
        print(f"Error query {q}: {e}")
