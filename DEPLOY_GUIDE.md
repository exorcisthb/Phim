# 🎬 RoPhim Auto Crawl & Deploy Guide

## 🚀 Quick Deploy

### Cách 1: Tự động cào và deploy (KHUYÊN DÙNG)
```bash
npm run deploy
```
Script này sẽ:
- ✅ Chạy crawler để cào phim mới
- ✅ Cập nhật `movies.json` (merge, không ghi đè phim cũ)
- ✅ Tự động tăng cache version
- ✅ Commit và push lên GitHub
- ✅ Website tự động cập nhật sau 1-2 phút

### Cách 2: Chỉ cào phim, không deploy
```bash
npm run crawl
```

## 📊 Cách hoạt động

### 1. Crawler Logic (MERGE, không ghi đè)
```python
# File: auto_daily_crawler.py

# Bước 1: Load phim cũ (IMMUTABLE MASTER)
existing_db = load("movies.json")  # Giữ nguyên 100%

# Bước 2: Cào phim mới từ PhimAPI
new_movies = crawl_from_api()

# Bước 3: Merge thông minh
for new in new_movies:
    if new not in existing_db:  # Check by (title + year)
        existing_db.append(new)  # Chỉ thêm, không xóa

# Bước 4: Save lại
save(existing_db, "movies.json")
```

**Kết quả:** Phim cũ **GIỮ NGUYÊN 100%**, chỉ **THÊM** phim mới!

### 2. Cache Busting
```javascript
// File: app.js
const cacheVersion = '20260109';  // Tự động tăng khi deploy
fetch(`movies.json?v=${cacheVersion}&t=${Date.now()}`)
```

Browser sẽ **KHÔNG cache** phim cũ nữa!

## 🔄 Workflow hàng ngày

```bash
# Sáng nào cũng chạy:
npm run deploy

# Xong! Website tự cập nhật trong 1-2 phút
```

## 🎯 Database Structure

### movies.json (2078 phim)
```json
[
  {
    "id": 1,
    "title": "Venom: Kèo Cuối",
    "year": 2024,
    "genre": "Hành Động",
    "country": "Mỹ",
    "type": "single",
    "m3u8_url": "https://...",
    "episodes": [...]
  }
]
```

### Merge Logic
```python
# Key để check trùng: (title + year)
existing_keys = {
  ("venom: kèo cuối", 2024),
  ("deadpool & wolverine", 2024),
  # ...
}

# Phim mới
if (new_title, new_year) not in existing_keys:
    db.append(new_movie)  # ✅ Thêm
else:
    pass  # ❌ Bỏ qua (đã có rồi)
```

## 📈 Production Deployment

### GitHub Actions (Auto Deploy)
File: `.github/workflows/deploy.yml` đã config:
- ✅ Trigger: Khi push lên `main` branch
- ✅ Render/Vercel tự động deploy
- ✅ Cache CDN tự clear

### Manual Deploy (nếu cần)
```bash
git add movies.json app.js
git commit -m "🎬 Update movies database"
git push origin main
```

## 🐛 Troubleshooting

### Vấn đề: Web không cập nhật sau khi push
**Giải pháp:**
1. Đợi 1-2 phút (Render/Vercel deploy time)
2. Hard refresh browser: `Ctrl + F5` (Windows) hoặc `Cmd + Shift + R` (Mac)
3. Xóa cache browser:
   - Chrome: `Settings > Privacy > Clear browsing data`
   - Firefox: `Settings > Privacy > Clear Data`

### Vấn đề: Crawler cào trùng phim
**Giải pháp:**
Không thể xảy ra! Script có logic check:
```python
if (title, year) in existing_keys:
    skip()  # Bỏ qua phim trùng
```

### Vấn đề: Phim cũ bị mất
**Giải pháp:**
Không thể xảy ra! Script chỉ **APPEND**, không **DELETE**:
```python
existing_db = load()  # Giữ nguyên
existing_db.append(new)  # Chỉ thêm
save(existing_db)  # Không ghi đè
```

## 📊 Stats Dashboard

Sau mỗi lần crawl, check file:
```
movie_changes_report.xlsx
```

Sheet 1: **Nhật Ký Cập Nhật** (hôm nay thêm bao nhiêu phim)
Sheet 2: **Tổng Kho Phim** (full 2078 phim)

## 🎯 Tips & Tricks

### 1. Chỉ cào Marvel/DC
```bash
# Sửa trong auto_daily_crawler.py, dòng ~120:
marvel_dc_search_terms = [
    "deadpool", "venom", "batman", ...
]
```

### 2. Tăng tốc crawl
```bash
# Sửa trong auto_daily_crawler.py, dòng ~200:
ThreadPoolExecutor(max_workers=50)  # Tăng từ 20 lên 50
```

### 3. Deploy without crawl
```bash
git add movies.json
git commit -m "Update DB"
git push
```

## 📞 Support

Gặp vấn đề? Tạo issue trên GitHub!
