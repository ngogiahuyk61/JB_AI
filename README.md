# JapaneseAI - Hệ Thống Học Tiếng Nhật Thông Minh (JLPT)

Hệ thống hỗ trợ học từ vựng JLPT N5/N4/N3, luyện nhớ qua thẻ Flashcard, tự động phân tích Kanji, sinh đề thi trắc nghiệm JLPT và luyện nói với Sensei AI thông qua Gemini.

---

## 🛠️ Yêu Cầu Hệ Thống

1. **Backend**: .NET 8 hoặc .NET 9 SDK
2. **Frontend**: Node.js v18 trở lên & npm
3. **Database**: SQL Server (Hỗ trợ LocalDB mặc định trên Windows, hoặc SQL Server Express / Docker SQL Server)
4. **Trình duyệt**: Khuyến nghị dùng Google Chrome hoặc Microsoft Edge (hỗ trợ tốt nhất Web Speech API phát âm)

---

## 🚀 Hướng Dẫn Khởi Chạy Nhanh

### Bước 1: Khởi động Backend API (C#)

1. Di chuyển vào thư mục backend:
   ```bash
   cd backend
   ```

2. Tạo database và cấu hình schema (EF Core):
   *(Database LocalDB `JapaneseAI` sẽ tự động được tạo trên server LocalDB của bạn).*
   ```bash
   dotnet ef database update --project src/JapaneseAI.Infrastructure/JapaneseAI.Infrastructure.csproj --startup-project src/JapaneseAI.Api/JapaneseAI.Api.csproj
   ```

3. Khởi chạy Backend Web API:
   ```bash
   dotnet run --project src/JapaneseAI.Api/JapaneseAI.Api.csproj
   ```
   - API chạy tại địa chỉ: `http://localhost:5165`
   - Giao diện Swagger UI (Dev API): `http://localhost:5165/swagger`
   - *Lưu ý: API sẽ tự động nạp (Seed) toàn bộ 7,971 từ vựng từ các file SQL trong thư mục `/sql` vào database trong lần chạy đầu tiên.*

---

### Bước 2: Khởi động Frontend (React)

1. Di chuyển vào thư mục frontend:
   ```bash
   cd frontend
   ```

2. Cài đặt các thư viện (Dependencies):
   ```bash
   npm install
   ```

3. Cấu hình biến môi trường:
   Sao chép tệp `.env.example` thành `.env` (hoặc `.env.local`):
   ```bash
   cp .env.example .env
   ```
   Mở tệp `.env` và điền khóa API Gemini của bạn để bật tính năng AI chat và sinh đề nâng cao:
   ```env
   VITE_GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
   VITE_API_BASE_URL=http://localhost:5165/api
   ```

4. Chạy Frontend dev server:
   ```bash
   npm run dev
   ```
   - Frontend sẽ chạy tại địa chỉ: `http://localhost:5173/`

---

## 📁 Cấu Trúc Thư Mục Dự Án

- `backend/`: Mã nguồn ASP.NET Core API (Clean Architecture).
- `frontend/`: Mã nguồn React 18 + Vite + TypeScript.
- `sql/`: Thư mục chứa schema database và dữ liệu seed JLPT N5->N1.
- `scripts/`: Chứa mã tiện ích chuyển đổi Excel từ vựng JLPT sang SQL chèn DB.
- `README.md`: Hướng dẫn chạy dự án này.
