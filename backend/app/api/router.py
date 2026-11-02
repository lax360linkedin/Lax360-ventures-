from fastapi import APIRouter

from app.api.routes import admin, admin_content, admin_enquiries, admin_auth, admin_hero_videos, admin_media, admin_settings, admin_staff, auth, branches, chat, contact, demos, health, public, users

api_router = APIRouter(prefix="/api")
for module in (health, auth, users, branches, demos, contact, chat, public, admin, admin_enquiries, admin_content, admin_settings, admin_media, admin_hero_videos, admin_staff, admin_auth):
    api_router.include_router(module.router)
