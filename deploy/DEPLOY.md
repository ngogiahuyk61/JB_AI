# JapaneseAI — Free-tier deploy stack

## Kiến trúc mục tiêu vs hiện trạng

```
GitHub (monorepo f:\JB_AI)
│
├── Frontend (React + Vite)          → Cloudflare Pages     ✅ Đã chuẩn bị
│   └── src/config/api.ts            env VITE_API_BASE_URL
│
├── Backend (.NET 8 API)             → Render               ✅ Đã chuẩn bị
│   └── render.yaml                  PORT, CORS, dual DB
│
├── AI (Gemini hiện tại)             → Browser (client)     ⚠️ Chưa tách service
│   └── geminiService.ts             Gọi trực tiếp Google API
│   └── ai-service/ (stub)           FastAPI + Ollama — Giai đoạn 2
│
├── Database                         → Neon (PostgreSQL)    ✅ Đã chuẩn bị
│   └── Trước: SQL Server LocalDB    Local dev vẫn dùng SqlServer
│   └── Cloud: Npgsql + JSON seed    ~7971 từ vựng
│
└── Storage                          → Cloudflare R2        🔲 Giai đoạn 2
    └── Trước: data/ local           KANJIDIC2, Tatoeba TSV
```

## Gap analysis (cần biết trước khi deploy)

| Thành phần | Hiện tại | Cloud | Ghi chú |
|------------|----------|-------|---------|
| API URL | Hardcoded localhost | `VITE_API_BASE_URL` | ✅ Fixed |
| CORS | localhost only | `FRONTEND_URL` env | ✅ Fixed |
| DB | SQL Server | Neon PostgreSQL | ✅ Dual provider |
| Vocab seed | T-SQL files | `all_vocabulary.json` | ✅ Export script |
| Gemini AI | Browser key | Exposed in bundle | ⚠️ Dùng `VITE_GEMINI_API_KEY` hoặc proxy sau |
| Ollama/Python | Không có | VPS stub | `ai-service/` placeholder |
| R2 | Không có | Chưa cần | data/ bundled vào publish |
| Render cold start | — | Free tier ~30s sleep | Bình thường |

## Bước 1 — Neon PostgreSQL (free)

1. Đăng ký https://neon.tech
2. Tạo project `japaneseai`
3. Copy connection string (dạng `Host=ep-xxx.neon.tech;Database=neondb;Username=...;Password=...;SSL Mode=Require`)
4. Lưu lại — dùng cho Render

## Bước 2 — Render Backend

1. Push code lên GitHub
2. Render Dashboard → **New Blueprint** → connect repo → chọn `render.yaml`
3. Set environment variables:
   - `ConnectionStrings__DefaultConnection` = Neon connection string
   - `DATABASE_PROVIDER` = `PostgreSQL`
   - `FRONTEND_URL` = `https://your-app.pages.dev` (sau bước 3)
4. Deploy — lần đầu sẽ migrate + seed vocabulary (~2-5 phút)

**Health check:** `https://japaneseai-api.onrender.com/health`

## Bước 3 — Cloudflare Pages (Frontend)

1. Cloudflare Dashboard → Pages → Create project → Connect GitHub
2. Settings:
   - **Root directory:** `frontend`
   - **Build command:** `npm ci && npm run build`
   - **Build output:** `dist`
3. Environment variables (Production):
   - `VITE_API_BASE_URL` = `https://japaneseai-api.onrender.com`
   - `VITE_GEMINI_API_KEY` = your Gemini key
4. Deploy

## Bước 4 — Cập nhật CORS trên Render

Sau khi có URL Pages, set trên Render:
```
FRONTEND_URL=https://your-app.pages.dev
```

## Bước 5 (tùy chọn) — AI Service VPS

Xem `ai-service/README.md` — chạy FastAPI + Ollama trên VPS/local.
Frontend chưa wired — giai đoạn 2.

## Bước 6 (tùy chọn) — Cloudflare R2

Dùng khi cần lưu KANJIDIC2 full (~30MB) thay vì bundle vào deploy artifact.
Upload `kanjidic2.xml` lên R2, download at startup — chưa implement.

## Local development

```powershell
# Backend (SQL Server LocalDB — mặc định)
cd backend/src/JapaneseAI.Api
dotnet run

# Backend (Neon — test production path)
$env:DATABASE_PROVIDER="PostgreSQL"
$env:ConnectionStrings__DefaultConnection="Host=ep-xxx.neon.tech;..."
dotnet run

# Frontend
cd frontend
cp .env.example .env
npm run dev
```

## Export vocabulary JSON (trước deploy)

```powershell
node scripts/export-vocabulary-json.cjs
```

## Troubleshooting

| Lỗi | Giải pháp |
|-----|-----------|
| CORS blocked | Set `FRONTEND_URL` trên Render |
| DB migrate fail | Kiểm tra Neon SSL + connection string |
| Empty vocabulary | Chạy export JSON + redeploy backend |
| Render sleep | Free tier sleep sau 15 phút idle — cold start ~30s |
| Gemini không hoạt động | Set `VITE_GEMINI_API_KEY` trên Cloudflare Pages |
