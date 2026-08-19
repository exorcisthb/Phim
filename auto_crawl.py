import sys
import io
import os
import re
import json
from datetime import datetime, timezone, timedelta
import requests
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://motchillu.app/'
}

YEARS = ['2026', '2025', '2024', '2023', '2022']
CATEGORIES = [
    ('1', 'Hành Động'),
    ('13', 'Kinh Dị')
]

MOVIES_FILE = "movies.json"
STATUS_FILE = "daily_status.md"
LOG_FILE = "crawl_log.json"

def load_existing_movies():
    if os.path.exists(MOVIES_FILE):
        try:
            with open(MOVIES_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠️ Không thể đọc {MOVIES_FILE}: {e}")
    return []

def crawl_motchill_list():
    print("==================================================")
    print(" 🤖 AUTO-CRAWLER: MOTCHILLU.APP")
    print("    Điều kiện: Phim Lẻ | Hành Động & Kinh Dị | 2022-2026")
    print("==================================================")
    
    scraped_movies = []
    seen_slugs = set()
    
    for cat_id, cat_name in CATEGORIES:
        for year in YEARS:
            url = f"https://motchillu.app/search?type=1&category={cat_id}&year={year}"
            try:
                r = requests.get(url, headers=HEADERS, timeout=10)
                if r.status_code == 200:
                    soup = BeautifulSoup(r.text, 'html.parser')
                    anchors = soup.find_all('a', href=True)
                    movie_anchors = [a for a in anchors if '/phim/' in a['href']]
                    
                    for a in movie_anchors:
                        href = a['href']
                        slug = href.split('/phim/')[-1].strip('/')
                        if slug and slug not in seen_slugs:
                            seen_slugs.add(slug)
                            title = a.get('title') or a.text.strip() or slug
                            full_url = "https://motchillu.app" + href if href.startswith('/') else href
                            
                            img = a.find('img', src=True)
                            poster = img['src'] if img else ""
                            if poster.startswith('/'):
                                poster = "https://motchillu.app" + poster
                                
                            scraped_movies.append({
                                "title": title,
                                "genre": cat_name,
                                "year": int(year),
                                "slug": slug,
                                "detail_url": full_url,
                                "poster": poster
                            })
            except Exception as e:
                print(f"❌ Lỗi quét {url}: {e}")
                
    return scraped_movies

def extract_movie_details(movie, new_id):
    url = movie["detail_url"]
    try:
        r = requests.get(url, headers=HEADERS, timeout=8)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'html.parser')
            
            h1 = soup.find('h1')
            if h1 and h1.text.strip():
                movie["title"] = h1.text.strip()
                
            imgs = soup.find_all('img', src=True)
            for img in imgs:
                src = img['src']
                if not any(k in src.lower() for k in ['logo', 'motchill', 'icon', 'banner', 'net88', 'win79']):
                    full_img = "https://motchillu.app" + src if src.startswith('/') else src
                    movie["poster"] = full_img
                    movie["backdrop"] = full_img
                    break
                    
            desc_el = soup.find('div', class_=re.compile(r'desc|content|synopsis|summary|overview', re.I))
            desc = desc_el.text.strip() if desc_el else f"Phim lẻ {movie['genre']} phát hành năm {movie['year']} trên Motchill."
            
            scripts = soup.find_all('script')
            full_payload = "\n".join([s.string for s in scripts if s.string])
            
            m3u8s = re.findall(r'https?://[^\s"\']+\.m3u8[^\s"\']*', full_payload)
            clean_m3u8 = None
            for m in m3u8s:
                clean_url = m.replace('\\', '').split('?')[0] if 'player.phimapi.com' not in m else m.replace('\\', '')
                if 'player.phimapi.com' in clean_url and 'url=' in clean_url:
                    clean_url = clean_url.split('url=')[-1]
                if clean_url.endswith('.m3u8') or 'm3u8' in clean_url:
                    clean_m3u8 = clean_url
                    break
                    
            return {
                "id": new_id,
                "title": movie["title"],
                "origin_title": movie["slug"].replace('-', ' ').title(),
                "year": movie["year"],
                "genre": movie["genre"],
                "quality": "1080p FHD",
                "duration": f"{90 + (abs(hash(movie['slug'])) % 35)} phút",
                "rating": round(4.2 + (abs(hash(movie['slug'])) % 8) * 0.1, 1),
                "poster": movie.get("poster") or "https://motchillu.app/motchill.png",
                "backdrop": movie.get("backdrop") or movie.get("poster") or "https://motchillu.app/motchill.png",
                "description": desc,
                "m3u8_url": clean_m3u8 or f"https://phimapi.com/phim/{movie['slug']}",
                "local_mp4": f"Phim_Le_MP4/{movie['slug']}.mp4"
            }
    except Exception as e:
        pass
        
    return {
        "id": new_id,
        "title": movie["title"],
        "origin_title": movie["slug"].replace('-', ' ').title(),
        "year": movie["year"],
        "genre": movie["genre"],
        "quality": "1080p FHD",
        "duration": "100 phút",
        "rating": 4.5,
        "poster": movie.get("poster") or "https://motchillu.app/motchill.png",
        "backdrop": movie.get("poster") or "https://motchillu.app/motchill.png",
        "description": f"Phim lẻ {movie['genre']} phát hành năm {movie['year']}.",
        "m3u8_url": f"https://phimapi.com/phim/{movie['slug']}",
        "local_mp4": f"Phim_Le_MP4/{movie['slug']}.mp4"
    }

def main():
    # Current time ICT (+7)
    ict_tz = timezone(timedelta(hours=7))
    now_str = datetime.now(ict_tz).strftime("%d/%m/%Y %H:%M:%S")

    existing_movies = load_existing_movies()
    existing_slugs = {m.get("local_mp4", "").split("/")[-1].replace(".mp4", "") for m in existing_movies}
    existing_titles = {m.get("title") for m in existing_movies}

    print(f"📊 Cơ sở dữ liệu hiện tại có: {len(existing_movies)} phim.")

    scraped_list = crawl_motchill_list()
    
    # Identify NEW movies
    new_candidates = [m for m in scraped_list if m["slug"] not in existing_slugs and m["title"] not in existing_titles]
    
    print(f"🆕 Tìm thấy {len(new_candidates)} PHIM MỚI CHƯA CÓ TRONG HỆ THỐNG.")
    
    added_movies = []
    if new_candidates:
        max_id = max([m.get("id", 0) for m in existing_movies], default=0)
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = {executor.submit(extract_movie_details, m, max_id + i + 1): i for i, m in enumerate(new_candidates)}
            for future in as_completed(futures):
                res = future.result()
                added_movies.append(res)

        # Merge new movies into existing database (Newest first)
        updated_database = added_movies + existing_movies
        
        with open(MOVIES_FILE, 'w', encoding='utf-8') as f:
            json.dump(updated_database, f, ensure_ascii=False, indent=2)
            
        print(f"✅ Đã cập nhật {len(added_movies)} phim mới vào {MOVIES_FILE}!")
    else:
        print("ℹ️ Hôm nay không có phim mới nào xuất hiện.")

    # Create daily status report markdown
    status_md = f"""# 📢 BÁO CÁO CÀO PHIM TỰ ĐỘNG (DAILY CRAWL REPORT)

- 🕒 **Thời gian cập nhật**: `{now_str} (Giờ Việt Nam)`
- 🎬 **Tổng số phim trong hệ thống**: **{len(existing_movies) + len(added_movies)} phim**
- 🆕 **Phim mới phát hiện hôm nay**: **{len(added_movies)} phim mới**

---

### 📋 Danh sách phim mới cào được hôm nay:
"""

    if added_movies:
        for idx, m in enumerate(added_movies, 1):
            status_md += f"{idx}. **{m['title']}** ({m['year']}) - Thể loại: *{m['genre']}* | Quality: 1080p FHD\n"
    else:
        status_md += "> 🟢 **Hôm nay không có phim lẻ mới nào (Hành động & Kinh dị 2022-2026).**\n"

    status_md += "\n---\n*Hệ thống được tự động hóa 100% bằng GitHub Actions.*"

    with open(STATUS_FILE, 'w', encoding='utf-8') as f:
        f.write(status_md)

    # Append to JSON Log History
    logs = []
    if os.path.exists(LOG_FILE):
        try:
            with open(LOG_FILE, 'r', encoding='utf-8') as f:
                logs = json.load(f)
        except Exception:
            logs = []

    logs.insert(0, {
        "timestamp": now_str,
        "total_movies": len(existing_movies) + len(added_movies),
        "new_movies_count": len(added_movies),
        "new_movie_titles": [m["title"] for m in added_movies]
    })

    with open(LOG_FILE, 'w', encoding='utf-8') as f:
        json.dump(logs[:50], f, ensure_ascii=False, indent=2)

    print("==================================================")
    print(f"🎉 BÁO CÁO HOÀN TẤT TẠI '{STATUS_FILE}' & '{LOG_FILE}'")
    print("==================================================")

if __name__ == "__main__":
    main()
