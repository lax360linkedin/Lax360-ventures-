from __future__ import annotations

import uuid
from typing import Literal

from pydantic import AliasChoices, BaseModel, Field

from app.schemas.common import ApiModel

MAX_HISTORY_ITEMS = 20
MAX_HISTORY_CHARS = 1000


class HistoryItem(ApiModel):
    """A past turn supplied by a client without a stored conversation. Only user/assistant roles exist, so a client
    can never inject a system or developer instruction; the system prompt is built on the server."""

    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=MAX_HISTORY_CHARS)


class ChatRequest(ApiModel):
    # Hard schema cap; the configurable CHAT_MAX_INPUT_CHARS limit is enforced in the service.
    message: str = Field(min_length=1, max_length=4000)
    # `conversation_id` is accepted as an alias of `session_id` (the id returned by the first reply).
    session_id: uuid.UUID | None = Field(default=None, validation_alias=AliasChoices("session_id", "conversation_id"))
    session_token: str | None = Field(default=None, max_length=100)
    # Optional stateless context, used only when no stored conversation is referenced; never stored, bounded, validated.
    history: list[HistoryItem] = Field(default_factory=list, max_length=MAX_HISTORY_ITEMS)


class ChatLink(BaseModel):
    label: str
    to: str


class ChatReply(BaseModel):
    id: str
    text: str


class ChatResponse(BaseModel):
    reply: str
    conversation_id: uuid.UUID
    provider: str
    session_id: uuid.UUID  # same value as conversation_id (existing frontend field)
    session_token: str | None = None  # only on the response that creates the conversation
    message: ChatReply
    links: list[ChatLink] = []
    whatsapp: bool = False
    follow_ups: list[str] = []
    meta: dict
