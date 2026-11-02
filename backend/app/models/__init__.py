"""Import every model so `Base.metadata` is complete (Alembic and tests rely on this)."""

from app.models.admin import AuditLog, ContentItem, EnquiryNote, MediaAsset, SiteSetting
from app.models.ai_usage import AiUsage
from app.models.branch import Branch
from app.models.chat_message import ChatMessage
from app.models.chat_session import ChatSession
from app.models.contact_enquiry import ContactEnquiry
from app.models.demo_request import DemoRequest
from app.models.hero_video import HeroVideo, HeroVideoConfig
from app.models.user import AuthSession, User

__all__ = [
    "AiUsage", "AuditLog", "AuthSession", "Branch", "ChatMessage", "ChatSession", "ContactEnquiry", "ContentItem",
    "DemoRequest", "EnquiryNote", "HeroVideo", "HeroVideoConfig", "MediaAsset", "SiteSetting", "User",
]
