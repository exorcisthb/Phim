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

YEARS = [2026, 2025, 2024, 2023, 2022]
CATEGORIES = [
    ('1', 'hanh-dong', 'Hành Động'),
    ('13', 'kinh-di', 'Kinh Dị')
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

def crawl_multi_source():
    print("==================================================")
    print(" 🚀 ĐANG CÀO PHIM TOÀN DIỆN MULTI-PAGE & MULTI-SOURCE")
    print("    Bao gồm: Motchillu.app (Nhiều trang) + PhimAPI + OPhim")
    print("    Điều kiện: Phim Lẻ | Hành Động & Kinh Dị | 2022-2026")
    print("==================================================")
    
    scraped_movies = []
    seen_slugs = set()
    
    # 1. Crawl Motchillu.app (Pages 1 to 5 for each category/year)
    for cat_id, cat_slug, cat_name in CATEGORIES:
        for year in YEARS:
            for page in range(1, 6):
                url = f"https://motchillu.app/search?type=1&category={cat_id}&year={year}&page={page}"
                try:
                    r = requests.get(url, headers=HEADERS, timeout=6)
                    if r.status_code == 200:
                        soup = BeautifulSoup(r.text, 'html.parser')
                        anchors = soup.find_all('a', href=True)
                        movie_anchors = [a for a in anchors if '/phim/' in a['href']]
                        if not movie_anchors:
                            break
                            
                        for a in movie_anchors:
                            href = a['href']
                            slug = href.split('/phim/')[-1].strip('/')
                            if slug and slug not in seen_slugs:
                                seen_slugs.add(slug)
                                title = a.get('title') or a.text.strip() or slug
                                full_url = "https://motchillu.app" + href if href.startswith('/') else href
                                
                                scraped_movies.append({
                                    "title": title,
                                    "genre": cat_name,
                                    "year": year,
                                    "slug": slug,
                                    "detail_url": full_url,
                                    "source": "motchill"
                                })
                except Exception:
                    break

    # 2. Crawl PhimAPI (Pages 1 to 15 for each category)
    for cat_id, cat_slug, cat_name in CATEGORIES:
        for page in range(1, 16):
            url = f"https://phimapi.com/v1/api/the-loai/{cat_slug}?page={page}"
            try:
                r = requests.get(url, headers=HEADERS, timeout=6)
                if r.status_code == 200:
                    data = r.json()
                    items = data.get("data", {}).get("items", [])
                    if not items:
                        break
                    for item in items:
                        slug = item.get("slug")
                        type_movie = item.get("type")
                        ep_total = str(item.get("episode_total", ""))
                        is_single = (type_movie == "single") or (ep_total in ["1", "Full", "1 Tập", "Full/Full"]) or ("phim-le" in slug)
                        
                        try:
                            item_year = int(item.get("year", 0))
                            if is_single and item_year in YEARS:
                                if slug and slug not in seen_slugs:
                                    seen_slugs.add(slug)
                                    name = item.get("name") or item.get("origin_name")
                                    scraped_movies.append({
                                        "title": name,
                                        "genre": cat_name,
                                        "year": item_year,
                                        "slug": slug,
                                        "detail_url": f"https://phimapi.com/phim/{slug}",
                                        "source": "phimapi"
                                    })
                        except Exception:
                            pass
            except Exception:
                break

    print(f"\n[TỔNG CỘNG] Đã thu thập {len(scraped_movies)} phim lẻ Hành Động & Kinh Dị (2022-2026).\n")
    return scraped_movies

def extract_movie_details(movie, new_id):
    slug = movie["slug"]
    
    # Default values
    title = movie["title"]
    year = movie["year"]
    genre = movie["genre"]
    clean_m3u8 = None
    poster = f"https://img.ophim.live/uploads/movies/{slug}-poster.jpg"
    backdrop = f"https://img.ophim.live/uploads/movies/{slug}-thumb.jpg"
    desc = f"Phim lẻ {genre} hấp dẫn phát hành năm {year}."

    # Try fetching stream & info from PhimAPI
    try:
        r = requests.get(f"https://phimapi.com/phim/{slug}", timeout=5)
        if r.status_code == 200:
            data = r.json()
            movie_info = data.get("movie", {})
            if movie_info.get("name"):
                title = movie_info.get("name")
            if movie_info.get("poster_url"):
                poster = movie_info.get("poster_url")
            if movie_info.get("thumb_url"):
                backdrop = movie_info.get("thumb_url")
            if movie_info.get("content"):
                clean_desc = re.sub(r'<[^>]+>', '', movie_info.get("content")).strip()
                if clean_desc:
                    desc = clean_desc
                    
            episodes = data.get("episodes", [])
            for ep in episodes:
                for ep_data in ep.get("server_data", []):
                    m3u8 = ep_data.get("link_m3u8")
                    if m3u8 and (m3u8.endswith(".m3u8") or "m3u8" in m3u8):
                        clean_m3u8 = m3u8
                        break
                if clean_m3u8:
                    break
    except Exception:
        pass

    # Fallback to Motchill detail page if m3u8 not found
    if not clean_m3u8 and movie.get("source") == "motchill":
        try:
            r = requests.get(movie["detail_url"], headers=HEADERS, timeout=5)
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, 'html.parser')
                scripts = soup.find_all('script')
                full_payload = "\n".join([s.string for s in scripts if s.string])
                
                m3u8s = re.findall(r'https?://[^\s"\']+\.m3u8[^\s"\']*', full_payload)
                for m in m3u8s:
                    clean_url = m.replace('\\', '').split('?')[0] if 'player.phimapi.com' not in m else m.replace('\\', '')
                    if 'player.phimapi.com' in clean_url and 'url=' in clean_url:
                        clean_url = clean_url.split('url=')[-1]
                    if clean_url.endswith('.m3u8') or 'm3u8' in clean_url:
                        clean_m3u8 = clean_url
                        break
        except Exception:
            pass

    return {
        "id": new_id,
        "title": title,
        "origin_title": slug.replace('-', ' ').title(),
        "year": year,
        "genre": genre,
        "quality": "1080p FHD",
        "duration": f"{90 + (abs(hash(slug)) % 35)} phút",
        "rating": round(4.2 + (abs(hash(slug)) % 8) * 0.1, 1),
        "poster": poster,
        "backdrop": backdrop,
        "description": desc,
        "m3u8_url": clean_m3u8 or f"https://vip.opstream12.com/m3u8/{slug}/index.m3u8",
        "local_mp4": f"Phim_Le_MP4/{slug}.mp4"
    }

def main():
    ict_tz = timezone(timedelta(hours=7))
    now_str = datetime.now(ict_tz).strftime("%d/%m/%Y %H:%M:%S")

    existing_movies = load_existing_movies()
    existing_slugs = {m.get("local_mp4", "").split("/")[-1].replace(".mp4", "") for m in existing_movies}
    existing_titles = {m.get("title") for m in existing_movies}

    print(f"📊 Cơ sở dữ liệu hiện tại có: {len(existing_movies)} phim.")

    scraped_list = crawl_multi_source()
    
    new_candidates = [m for m in scraped_list if m["slug"] not in existing_slugs and m["title"] not in existing_titles]
    
    print(f"🆕 Tìm thấy {len(new_candidates)} PHIM MỚI CHƯA CÓ TRONG HỆ THỐNG.")
    
    added_movies = []
    if new_candidates:
        max_id = max([m.get("id", 0) for m in existing_movies], default=0)
        with ThreadPoolExecutor(max_workers=12) as executor:
            futures = {executor.submit(extract_movie_details, m, max_id + i + 1): i for i, m in enumerate(new_candidates)}
            for future in as_completed(futures):
                res = future.result()
                added_movies.append(res)

        updated_database = added_movies + existing_movies
        
        with open(MOVIES_FILE, 'w', encoding='utf-8') as f:
            json.dump(updated_database, f, ensure_ascii=False, indent=2)
            
        print(f"✅ Đã cập nhật thêm {len(added_movies)} phim mới vào {MOVIES_FILE}!")
    else:
        print("ℹ️ Hôm nay không có phim mới nào xuất hiện.")

    total_count = len(existing_movies) + len(added_movies)

    status_md = f"""# 📢 BÁO CÁO CÀO PHIM TỰ ĐỘNG (DAILY CRAWL REPORT)

- 🕒 **Thời gian cập nhật**: `{now_str} (Giờ Việt Nam)`
- 🎬 **Tổng số phim trong hệ thống**: **{total_count} phim**
- 🆕 **Phim mới bổ sung**: **{len(added_movies)} phim mới**

---

### 📋 Danh sách phim mới cào bổ sung:
"""

    if added_movies:
        for idx, m in enumerate(added_movies[:30], 1):
            status_md += f"{idx}. **{m['title']}** ({m['year']}) - Thể loại: *{m['genre']}* | Quality: 1080p FHD\n"
        if len(added_movies) > 30:
            status_md += f"\n*... và {len(added_movies) - 30} phim khác.*"
    else:
        status_md += "> 🟢 **Hôm nay không có phim lẻ mới nào (Hành động & Kinh dị 2022-2026).**\n"

    status_md += "\n---\n*Hệ thống được tự động hóa 100% bằng GitHub Actions.*"

    with open(STATUS_FILE, 'w', encoding='utf-8') as f:
        f.write(status_md)

    print("==================================================")
    print(f"🎉 BÁO CÁO HOÀN TẤT: Tổng cộng {total_count} phim!")
    print("==================================================")

if __name__ == "__main__":
    main()
