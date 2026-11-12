"""Role-based access control.

Roles: `user` (a website customer, no admin access), `admin` (staff limited to the modules a super admin granted) and
`super_admin` (everything, including administrators, audit logs and system status). Every protected endpoint checks
this on the server; the admin UI only mirrors it for convenience.
"""

from __future__ import annotations

# Modules an `admin` can be granted. (Administrators, audit log and system status are super-admin only.)
MODULES: dict[str, str] = {
    "enquiries": "Customer enquiries",
    "demo_requests": "Demo requests",
    "customers": "Registered users (website customers)",
    "content": "Website content",
    "chatbot": "AI chatbot",
    "media": "Media library",
    "hero_videos": "Homepage videos",
    "services": "Services & categories",
    "careers": "Careers",
    "navigation": "Navigation & SEO",
    "settings": "Website settings",
}
SUPER_ONLY = ("users", "audit", "system")
STAFF_ROLES = ("admin", "super_admin")


def is_staff(user) -> bool:
    return bool(user and user.is_active and user.role in STAFF_ROLES)


def has_permission(user, module: str) -> bool:
    if not is_staff(user):
        return False
    if user.role == "super_admin":
        return True
    return module in MODULES and module in (user.permissions or [])


def effective_permissions(user) -> list[str]:
    if not is_staff(user):
        return []
    return [*MODULES, *SUPER_ONLY] if user.role == "super_admin" else [m for m in (user.permissions or []) if m in MODULES]


def clean_permissions(values) -> list[str]:
    """Keep only known module names, de-duplicated, in a stable order."""
    wanted = set(values or [])
    return [m for m in MODULES if m in wanted]
