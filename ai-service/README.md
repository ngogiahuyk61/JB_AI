# AI Service (Phase 2) — FastAPI + Ollama

Placeholder cho kiến trúc deploy:

```
Frontend → VPS (FastAPI) → Ollama local
                ↓
           Gemini API (fallback)
```

## Hiện tại

Gemini chạy **trực tiếp trên browser** (`frontend/src/services/geminiService.ts`).
Không cần VPS cho MVP deploy.

## Khi nào cần service này?

- Ẩn API key khỏi client
- Dùng Ollama offline (llama3, mistral...)
- Rate limiting / caching

## Quick start (local)

```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Endpoints (stub)

- `GET /health` — health check
- `POST /chat` — proxy tới Ollama hoặc Gemini

## Deploy VPS

1. Cài Ollama: https://ollama.ai
2. `ollama pull llama3.2`
3. Chạy FastAPI với systemd hoặc Docker
4. Set `VITE_AI_SERVICE_URL` trên Cloudflare Pages (khi frontend wired)
