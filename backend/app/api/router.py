from fastapi import APIRouter

from app.api.routes import admin, admin_branches, admin_channels, admin_customers, admin_page_images, admin_partnerships, admin_play_zone, admin_content, admin_enquiries, admin_enquiry_center, admin_auth, admin_hero_videos, admin_media, admin_settings, admin_staff, admin_translations, auth, branches, chat, contact, demos, health, partnerships, play_zone, product_resources, public, users

api_router = APIRouter(prefix="/api")
for module in (health, partnerships, play_zone, auth, users, branches, demos, contact, chat, product_resources, public, admin, admin_enquiries, admin_enquiry_center, admin_content, admin_settings, admin_media, admin_hero_videos, admin_staff, admin_customers, admin_page_images, admin_branches, admin_channels, admin_translations, admin_play_zone, admin_partnerships, admin_auth):
    api_router.include_router(module.router)
