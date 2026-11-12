"""What a new customer tells us when they register: who they are (category) and why they visit. The codes here are what is stored; the labels are shown to people
(the React site and the admin panel carry the same lists in frontend/src/data/registration.js). Only what is useful is asked: nothing here is an identity document or a financial detail."""

from __future__ import annotations

import re

CATEGORIES = ("student", "professional", "other")
CATEGORY_LABELS = {"student": "Student", "professional": "Working professional / employee", "other": "Other"}
STUDY_YEARS = ("1st year", "2nd year", "3rd year", "4th year", "5th year", "Postgraduate", "Other")

PURPOSES = {
    "software": "Software development services",
    "ai": "AI & automation solutions",
    "marketing": "Digital marketing services",
    "products": "Business software / SaaS products",
    "training": "Courses and training",
    "career": "Internship / career opportunities",
    "partnership": "Business partnerships / franchise",
    "explore": "Exploring LAX360's products and services",
    "other": "Other",
}

_MOBILE = re.compile(r"^\+?[0-9]{10,15}$")


def normalize_mobile(raw: str) -> str | None:
    """Spaces, dashes, dots and brackets are ignored; `00` means `+`; 10 to 15 digits with an optional leading +. None when it is not a plausible mobile number."""
    value = re.sub(r"[\s\-().]", "", raw or "")
    if value.startswith("00"):
        value = "+" + value[2:]
    return value if _MOBILE.match(value) else None
