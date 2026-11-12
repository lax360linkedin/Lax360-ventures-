"""The temporary sample team profiles: fictional, flagged, valid, with portraits that exist."""

import os

from app import seed_team_samples as seed
from app.services import content_service as cs


def test_sample_team_is_one_founder_plus_employees_all_flagged_and_valid(db):
    rows = seed.rows()
    assert len(rows) == 6 and len({r["slug"] for r in rows}) == 6
    assert [r["data"]["role_level"] for r in rows].count("founder") == 1  # the founder is ONE person
    here = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public")
    for r in rows:
        assert r["data"]["sample"] is True and "fictional" in r["data"]["photo_alt"].lower()  # never presented as a real employee
        cs._validate(db, "team_member", r["title"], dict(r["data"]))
        assert os.path.exists(os.path.join(here, r["data"]["photo_path"].lstrip("/")))
    assert not any(k in r["data"] for r in rows for k in ("linkedin_link", "email", "phone"))  # no contact details


def test_photo_path_must_be_a_built_in_team_picture(db):
    import pytest

    from app.core.errors import ApiError

    ok = {"designation": "Engineer", "photo_path": "/assets/team/sample-1.webp"}
    cs._validate(db, "team_member", "A", ok)
    for bad in ("/etc/passwd", "https://evil.example/x.png", "/assets/carousel/sample-1.webp"):
        with pytest.raises(ApiError):
            cs._validate(db, "team_member", "A", {**ok, "photo_path": bad})
