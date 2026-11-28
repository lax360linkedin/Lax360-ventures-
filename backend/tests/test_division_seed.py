"""The active service divisions and their sub-services are seeded into the database (Admin > Services > Service divisions / Division sub-services), once, without overwriting edits."""
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.seed_content as sc
from app.db.base import Base
from app.models import ContentItem
from app.service_pages import SERVICE_PAGES
from app.services import content_service as cs


def _db():
    engine = create_engine("sqlite+pysqlite:///:memory:", poolclass=StaticPool, connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine, tables=[ContentItem.__table__])
    return sessionmaker(bind=engine)()


def test_three_divisions_and_all_sub_services_are_seeded_once():
    with _db() as db:
        existing: set = set()
        assert sc.seed_divisions(db, existing) > 50
        assert sc.seed_divisions(db, existing) == 0  # nothing is added twice
        rows = db.scalars(select(ContentItem)).all()
        assert [r.slug for r in rows if r.kind == "division"] == ["software", "growth", "education"]
        software = {r.data["url_slug"] for r in rows if r.kind == "division_service" and r.data["division"] == "software"}
        for slug in ("custom-software-development", "headless-saas-and-api-solutions", "ai-workflow-automations-and-integrations", "software-maintenance-and-support"):
            assert slug in software


def test_every_sub_service_page_is_in_the_service_list_and_the_kinds_exist():
    assert "division" in cs.KINDS and "division_service" in cs.KINDS
    assert ("software/enterprise-software-solutions") in {v for v, _ in SERVICE_PAGES}
