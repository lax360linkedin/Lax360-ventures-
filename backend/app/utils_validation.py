import re

EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")

LIKE_ESCAPE = "\\"


def like_pattern(term: str) -> str:
    """Contains-pattern for ILIKE with user text: % and _ are literal. Use with `.ilike(pattern, escape=LIKE_ESCAPE)`."""
    esc = LIKE_ESCAPE
    return "%" + term.replace(esc, esc + esc).replace("%", esc + "%").replace("_", esc + "_") + "%"
