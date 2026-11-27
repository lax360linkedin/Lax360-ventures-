"""Custom themes (admin Theme builder): the stored definitions are validated; nothing but known keys and HEX colours is kept."""
import json

import pytest

from app.services.settings_service import _validate, clean_custom_themes

GOOD = {"id": "custom-ocean", "name": "Ocean night", "mode": "both", "colors": {"bg": "#FFFFFF", "accent": "#0A66C2", "text": "#112233"}, "darkColors": {"bg": "#0b1220", "accent": "#5eb1ff"}}


def test_valid_theme_is_cleaned_and_lowercased():
    out = clean_custom_themes(json.dumps([GOOD]))
    assert out[0]["colors"] == {"bg": "#ffffff", "accent": "#0a66c2", "text": "#112233"} and out[0]["mode"] == "both"


@pytest.mark.parametrize("change", [
    {"id": "ocean"}, {"id": "custom-Ocean"}, {"name": ""}, {"mode": "neon"},
    {"colors": {"bg": "white", "accent": "#0a66c2"}}, {"colors": {"bg": "#ffffff", "accent": "#0a66c2", "url": "#000000"}},
    {"colors": {"accent": "#0a66c2"}}, {"colors": {"bg": "#fff", "accent": "#0a66c2"}}, {"colors": {"bg": "#ffffff"}},
])
def test_invalid_themes_are_rejected(change):
    with pytest.raises(ValueError):
        clean_custom_themes(json.dumps([{**GOOD, **change}]))


def test_duplicate_ids_bad_json_and_limit():
    with pytest.raises(ValueError):
        clean_custom_themes(json.dumps([GOOD, GOOD]))
    with pytest.raises(ValueError):
        clean_custom_themes("{not json")
    with pytest.raises(ValueError):
        clean_custom_themes(json.dumps([{**GOOD, "id": f"custom-t{i}"} for i in range(41)]))


def test_setting_accepts_empty_to_clear_and_a_list():
    assert _validate("custom_themes", "") is None
    assert _validate("custom_themes", json.dumps([GOOD]))[0]["id"] == "custom-ocean"
    assert _validate("site_theme", "custom-ocean") == "custom-ocean"
    assert _validate("site_theme", "preset-royal-blue") == "preset-royal-blue"


def test_primary_colour_alone_is_enough():
    out = clean_custom_themes(json.dumps([{**GOOD, "colors": {"bg": "#ffffff", "primary": "#c2185b"}}]))
    assert out[0]["colors"]["primary"] == "#c2185b"
