# JapaneseAI - Hệ Thống Học Tiếng Nhật Thông Minh (JLPT)

Hệ thống hỗ trợ học từ vựng JLPT N5–N1, Flashcard, phân tích Kanji, đề thi trắc nghiệm và luyện nói với Sensei AI (Ollama local / Gemini).

---

## Start nhanh (2 terminal)

Mở **2 cửa sổ terminal** tại thư mục gốc dự án `JB_AI`.

### Terminal 1 — Backend (API)

```powershell
cd backend\src\JapaneseAI.Api
dotnet run
```

- API: [http://localhost:5165](http://localhost:5165)
- Swagger: [http://localhost:5165/swagger](http://localhost:5165/swagger)
- Chat health: [http://localhost:5165/api/chat/health](http://localhost:5165/api/chat/health)

### Terminal 2 — Frontend (React)

Lần đầu cần cài dependency và file `.env`:

```powershell
cd frontend
npm install
copy .env.example .env
```

Chạy dev server:

```powershell
cd frontend
npm run dev
```

- Website: [http://localhost:5173](http://localhost:5173)

### Lệnh một dòng (từ thư mục gốc `JB_AI`)

```powershell
# Backend
cd backend\src\JapaneseAI.Api; dotnet run

# Frontend (terminal khác)
cd frontend; npm run dev
```

### Build production (tùy chọn)

```powershell
# Backend
cd backend; dotnet build JapaneseAI.sln -c Release

# Frontend
cd frontend; npm run build:check
cd frontend
npm run dev
```

---

## Yêu cầu hệ thống

1. **Backend**: .NET 8 SDK
2. **Frontend**: Node.js 18+ và npm
3. **Database**: SQL Server / LocalDB (Windows)
4. **AI Kaiwa (tùy chọn)**: [Ollama](https://ollama.com) + model `qwen3:4b` để chat local
5. **Trình duyệt**: Chrome hoặc Edge (Web Speech API)

---

## Hướng dẫn chi tiết

### Bước 1: Database (chỉ lần đầu)

Từ thư mục `backend`:

```powershell
cd backend
dotnet ef database update --project src\JapaneseAI.Infrastructure\JapaneseAI.Infrastructure.csproj --startup-project src\JapaneseAI.Api\JapaneseAI.Api.csproj
```

Database `JapaneseAI` sẽ được tạo trên LocalDB. Lần chạy API đầu tiên sẽ seed từ vựng từ thư mục `sql/`.

### Bước 2: Cấu hình Frontend `.env`

```powershell
cd frontend
copy .env.example .env
```

Chỉnh `frontend/.env`:

```env
VITE_GEMINI_API_KEY=your_gemini_key_here
VITE_API_BASE_URL=http://localhost:5165
```

| Biến | Mô tả |
|------|--------|
| `VITE_API_BASE_URL` | URL backend (mặc định `http://localhost:5165`) |
| `VITE_GEMINI_API_KEY` | Khóa Gemini — dùng khi Ollama offline |

### Bước 3: Ollama (Sensei AI local — tùy chọn)

```powershell
ollama pull qwen3:4b
ollama serve
```

Chatbot ưu tiên Qwen local → Gemini → Demo.

---

## Cấu trúc thư mục

| Thư mục | Mô tả |
|---------|--------|
| `backend/` | ASP.NET Core API |
| `frontend/` | React + Vite + TypeScript |
| `sql/` | Schema và seed JLPT N5→N1 |
| `deploy/` | Modelfile Ollama, hướng dẫn deploy |
| `plan.md` | Kế hoạch tối ưu AI Kaiwa |

---

## Xử lý lỗi thường gặp

| Lỗi | Cách xử lý |
|-----|------------|
| `dotnet run` báo file locked | Dừng instance API cũ (Ctrl+C) hoặc tắt process `JapaneseAI.Api` trong Task Manager |
| Frontend không gọi được API | Kiểm tra BE đang chạy port `5165` và `VITE_API_BASE_URL` trong `.env` |
| Chat hiện `Demo` | Bật Ollama hoặc thêm `VITE_GEMINI_API_KEY` |
| `npm install` lỗi | Dùng Node 18+, chạy lại trong `frontend/` |

