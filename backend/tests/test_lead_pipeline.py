"""The enquiry form as a lead entry point: structured answers, project documents, and the admin lead pipeline (assign, status, follow-ups, notes, history)."""

from sqlalchemy import select

from app.models import ContactEnquiry, MediaAsset
from tests.admin_helpers import enquiry_payload, staff

PDF = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n"

LEAD = {
    "designation": "Operations Head", "whatsapp": "+919000000009", "contact_method": "whatsapp", "industry": "Healthcare", "company_size": "11–50 people", "business_type": "small",
    "location": "Salem", "website": "https://clinic.example", "service_mains": "ai-solutions,seo", "service_subs": "ai/rag-based-ai-solutions,growth/search-engine-optimization-seo",
    "project_name": "Patient assistant", "project_description": "We want an assistant for patient questions.", "challenges": "Too many repeated calls.", "expected_solution": "Answers from our documents.",
    "budget": "₹2,00,000 – ₹5,00,000", "timeline": "1–3 months", "start_date": "2026-12-01", "referral": "Google search", "meeting_type": "online", "meeting_time": "Weekday mornings",
}


def test_form_options_are_public_and_describe_the_service_hierarchy(client):
    o = client.get("/api/public/contact-options").json()
    mains = {m["value"]: m for m in o["services"]}
    assert len(mains) == 11 and mains["other"]["subs"] == []
    assert any(s["value"] == "ai/rag-based-ai-solutions" for s in mains["ai-solutions"]["subs"])
    assert {b["value"] for b in o["business_types"]} == {"startup", "small", "medium", "enterprise", "individual"}
    assert o["limits"]["files"] == 3


def test_structured_enquiry_is_validated_stored_and_deduplicated(client, db):
    ok = client.post("/api/contact", json=enquiry_payload(enquiry_type="quote", company="Clinic Co", extra=LEAD))
    assert ok.status_code == 201, ok.text
    row = db.scalar(select(ContactEnquiry).where(ContactEnquiry.company == "Clinic Co"))
    assert row.enquiry_type == "quote" and row.extra["service_subs"].startswith("ai/rag") and row.extra["budget"] == "₹2,00,000 – ₹5,00,000"
    from app import contact_catalog

    assert contact_catalog.validate_lead(LEAD) == {}
    for bad in ({"industry": "Space mining"}, {"business_type": "giant"}, {"service_mains": "nope"}, {"service_mains": "seo", "service_subs": "ai/rag-based-ai-solutions"}, {"website": "javascript:alert(1)"}):
        assert contact_catalog.validate_lead({**LEAD, **bad}), bad  # each is rejected (the API answers 422 with these field errors)
    r = client.post("/api/contact", json=enquiry_payload(email="other@example.com", message="A different valid message to avoid duplicates.", extra={**LEAD, "industry": "Space mining"}))
    assert r.status_code == 422 and "industry" in r.json()["error"]["fields"]
    assert client.post("/api/contact", json=enquiry_payload(enquiry_type="quote", company="Clinic Co", extra=LEAD)).json()["duplicate"] is True  # same message again


def test_project_documents_are_private_checked_linked_and_admin_only(app, db, client):
    up = client.post("/api/contact/attachments?filename=brief.pdf", content=PDF, headers={"Content-Type": "application/pdf"})
    assert up.status_code == 201, up.text
    asset_id = up.json()["id"]
    assert client.post("/api/contact/attachments?filename=x.exe", content=b"MZ\x90\x00" + b"0" * 100).status_code == 415  # type is read from the bytes
    assert client.get(f"/api/media/{asset_id}").status_code == 404  # never public
    r = client.post("/api/contact", json=enquiry_payload(company="Docs Ltd", attachments=[asset_id], extra=LEAD))
    assert r.status_code == 201, r.text
    eid = r.json()["id"]
    assert client.post("/api/contact", json=enquiry_payload(email="z@example.com", message="Another message with a made-up attachment id.", attachments=["00000000-0000-0000-0000-000000000000"])).status_code == 422

    anon_admin, _, _ = staff(app, db, permissions=["content"], email="c@example.com")  # staff without enquiry access
    assert anon_admin.get(f"/api/admin/enquiries/{eid}/attachments/{asset_id}").status_code == 403
    admin, csrf, me = staff(app, db, permissions=["enquiries"])
    detail = admin.get(f"/api/admin/enquiries/{eid}").json()
    assert detail["attachments"][0]["filename"] == "brief.pdf" and "attachments" not in detail["extra"] and detail["extra"]["industry"] == "Healthcare"
    got = admin.get(f"/api/admin/enquiries/{eid}/attachments/{asset_id}")
    assert got.status_code == 200 and got.content == PDF and got.headers["content-disposition"].startswith("attachment")
    assert any(h["action"] == "enquiry.attachment_view" for h in admin.get(f"/api/admin/enquiries/{eid}").json()["history"])
    assert admin.delete(f"/api/admin/enquiries/{eid}", headers=csrf).status_code == 204
    assert db.scalar(select(MediaAsset).where(MediaAsset.filename == "brief.pdf")) is None  # the documents go with the enquiry


def test_lead_pipeline_assign_status_followups_notes_history_and_filters(app, db, client):
    first = client.post("/api/contact", json=enquiry_payload(name="Lead One", company="Clinic Co", enquiry_type="quote", extra=LEAD)).json()["id"]
    client.post("/api/contact", json=enquiry_payload(name="Lead Two", email="two@example.com", company="Shop Co", message="Need a simple website for our shop.", extra={"industry": "Retail & E-commerce", "service_mains": "website-development", "service_subs": "software/website-development"}))
    admin, csrf, me = staff(app, db, permissions=["enquiries"])
    for stage in ("contacted", "qualified", "proposal_sent", "negotiation", "converted", "not_interested", "closed"):
        r = admin.patch(f"/api/admin/enquiries/{first}", json={"status": stage, "assigned_to": str(me.id)}, headers=csrf)
        assert r.status_code == 200 and r.json()["status"] == stage, stage
    assert admin.patch(f"/api/admin/enquiries/{first}", json={"status": "won"}, headers=csrf).status_code == 422

    f = admin.post(f"/api/admin/enquiries/{first}/followups", json={"kind": "call", "summary": "Call to discuss scope", "due_on": "2030-01-15"}, headers=csrf)
    assert f.status_code == 201 and f.json()["due_on"] == "2030-01-15" and f.json()["done"] is False
    fid = f.json()["id"]
    assert admin.patch(f"/api/admin/enquiries/{first}/followups/{fid}", json={"done": True}, headers=csrf).json()["done"] is True
    assert admin.post(f"/api/admin/enquiries/{first}/followups", json={"kind": "fax", "summary": "x"}, headers=csrf).status_code == 422
    assert admin.post(f"/api/admin/enquiries/{first}/notes", json={"body": "Sent a proposal."}, headers=csrf).status_code == 201
    detail = admin.get(f"/api/admin/enquiries/{first}").json()
    assert [x["summary"] for x in detail["followups"]] == ["Call to discuss scope"] and detail["notes"][0]["body"] == "Sent a proposal." and detail["assigned_name"]
    actions = {h["action"] for h in detail["history"]}
    assert {"enquiry.update", "enquiry.followup", "enquiry.followup_update", "enquiry.note"} <= actions

    # search and filters over the structured answers
    names = lambda q: sorted(i["name"] for i in admin.get(f"/api/admin/enquiries?{q}").json()["items"])  # noqa: E731
    assert names("q=Clinic") == ["Lead One"] and names("service=ai-solutions") == ["Lead One"] and names("service=software/website-development") == ["Lead Two"]
    assert names("industry=Healthcare") == ["Lead One"] and names("status=closed") == ["Lead One"] and names("status=new") == ["Lead Two"]
    assert admin.get("/api/admin/enquiries?service=../etc").status_code == 422
    assert admin.delete(f"/api/admin/enquiries/{first}/followups/{fid}", headers=csrf).status_code == 204
    assert admin.get(f"/api/admin/enquiries/{first}").json()["followups"] == []
