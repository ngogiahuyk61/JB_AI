"""JapaneseAI AI Service — FastAPI stub for Ollama/Gemini proxy (Phase 2)."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="JapaneseAI AI Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    model: str = "llama3.2"


class ChatResponse(BaseModel):
    reply: str
    model: str


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-service"}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    # TODO: integrate Ollama (http://localhost:11434) or Gemini
    return ChatResponse(
        reply=f"[stub] Received: {req.message[:100]}",
        model=req.model,
    )
