import os
import sys
import io
import re
import json
import requests
import subprocess
import unicodedata

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# ================== CẤU HÌNH ==================
OUTPUT_DIR = r"E:\Phim\Phim_Le_MP4"
MIN_YEAR = 2022
MAX_YEAR = 2026
GENRES = ["hanh-dong", "kinh-di"]  # Hành động & Kinh dị
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://rophimss.fm/"
}
# =============================================

def clean_filename(name, year=None):
    """Chuyển tên phim tiếng Việt thành tên file ASCII chuẩn đẹp trên Windows."""
    nfkd_form = unicodedata.normalize('NFKD', name)
    only_ascii = "".join([c for c in nfkd_form if not unicodedata.combining(c)])
    only_ascii = only_ascii.replace('Đ', 'D').replace('đ', 'd')
    clean = re.sub(r'[^a-zA-Z0-9\s_-]', '', only_ascii)
    clean = re.sub(r'\s+', '_', clean).strip('_')
    if year:
        clean = f"{clean}_{year}"
    return clean or "Phim_Le"

def get_action_horror_single_movies(max_pages_per_genre=6):
    """Lấy danh sách phim lẻ thể loại Hành động & Kinh dị phát hành 2022-2026."""
    movies = []
    seen_slugs = set()
    
    print(f"[DANH SÁCH] Đang lọc phim lẻ [Hành động & Kinh dị] từ năm {MIN_YEAR} đến {MAX_YEAR}...")
    
    for genre in GENRES:
        genre_name = "Hành động" if genre == "hanh-dong" else "Kinh dị"
        for page in range(1, max_pages_per_genre + 1):
            try:
                url = f"https://phimapi.com/v1/api/the-loai/{genre}?page={page}"
                res = requests.get(url, headers=HEADERS, timeout=10)
                if res.status_code == 200:
                    data = res.json()
                    items = data.get("data", {}).get("items", [])
                    if not items:
                        break
                        
                    for item in items:
                        type_movie = item.get("type")
                        episode_total = str(item.get("episode_total", ""))
                        slug = item.get("slug")
                        year = item.get("year")
                        name = item.get("name") or item.get("origin_name")
                        
                        # Chỉ lấy phim lẻ (single episode)
                        is_single = (type_movie == "single") or (episode_total in ["1", "Full", "1 Tập", "Full/Full"]) or ("phim-le" in slug)
                        
                        try:
                            year_num = int(year)
                            if is_single and MIN_YEAR <= year_num <= MAX_YEAR:
                                if slug and slug not in seen_slugs:
                                    seen_slugs.add(slug)
                                    movies.append({
                                        "title": name,
                                        "genre": genre_name,
                                        "year": year_num,
                                        "slug": slug
                                    })
                        except (ValueError, TypeError):
                            pass
            except Exception as e:
                print(f"[CẢNH BÁO] Lỗi lấy thể loại {genre} trang {page}: {e}")
                
    print(f"[TỔNG CỘNG] Tìm thấy {len(movies)} phim lẻ Hành động & Kinh dị ({MIN_YEAR}-{MAX_YEAR}).\n")
    return movies

def get_m3u8_stream(slug):
    """Lấy link m3u8 stream chuẩn từ PhimAPI hoặc OPhim1."""
    try:
        r = requests.get(f"https://phimapi.com/phim/{slug}", timeout=5)
        if r.status_code == 200:
            data = r.json()
            episodes = data.get("episodes", [])
            for ep in episodes:
                for ep_data in ep.get("server_data", []):
                    m3u8 = ep_data.get("link_m3u8")
                    if m3u8 and m3u8.endswith(".m3u8"):
                        return m3u8
    except Exception:
        pass
        
    try:
        r = requests.get(f"https://ophim1.com/phim/{slug}", timeout=5)
        if r.status_code == 200:
            data = r.json()
            episodes = data.get("episodes", [])
            for ep in episodes:
                for ep_data in ep.get("server_data", []):
                    m3u8 = ep_data.get("link_m3u8")
                    if m3u8 and m3u8.endswith(".m3u8"):
                        return m3u8
    except Exception:
        pass
        
    return None

def download_movie_mp4(title, genre, year, slug, m3u8_url):
    """Tải phim về file MP4 bằng yt-dlp 16 luồng song song vào thư mục E:\\Phim\\Phim_Le_MP4."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    file_name = clean_filename(title, year)
    output_filepath = os.path.join(OUTPUT_DIR, f"{file_name}.mp4")
    
    if os.path.exists(output_filepath) and os.path.getsize(output_filepath) > 10 * 1024 * 1024:
        print(f"[BỎ QUA] Phim [{genre}] '{title}' ({year}) đã có sẵn tại: {output_filepath}\n")
        return True
        
    print(f"==================================================")
    print(f"🎬 ĐANG TẢI: {title} ({year}) [{genre}]")
    print(f"   Tên File: {file_name}.mp4")
    print(f"   Đường dẫn: {output_filepath}")
    print(f"   Luồng: {m3u8_url}")
    print(f"==================================================")
    
    cmd = [
        sys.executable, "-m", "yt_dlp",
        "--no-check-certificates",
        "--concurrent-fragments", "16",
        "-o", output_filepath,
        m3u8_url
    ]
    
    try:
        res = subprocess.run(cmd, text=True)
        if res.returncode == 0 and os.path.exists(output_filepath):
            size_mb = os.path.getsize(output_filepath) / (1024 * 1024)
            print(f"✅ THÀNH CÔNG: Đã tải xong '{file_name}.mp4' ({size_mb:.2f} MB)\n")
            return True
        else:
            print(f"❌ LỖI: Không thể tải '{title}' (Mã lỗi: {res.returncode})\n")
            return False
    except Exception as e:
        print(f"❌ EXCEPTION: {e}\n")
        return False

def main():
    print("==================================================")
    print(f"   TẢI PHIM LẺ HÀNH ĐỘNG & KINH DỊ ({MIN_YEAR} - {MAX_YEAR})")
    print(f"   THƯ MỤC ĐÍCH: {OUTPUT_DIR}")
    print("==================================================")
    
    movies = get_action_horror_single_movies(max_pages_per_genre=6)
    if not movies:
        print("[LỖI] Không tìm thấy phim lẻ nào phù hợp điều kiện.")
        return

    print(f"📁 Thư mục lưu file MP4: {OUTPUT_DIR}\n")
    
    success_count = 0
    for idx, movie in enumerate(movies, 1):
        title = movie["title"]
        genre = movie["genre"]
        year = movie["year"]
        slug = movie["slug"]
        
        print(f"[{idx}/{len(movies)}] Kiểm tra link: {title} ({year}) - Thể loại: {genre}...")
        m3u8_url = get_m3u8_stream(slug)
        
        if m3u8_url:
            ok = download_movie_mp4(title, genre, year, slug, m3u8_url)
            if ok:
                success_count += 1
        else:
            print(f"⚠️ Bỏ qua '{title}': Không tìm thấy link stream m3u8.\n")
            
    print("==================================================")
    print(f"🎉 HOÀN TẤT! Đã tải thành công {success_count}/{len(movies)} phim lẻ Hành động & Kinh dị!")
    print(f"📁 Kiểm tra tại: {OUTPUT_DIR}")
    print("==================================================")

if __name__ == "__main__":
    main()
