"""Translations: edited per language in the admin panel, served to the website, English when missing."""

from tests.admin_helpers import staff


def public(client, lang):
    return client.get(f"/api/public/translations/{lang}")


def test_admin_saves_updates_and_removes_translations_and_the_website_gets_them(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["content"])
    assert public(client, "ta").json()["strings"] == {}  # nothing saved: the website uses what it ships with, then English
    items = [{"lang": "ta", "source": "Quick   links", "value": "விரைவு இணைப்புகள்"}, {"lang": "hi", "source": "Quick links", "value": "त्वरित लिंक"}]
    r = admin.put("/api/admin/translations", json={"items": items}, headers=csrf)
    assert r.status_code == 200 and r.json() == {"saved": 2, "removed": 0}
    assert public(client, "ta").json()["strings"] == {"Quick links": "விரைவு இணைப்புகள்"}  # whitespace in the English text is collapsed, like the website does
    assert public(client, "hi").json()["strings"] == {"Quick links": "त्वरित लिंक"}  # each language keeps its own
    assert admin.put("/api/admin/translations", json={"items": [{"lang": "ta", "source": "Quick links", "value": "வேகமான இணைப்புகள்"}]}, headers=csrf).json()["saved"] == 1
    assert public(client, "ta").json()["strings"]["Quick links"] == "வேகமான இணைப்புகள்"  # updated in place, not duplicated
    assert admin.put("/api/admin/translations", json={"items": [{"lang": "ta", "source": "Quick links", "value": ""}]}, headers=csrf).json() == {"saved": 0, "removed": 1}
    assert public(client, "ta").json()["strings"] == {}  # an empty translation removes it: the English shows again
    listing = admin.get("/api/admin/translations", params={"lang": "hi"}).json()
    assert listing["strings"] == {"Quick links": "त्वरित लिंक"} and listing["counts"] == {"ta": 0, "hi": 1} and {l["code"] for l in listing["languages"]} == {"ta", "hi"}


def test_unknown_languages_and_bad_input_are_refused_and_permissions_enforced(app, db, client):
    admin, csrf, _ = staff(app, db, permissions=["content"])
    assert public(client, "xx").status_code == 404
    assert admin.get("/api/admin/translations", params={"lang": "fr"}).status_code == 404
    bad = admin.put("/api/admin/translations", json={"items": [{"lang": "en", "source": "Hello", "value": "Hello"}]}, headers=csrf)
    assert bad.status_code == 404  # English is the source language: it is never translated
    assert admin.put("/api/admin/translations", json={"items": [{"lang": "ta", "source": "  ", "value": "x"}]}, headers=csrf).status_code == 422
    assert admin.put("/api/admin/translations", json={"items": [{"lang": "ta", "source": "ok", "value": "x" * 4001}]}, headers=csrf).status_code == 422
    assert public(client, "ta").json()["strings"] == {}  # nothing from a refused request was saved
    media, mcsrf, _ = staff(app, db, email="media-only@example.com", permissions=["media"])
    assert media.put("/api/admin/translations", json={"items": [{"lang": "ta", "source": "a", "value": "b"}]}, headers=mcsrf).status_code == 403
    assert client.put("/api/admin/translations", json={"items": []}).status_code in (401, 403, 422)


def test_texts_of_published_admin_content_are_listed_for_translation(app, db):
    from app.models import ContentItem

    admin, _, _ = staff(app, db, permissions=["content"])
    db.add_all([
        ContentItem(kind="article", slug="a1", title="Plan the first month", status="published", data={"summary": "A short guide for new teams.", "image": "https://example.com/a.png", "slug": "plan", "tags": ["Planning", "ok"]}),
        ContentItem(kind="article", slug="a2", title="A draft nobody sees", status="draft", data={"summary": "Hidden draft text."}),
    ])
    db.commit()
    got = admin.get("/api/admin/translations/content-strings").json()["strings"]
    texts = {g["s"] for g in got}
    assert {"Plan the first month", "A short guide for new teams.", "Planning"} <= texts
    assert "Hidden draft text." not in texts and not any(t.startswith("http") for t in texts)  # only published text; links are not translatable
    assert all(g["kind"] == "article" for g in got)
