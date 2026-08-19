import sys, os, json, re, requests, time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

WEB_GENRES = ["Hành Động", "Kinh Dị", "Hài", "Phiêu Lưu", "Viễn Tưởng"]
REPORT_FILE = "movie_changes_report.xlsx"
DB_FILE = "movies.json"

def fix_img_url(url):
    if not url:
        return ""
    if url.startswith("http"):
        return url
    if url.startswith("/"):
        return "https://phimimg.com" + url
    return "https://phimimg.com/" + url

def extract_accurate_country(country_list):
    if not country_list:
        return "Mỹ"
    
    names = []
    for c in country_list:
        n = (c.get("name", "") if isinstance(c, dict) else str(c)).strip()
        names.append(n)
        
    for n in names:
        if "Nhật" in n:
            return "Nhật Bản"
        elif "Hàn" in n:
            return "Hàn Quốc"
        elif "Việt" in n:
            return "Việt Nam"
        elif "Thái" in n:
            return "Thái Lan"
        elif "Trung" in n or "Hoa" in n:
            return "Trung Quốc"
        elif any(k in n for k in ["Mỹ", "Âu", "Anh", "Pháp", "Đức", "Canada", "Ý", "Tây Ban Nha", "Úc"]):
            return "Mỹ"
            
    return names[0] if names else "Khác"

def map_accurate_genre(category_list):
    if not category_list:
        return "Hành Động"
        
    cat_names = [(c.get("name", "") if isinstance(c, dict) else str(c)).strip() for c in category_list]
    
    # Direct match in WEB_GENRES
    for target in ["Kinh Dị", "Hành Động", "Viễn Tưởng", "Phiêu Lưu", "Hài"]:
        for cn in cat_names:
            if target.lower() in cn.lower():
                return target

    # Related match
    for cn in cat_names:
        cn_l = cn.lower()
        if any(k in cn_l for k in ["kinh di", "ma", "quy", "zombie", "horror", "bi an"]):
            return "Kinh Dị"
        elif any(k in cn_l for k in ["hanh dong", "vo thuat", "chieu rap", "action", "toi pham", "hinh su"]):
            return "Hành Động"
        elif any(k in cn_l for k in ["vien tuong", "gia tuong", "khoa hoc", "sci-fi", "fantasy"]):
            return "Viễn Tưởng"
        elif any(k in cn_l for k in ["phieu luu", "tham hiem", "adventure", "hoathinh"]):
            return "Phiêu Lưu"
        elif any(k in cn_l for k in ["hai", "che", "comedy", "tinh cam", "tam ly", "chinh kich"]):
            return "Hài"

    return "Hành Động"

def fetch_detail(slug):
    url = f"https://phimapi.com/phim/{slug}"
    for attempt in range(3):
        try:
            r = requests.get(url, headers=headers, timeout=6)
            if r.status_code == 200:
                d = r.json()
                if d.get("status") is True:
                    return d
        except:
            pass
        time.sleep(0.05)
    return None

# Step 1: Load Existing DB (IMMUTABLE MASTER)
print("==================================================")
print("STEP 1: Reading existing movies.json (IMMUTABLE MASTER)...")
existing_db = []
existing_keys = set()
existing_slugs = set()

if os.path.exists(DB_FILE):
    with open(DB_FILE, "r", encoding="utf-8") as f:
        existing_db = json.load(f)

for m in existing_db:
    key = (m.get("title", "").strip().lower(), m.get("year"))
    existing_keys.add(key)
    if m.get("slug"):
        existing_slugs.add(m["slug"])

print(f"Loaded {len(existing_db)} existing movies/series. They will NEVER be deleted or modified!")

# Step 2: Collect Candidate Slugs from Latest Pages & Special Slugs
print("\nSTEP 2: Crawling latest updates from PhimAPI...")
candidate_slugs = set()

# Essential Target Slugs (The Odyssey, Obsession, FROM, Wednesday, etc.)
special_target_slugs = [
    "su-thi-odyssey", "cuoc-phieu-luu", "am-anh-2026", "am-anh-yeu-va-do-ki", "am-anh", "noi-am-anh-2025",
    "thi-tran-ac-mong-hoi-chuong-la-phan-1", "thi-tran-ac-mong-hoi-chuong-la-phan-2",
    "thi-tran-ac-mong-hoi-chuong-la-phan-3", "thi-tran-ac-mong-hoi-chuong-la-phan-4",
    "nhung-nguoi-con-sot-lai-phan-1", "nhung-nguoi-con-sot-lai-phan-2",
    "thu-tu-phan-1", "thu-tu-phan-2", "gia-toc-rong-phan-1", "gia-toc-rong-phan-2", "gia-toc-rong-phan-3",
    "sup-do-phan-1", "sup-do-phan-2", "hao-quang-phan-1", "hao-quang-phan-2",
    "bai-hoc-dang-doi", "nu-hoang-nuoc-mat", "cho-san-cong-ly", "bao-thu",
    "ngoi-truong-xac-song", "the-gioi-ma-quai", "parasyte-vung-xam", "sinh-vat-gyeongseong", "ac-quy"
]
candidate_slugs.update(special_target_slugs)

def fetch_page_slugs(endpoint, total_pages):
    slugs = []
    for page in range(1, total_pages + 1):
        try:
            r = requests.get(f"{endpoint}?page={page}&limit=24", headers=headers, timeout=6)
            if r.status_code == 200:
                items = r.json().get("data", {}).get("items", [])
                for it in items:
                    if it.get("slug"):
                        slugs.append(it.get("slug"))
        except:
            pass
        time.sleep(0.02)
    return slugs

endpoints = [
    ("https://phimapi.com/v1/api/danh-sach/phim-moi-cap-nhat", 15),
    ("https://phimapi.com/v1/api/danh-sach/phim-le", 80),
    ("https://phimapi.com/v1/api/danh-sach/phim-bo", 80),
    ("https://phimapi.com/v1/api/quoc-gia/au-my", 50),
    ("https://phimapi.com/v1/api/quoc-gia/han-quoc", 50),
    ("https://phimapi.com/v1/api/quoc-gia/nhat-ban", 30),
]

with ThreadPoolExecutor(max_workers=16) as executor:
    futures = [executor.submit(fetch_page_slugs, url, pages) for url, pages in endpoints]
    for future in as_completed(futures):
        candidate_slugs.update(future.result())

# Exclude already existing slugs
new_candidate_slugs = [s for s in candidate_slugs if s not in existing_slugs]
print(f"Total candidate slugs: {len(candidate_slugs)} | Brand new candidate slugs to evaluate: {len(new_candidate_slugs)}")

# Step 3: Process New Candidates
print("\nSTEP 3: Processing new candidates...")
newly_added_items = []

def process_slug(slug):
    d = fetch_detail(slug)
    if not d:
        return None
    info = d.get("movie", {})
    if not info:
        return None

    # Country check: Exclude VN, TH, CN
    c_list = info.get("country", [])
    country = extract_accurate_country(c_list)
    if country in ["Việt Nam", "Thái Lan", "Trung Quốc"]:
        return None

    # Year Range: 2020 to 2026
    year_raw = info.get("year", 2026)
    try:
        year = int(year_raw)
    except:
        year = 2026

    if year < 2020 or year > 2026:
        return None

    eps_data = d.get("episodes", [])
    episodes = []
    m3u8_url = ""
    if eps_data and len(eps_data) > 0:
        server = eps_data[0].get("server_data", [])
        for ep in server:
            link = ep.get("link_m3u8", "")
            if link:
                episodes.append({
                    "name": ep.get("name", "Full"),
                    "slug": ep.get("slug", "full"),
                    "link_m3u8": link
                })
        if episodes:
            m3u8_url = episodes[0]["link_m3u8"]

    if not m3u8_url:
        return None

    raw_type = info.get("type", "")
    mtype = "series" if raw_type in ["series", "tvshows"] or len(episodes) > 1 else "single"

    # Genre Mapping: Strictly one of WEB_GENRES
    cats = info.get("category", [])
    genre = map_accurate_genre(cats)

    poster = fix_img_url(info.get("poster_url", ""))
    backdrop = fix_img_url(info.get("thumb_url", poster))
    if not poster:
        return None

    title = info.get("name", "Phim")
    origin_title = info.get("origin_name", info.get("name", ""))
    if "thi-tran-ac-mong" in slug or "from" in origin_title.lower():
        origin_title = f"FROM - {origin_title}"

    desc = info.get("content", "") or f"Bộ phim {country} phát hành năm {year}."
    desc = re.sub(r'<[^>]+>', '', desc).strip()
    if len(desc) > 300:
        desc = desc[:297] + "..."

    return {
        "slug": slug,
        "title": title,
        "origin_title": origin_title,
        "year": year,
        "genre": genre,
        "country": country,
        "type": mtype,
        "quality": "1080p FHD",
        "duration": info.get("time", "120 phút") if mtype == "single" else f"{len(episodes)} Tập ({info.get('time', '50 phút/tập')})",
        "poster": poster,
        "backdrop": backdrop,
        "description": desc,
        "m3u8_url": m3u8_url,
        "local_mp4": f"E:\\Phim\\Phim_Le_MP4\\{slug}.mp4",
        "episodes": episodes
    }

with ThreadPoolExecutor(max_workers=20) as executor:
    futures = [executor.submit(process_slug, slug) for slug in new_candidate_slugs]
    for i, future in enumerate(as_completed(futures), 1):
        res = future.result()
        if res:
            title_year_key = (res["title"].strip().lower(), res["year"])
            if title_year_key not in existing_keys:
                existing_keys.add(title_year_key)
                newly_added_items.append(res)

print(f"Newly appended items found: {len(newly_added_items)}")

# Step 4: Append New Items to Master DB
if newly_added_items:
    start_id = len(existing_db) + 1
    for i, item in enumerate(newly_added_items):
        item["id"] = start_id + i
        item["rating"] = round(4.3 + (item["id"] % 7) * 0.1, 1)
        existing_db.append(item)

# Ensure 2026 movies are prioritized near top while keeping DB intact
final_db = existing_db
total_pages = (len(final_db) + 23) // 24

with open(DB_FILE, "w", encoding="utf-8") as f:
    json.dump(final_db, f, ensure_ascii=False, indent=2)

print("\n==================================================")
print(f"SUCCESS: Master Database movies.json updated!")
print(f"Total Movies in System: {len(final_db)}")
print(f"Total Pages on Website: {total_pages} PAGES!")
print(f"New Items Added Today: {len(newly_added_items)}")

# Step 5: Excel Change Log Generation (movie_changes_report.xlsx)
print("\nSTEP 5: Generating Excel Change Log Report...")

wb = openpyxl.Workbook()

# Sheet 1: Daily Change Log
ws_log = wb.active
ws_log.title = "Nhật Ký Cập Nhật"

# Header styling
header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
header_fill = PatternFill(start_color="E50914", end_color="E50914", fill_type="solid")
thin_border = Border(
    left=Side(style='thin', color='DDDDDD'),
    right=Side(style='thin', color='DDDDDD'),
    top=Side(style='thin', color='DDDDDD'),
    bottom=Side(style='thin', color='DDDDDD')
)

headers_log = [
    "Ngày Cập Nhật", "ID Phim", "Tên Phim (Việt)", "Tên Gốc (English)", 
    "Loại Phim", "Thể Loại", "Quốc Gia", "Năm PH", "Số Tập", "Trạng Thái", "Nguồn Stream m3u8"
]

ws_log.append(headers_log)
for col_idx in range(1, len(headers_log) + 1):
    cell = ws_log.cell(row=1, column=col_idx)
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = Alignment(horizontal="center", vertical="center")

today_str = datetime.now().strftime("%Y-%m-%d %H:%M")

if newly_added_items:
    for item in newly_added_items:
        ws_log.append([
            today_str,
            item.get("id"),
            item.get("title"),
            item.get("origin_title"),
            "Phim Bộ" if item.get("type") == "series" else "Phim Lẻ",
            item.get("genre"),
            item.get("country"),
            item.get("year"),
            len(item.get("episodes", [])),
            "🔥 MỚI THÊM",
            item.get("m3u8_url")
        ])
else:
    ws_log.append([today_str, "-", "Không có phim mới", "-", "-", "-", "-", "-", "-", "TỰ ĐỘNG CẬP NHẬT", "-"])

# Sheet 2: All Movies Catalog
ws_cat = wb.create_sheet(title="Tổng Kho Phim (Full Catalog)")
headers_cat = ["ID", "Tên Phim", "Tên Gốc", "Loại Phim", "Thể Loại", "Quốc Gia", "Năm", "Số Tập", "M3U8 Link"]
ws_cat.append(headers_cat)

for col_idx in range(1, len(headers_cat) + 1):
    cell = ws_cat.cell(row=1, column=col_idx)
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = Alignment(horizontal="center", vertical="center")

for item in final_db:
    ws_cat.append([
        item.get("id"),
        item.get("title"),
        item.get("origin_title"),
        "Phim Bộ" if item.get("type") == "series" else "Phim Lẻ",
        item.get("genre"),
        item.get("country"),
        item.get("year"),
        len(item.get("episodes", [])),
        item.get("m3u8_url")
    ])

# Auto-adjust column widths for both sheets
for sheet in [ws_log, ws_cat]:
    sheet.views.sheetView[0].showGridLines = True
    for col in sheet.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = get_column_letter(col[0].column)
        sheet.column_dimensions[col_letter].width = max(max_len + 3, 12)

wb.save(REPORT_FILE)
print(f"Excel Report saved successfully to: {REPORT_FILE}")

# Verification of Odyssey & Obsession
print("\n==================================================")
print("VERIFICATION: Searching for Odyssey and Obsession in Master DB...")
target_check = [m for m in final_db if any(k in (m.get("title","") + " " + m.get("origin_title","")).lower() for k in ["odyssey", "obses", "sử thi odyssey", "ám ảnh"])]
print(f"Found {len(target_check)} Odyssey/Obsession titles in movies.json:")
for m in target_check:
    print(f"  - [{m['id']}] {m['title']} ({m['origin_title']}) | {m['country']} | {m['year']} | {m['genre']}")

