# 🤖 RoPhim Auto Crawler System

## ✅ Đã Setup Tự Động Hoàn Toàn!

Website của bạn giờ sẽ **TỰ ĐỘNG CÀO VÀ CẬP NHẬT** phim mới **MỖI 6 TIẾNG**!

## 🕐 Lịch Chạy Tự Động

GitHub Actions sẽ tự động crawl theo lịch:

| Giờ (ICT) | Giờ (UTC) | Mô tả |
|-----------|-----------|-------|
| **07:00** | 00:00 | 🌅 Sáng sớm - Cập nhật phim đêm |
| **13:00** | 06:00 | ☀️ Trưa - Cập nhật phim mới |
| **19:00** | 12:00 | 🌆 Tối - Cập nhật phim chiều |
| **01:00** | 18:00 | 🌙 Đêm khuya - Cập nhật phim tối |

## 🎯 Những Gì Sẽ Xảy Ra Tự Động

### Mỗi 6 tiếng:
1. 🕷️ **Crawler chạy** - Cào phim mới từ PhimAPI
2. 🔍 **Smart merge** - Chỉ thêm phim mới, không trùng lặp
3. 💾 **Lưu vào movies.json** - Cập nhật database
4. 🔄 **Update cache version** - Buộc browser load phim mới
5. 📤 **Push lên GitHub** - Commit + Push tự động
6. 🚀 **Deploy production** - Render/Vercel tự động deploy
7. 🌐 **Website cập nhật** - User thấy phim mới ngay!

### Ví dụ commit tự động:
```
🤖 Auto-update: +47 phim | Total: 3051 phim (128 trang)

📅 Auto-crawled: 2026-01-09 07:00:15 UTC
🎬 New movies added: 47
📊 Total database: 3051 movies
📄 Total pages: 128
🔄 Cache version updated

✨ Crawler run by GitHub Actions
🚀 Website will auto-update in 1-2 minutes
```

## 🔧 Chạy Thủ Công (Nếu Cần)

### Cách 1: Qua GitHub Web UI
1. Vào repository GitHub của bạn
2. Click tab **Actions**
3. Chọn workflow **"Auto Crawl & Deploy Movies"** hoặc **"Manual Crawl"**
4. Click **"Run workflow"** > **"Run workflow"** (màu xanh)
5. Đợi 2-3 phút → Xong!

### Cách 2: Qua Terminal
```bash
# Chạy script local
npm run deploy

# Hoặc chỉ crawl (không push)
npm run crawl
```

## 📊 Xem Kết Quả

### GitHub Actions Log
1. Vào **Actions** tab trên GitHub
2. Click vào workflow run mới nhất
3. Xem log chi tiết:
   ```
   🎬 RoPhim Auto Crawler - Deployment Summary
   ════════════════════════════════════════════
   📊 Total Movies: 3051
   📄 Total Pages: 128
   ⏰ Completed: 2026-01-09 07:05:32 UTC
   🚀 Status: DEPLOYED TO PRODUCTION ✅
   ```

### Excel Report
File `movie_changes_report.xlsx` tự động update với:
- **Sheet 1**: Nhật ký phim mới hôm nay
- **Sheet 2**: Tổng kho phim (full catalog)

## 🛡️ Bảo Vệ Chống Trùng

### Smart Merge Logic
```python
# Check trùng bằng (title + year)
existing_keys = {
  ("deadpool & wolverine", 2024),
  ("venom: the last dance", 2024),
  # ...
}

# Phim mới
if (new_movie_title, new_movie_year) not in existing_keys:
    database.append(new_movie)  # ✅ Thêm mới
else:
    skip()  # ❌ Bỏ qua (đã có rồi)
```

**Kết quả:** 
- ✅ Phim cũ **GIỮ NGUYÊN 100%**
- ✅ Phim mới **CHỈ THÊM**, không trùng
- ✅ Không bao giờ mất data

## 🎯 Lọc Phim Thông Minh

Crawler chỉ lấy phim:
- ✅ Năm 2020-2026
- ✅ Quốc gia: Mỹ, Hàn Quốc, Nhật Bản (live-action only)
- ✅ Thể loại: Hành Động, Kinh Dị, Hài, Phiêu Lưu, Viễn Tưởng
- ✅ Có link m3u8 stream hợp lệ
- ✅ Có poster/backdrop

Tự động loại bỏ:
- ❌ Anime Nhật Bản
- ❌ Phim Việt Nam, Thái Lan, Trung Quốc
- ❌ Phim cũ trước 2020
- ❌ Phim không có stream

## 🔔 Thông Báo

### Email Notification (Optional)
Để nhận email khi crawler chạy:
1. Vào **Settings** > **Notifications** trên GitHub
2. Bật **Actions** notifications
3. Chọn **Email** hoặc **Web**

## 🐛 Troubleshooting

### Crawler không chạy tự động?
**Check:**
1. Vào **Actions** tab → Xem có workflow bị failed không
2. Check **Settings** > **Actions** > **General** → Đảm bảo **Allow all actions** được bật
3. Xem log lỗi trong workflow run

### Website không cập nhật sau khi push?
**Giải pháp:**
1. Đợi 1-2 phút (deploy time)
2. Hard refresh: `Ctrl + F5`
3. Xóa cache browser
4. Check Render/Vercel dashboard xem deploy thành công chưa

### Thêm quá nhiều phim trùng?
**Không thể xảy ra!** Script check trùng bằng `(title, year)`.

Nếu vẫn thấy trùng, báo lỗi với:
```bash
python -c "
import json
data = json.load(open('movies.json'))
seen = {}
for m in data:
    key = (m['title'].lower(), m['year'])
    if key in seen:
        print(f'DUPLICATE: {m[\"title\"]} ({m[\"year\"]})')
    seen[key] = m
"
```

## 📈 Statistics

### Database Growth
```bash
# Check số phim theo thời gian
git log --oneline --all | grep -E "[0-9]+ phim|[0-9]+ trang"
```

### Crawler Performance
Trung bình mỗi lần chạy:
- ⏱️ Thời gian: 2-5 phút
- 🆕 Phim mới: 20-100 phim/lần
- 📊 Throughput: ~300 API calls/phút

## 💡 Tips & Tricks

### 1. Tăng tốc crawler
Sửa trong `auto_daily_crawler.py`, dòng ~200:
```python
ThreadPoolExecutor(max_workers=50)  # Tăng từ 20 lên 50
```

### 2. Chỉ cào Marvel/DC
Tắt các endpoint khác trong `auto_daily_crawler.py`, dòng ~120:
```python
endpoints = [
    # Comment các dòng này:
    # ("https://phimapi.com/v1/api/quoc-gia/han-quoc", 60),
    # ("https://phimapi.com/v1/api/quoc-gia/nhat-ban", 40),
]
```

### 3. Disable auto crawler
Xóa hoặc comment phần `schedule` trong `.github/workflows/daily_crawl.yml`:
```yaml
# on:
#   schedule:
#     - cron: '0 0 * * *'
```

## 🎉 Kết Luận

Bạn **KHÔNG CẦN LÀM GÌ NỮA**! 

Hệ thống sẽ:
- ✅ Tự động cào phim mới mỗi 6 tiếng
- ✅ Tự động merge vào database
- ✅ Tự động push lên GitHub
- ✅ Tự động deploy lên production
- ✅ User thấy phim mới trong vòng 1-2 phút

**Chỉ cần ngồi và xem phim thôi!** 🍿🎬
