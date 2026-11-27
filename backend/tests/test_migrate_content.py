"""Moving the built-in content into the database: complete, idempotent, never overwrites an edit, and backed up first. In-memory SQLite (no PostgreSQL needed)."""

import json

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import seed_content as sc
from app.db.base import Base
from app.models import ContentItem, MediaAsset, PartnershipPage, SiteSetting, User
from app.services import content_service as cs


@pytest.fixture
def db():
    engine = create_engine("sqlite+pysqlite:///:memory:", poolclass=StaticPool, connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine, tables=[User.__table__, MediaAsset.__table__, ContentItem.__table__, SiteSetting.__table__, PartnershipPage.__table__])
    with sessionmaker(bind=engine, expire_on_commit=False)() as s:
        yield s
    engine.dispose()


def run(db):
    existing = {(i.kind, i.slug) for i in db.scalars(select(ContentItem))}
    n = sc.seed_network(db, existing) + sc.seed_upcoming(db, existing) + sc.seed_courses(db, existing) + sc.seed_hero(db, existing) + sc.seed_partner_products(db, existing) + sc.seed_partnership_pages(db)
    for d in ("network", "upcoming", "courses", "partner-products"):
        sc.mark(db, existing, d)
    db.commit()
    return n


def count(db, kind):
    return len(db.scalars(select(ContentItem).where(ContentItem.kind == kind)).all())


def test_the_public_content_is_all_in_the_database_after_the_migration(db):
    run(db)
    assert count(db, "network_partner") == 7 and count(db, "software_product") == 7 and count(db, "network_page") == 1
    names = {i.title for i in db.scalars(select(ContentItem).where(ContentItem.kind == "network_partner"))}
    assert names == {"Fatcat Wealthy", "Marg ERP", "Zoho", "HexBis", "OpenAI", "ShieldByte InfoSec", "CADPOINT Salem Branch"}
    assert count(db, "upcoming_category") == 3 and count(db, "upcoming_service") == 6 and count(db, "education_course") == 53
    assert {i.slug for i in db.scalars(select(ContentItem).where(ContentItem.kind == "content_seed"))} == {"network", "upcoming", "courses", "partner-products"}
    cad = db.scalar(select(ContentItem).where(ContentItem.kind == "network_partner", ContentItem.slug == "cadpoint-salem"))
    assert cad.data["category"] == "education" and cad.data["verification"] == "verified" and cad.data["website_link"] == "https://www.cadpoint.co.in/" and cad.status == "published"
    marg = db.scalar(select(ContentItem).where(ContentItem.kind == "network_partner", ContentItem.slug == "marg-erp"))
    assert marg.data["established_via"] == "Fatcat Wealthy" and "billing" in marg.data["products"]


def test_running_it_again_adds_nothing_and_never_overwrites_an_edit(db):
    first = run(db)
    zoho = db.scalar(select(ContentItem).where(ContentItem.kind == "network_partner", ContentItem.slug == "zoho"))
    zoho.data = {**zoho.data, "description": "Edited by an administrator"}
    gone = db.scalar(select(ContentItem).where(ContentItem.kind == "network_partner", ContentItem.slug == "hexbis"))
    db.delete(gone)
    db.commit()
    again = run(db)
    assert first == 77 + 1 + 67 + 12 and again == 1  # only the deleted HexBis is added back by a re-run; everything else is untouched
    db.expire_all()
    assert db.scalar(select(ContentItem).where(ContentItem.slug == "zoho", ContentItem.kind == "network_partner")).data["description"] == "Edited by an administrator"


def test_the_seeded_items_are_valid_for_the_admin_forms(db):
    run(db)
    for kind in ("network_partner", "upcoming_category", "upcoming_service", "education_course", "network_page"):
        for item in db.scalars(select(ContentItem).where(ContentItem.kind == kind)):
            title, clean = cs._validate(db, kind, item.title, {k: v for k, v in item.data.items() if k in {f["name"] for f in cs.KINDS[kind]["fields"]}})
            assert title


def test_a_backup_of_the_existing_content_is_written_first(db, tmp_path, monkeypatch):
    monkeypatch.setattr(sc, "BACKUPS", tmp_path)
    run(db)
    path = sc.backup(db)
    saved = json.loads(path.read_text(encoding="utf8"))
    assert len(saved["content_items"]) == db.scalar(select(__import__("sqlalchemy").func.count()).select_from(ContentItem)) and path.parent == tmp_path


def test_the_hero_partner_product_lists_and_partnership_pages_are_in_the_database(db):
    run(db)
    hero = db.scalar(select(ContentItem).where(ContentItem.kind == "hero"))
    assert hero.data["headline_2"] == "automate and grow" and hero.data["cta_primary_link"] == "/contact?type=project"
    products = db.scalars(select(ContentItem).where(ContentItem.kind == "partner_product")).all()
    by = {}
    for p in products:
        by.setdefault(p.data["program"], []).append(p.title)
    assert set(by) == {"franchise", "authorized-partner", "referral-partner"} and "Business CRM" in by["franchise"] and len(by["franchise"]) == 21 and len(by["referral-partner"]) == 23
    pages = {p.slug: p.content for p in db.scalars(select(PartnershipPage))}
    assert len(pages) == 12 and pages["franchise/education"]["hero_heading"] == "Open a LAX360 Education training centre." and pages["franchise"]["hero_heading"].startswith("Franchise Opportunities:")
