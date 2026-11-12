from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.api.deps import get_ai_service, optional_user
from app.core.config import Settings, get_settings
from app.core.rate_limit import client_ip, rate_limit
from app.core.security import new_token, token_digest
from app.db.session import get_db
from app.models import User
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_service import Guest, handle_chat
from app.services.ai_service import AIService

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse,
             dependencies=[Depends(rate_limit("chat", "chat_rate_limit_max", "chat_rate_limit_window_seconds"))])
async def chat(body: ChatRequest, request: Request, response: Response, db: Session = Depends(get_db), settings: Settings = Depends(get_settings),
         ai: AIService = Depends(get_ai_service), user: User | None = Depends(optional_user)):
    """The AI assistant. The backend calls the configured provider (AI_PROVIDER: gemini or openai); the browser never sees a key.
    A signed-out visitor may send `CHAT_GUEST_MESSAGE_LIMIT` (3) messages; the next one is refused with 401 `login_required`. The allowance is tied to an HttpOnly cookie issued here
    and to the network address, and counted from the stored messages: the browser cannot reset it by forgetting its conversation id."""
    guest = None
    if user is None:
        cookie = request.cookies.get(settings.chat_guest_cookie_name)
        token = cookie if cookie and 20 <= len(cookie) <= 100 else new_token()
        if token != cookie:
            response.set_cookie(settings.chat_guest_cookie_name, token, max_age=90 * 86400, httponly=True, secure=settings.cookie_secure_on, samesite=settings.cookie_samesite,
                                domain=settings.cookie_domain, path="/api/chat")
        guest = Guest(key=token_digest(token, settings), ip_hash=token_digest(f"ip:{client_ip(request, settings)}", settings))
    return await handle_chat(db, settings, ai, user, body, guest)
