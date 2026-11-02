from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_ai_service, optional_user
from app.core.config import Settings, get_settings
from app.core.rate_limit import rate_limit
from app.db.session import get_db
from app.models import User
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_service import handle_chat
from app.services.ai_service import AIService

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse,
             dependencies=[Depends(rate_limit("chat", "chat_rate_limit_max", "chat_rate_limit_window_seconds"))])
async def chat(body: ChatRequest, db: Session = Depends(get_db), settings: Settings = Depends(get_settings),
         ai: AIService = Depends(get_ai_service), user: User | None = Depends(optional_user)):
    """The AI assistant. The backend calls the configured provider (AI_PROVIDER: gemini or openai); the browser never sees a key."""
    return await handle_chat(db, settings, ai, user, body)
