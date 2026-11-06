import csv
import io
import uuid
from datetime import date, timedelta

from sqlalchemy import select, text

from app.models import AuditLog, ContactEnquiry
from tests.admin_helpers import staff, submit_enquiry


def make_set(client):
    return {
        "ada": submit_enquiry(client, name="Ada Lovelace", email="ada@example.com", phone="+919000000001", message="Looking for an ERP system for our factory, please call."),
        "bob": submit_enquiry(client, name="Bob Builder", email="bob@acme.io", phone="+919000000002", enquiry_type="general", message="Need drawings prepared from sketches, urgent request."),
        "cy": submit_enquiry(client, name="Cy 100%_Real", email="cy@example.com", phone="+919000000003", enquiry_type="course", message="Interested in the Python with AI course for students."),
    }


def test_list_search_filter_sort_and_paginate(app, db, client):
    ids = make_set(client)
    admin, csrf, _ = staff(app, db, permissions=["enquiries"])
    data = admin.get("/api/admin/enquiries").json()
    assert data["total"] == 3 and data["page"] == 1 and len(data["items"]) == 3
    assert {i["status"] for i in data["items"]} == {"new"}
    # search: name, email, phone, subject
    assert [i["name"] for i in admin.get("/api/admin/enquiries?q=lovelace").json()["items"]] == ["Ada Lovelace"]
    assert [i["name"] for i in admin.get("/api/admin/enquiries?q=ACME.io").json()["items"]] == ["Bob Builder"]
    assert [i["name"] for i in admin.get("/api/admin/enquiries?q=9000000003").json()["items"]] == ["Cy 100%_Real"]
    assert [i["name"] for i in admin.get("/api/admin/enquiries?q=course").json()["items"]] == ["Cy 100%_Real"]  # subject
    # LIKE wildcards in the search box are literal, not patterns
    assert admin.get("/api/admin/enquiries?q=%25").json()["total"] == 1
    assert admin.get("/api/admin/enquiries?q=_").json()["total"] == 1
    # status + date filters
    assert admin.patch(f"/api/admin/enquiries/{ids['ada']}", json={"status": "contacted"}, headers=csrf).status_code == 200
    assert admin.get("/api/admin/enquiries?status=contacted").json()["total"] == 1
    today = date.today().isoformat()
    assert admin.get(f"/api/admin/enquiries?from={today}&to={today}").json()["total"] == 3
    assert admin.get(f"/api/admin/enquiries?to={(date.today() - timedelta(days=1)).isoformat()}").json()["total"] == 0
    # sort + pagination
    names = [i["name"] for i in admin.get("/api/admin/enquiries?sort=name&order=asc").json()["items"]]
    assert names == sorted(names)
    page = admin.get("/api/admin/enquiries?sort=name&order=asc&page=2&page_size=2").json()
    assert page["total"] == 3 and page["pages"] == 2 and len(page["items"]) == 1
    assert admin.get("/api/admin/enquiries?status=bogus").status_code == 422
    assert admin.get("/api/admin/enquiries?page_size=1000").status_code == 422


def test_detail_status_assignment_and_notes(app, db, client):
    eid = submit_enquiry(client)
    admin, csrf, me = staff(app, db, permissions=["enquiries"], name="Asha Admin")
    detail = admin.get(f"/api/admin/enquiries/{eid}").json()
    assert detail["message"].startswith("We need a CRM") and detail["notes"] == [] and detail["created_at"] and detail["updated_at"]

    r = admin.patch(f"/api/admin/enquiries/{eid}", json={"status": "in_progress", "assigned_to": str(me.id)}, headers=csrf)
    assert r.status_code == 200 and r.json()["status"] == "in_progress" and r.json()["assigned_name"] == "Asha Admin"
    assert admin.patch(f"/api/admin/enquiries/{eid}", json={"status": "spam"}, headers=csrf).status_code == 422
    assert admin.patch(f"/api/admin/enquiries/{eid}", json={"assigned_to": str(uuid.uuid4())}, headers=csrf).status_code == 422
    # explicit null un-assigns, omitting leaves it alone
    assert admin.patch(f"/api/admin/enquiries/{eid}", json={"status": "converted"}, headers=csrf).json()["assigned_to"] == str(me.id)
    assert admin.patch(f"/api/admin/enquiries/{eid}", json={"assigned_to": None}, headers=csrf).json()["assigned_to"] is None

    n = admin.post(f"/api/admin/enquiries/{eid}/notes", json={"body": "Called, will send a quote on Monday."}, headers=csrf)
    assert n.status_code == 201 and n.json()["author"] == "Asha Admin"
    assert admin.post(f"/api/admin/enquiries/{eid}/notes", json={"body": "   "}, headers=csrf).status_code == 422
    assert [x["body"] for x in admin.get(f"/api/admin/enquiries/{eid}").json()["notes"]] == ["Called, will send a quote on Monday."]
    assert admin.get(f"/api/admin/enquiries/{uuid.uuid4()}").status_code == 404


def test_an_admin_without_the_enquiries_permission_cannot_be_assigned_work(app, db, client):
    eid = submit_enquiry(client)
    admin, csrf, _ = staff(app, db, permissions=["enquiries"], email="a1@example.com")
    _, _, other = staff(app, db, permissions=["content"], email="a2@example.com")
    r = admin.patch(f"/api/admin/enquiries/{eid}", json={"assigned_to": str(other.id)}, headers=csrf)
    assert r.status_code == 422 and "assigned_to" in r.json()["error"]["fields"]
    assert [a["name"] for a in admin.get("/api/admin/enquiries/assignees").json()] == ["Admin"]


def test_archive_hides_from_the_default_list_and_delete_is_permanent(app, db, client):
    eid = submit_enquiry(client)
    admin, csrf, _ = staff(app, db, permissions=["enquiries"])
    assert admin.post(f"/api/admin/enquiries/{eid}/archive", headers=csrf).status_code == 200
    assert admin.get("/api/admin/enquiries").json()["total"] == 0
    assert admin.get("/api/admin/enquiries?archived=only").json()["total"] == 1
    assert admin.get("/api/admin/enquiries?archived=all").json()["total"] == 1
    assert admin.post(f"/api/admin/enquiries/{eid}/archive?archived=false", headers=csrf).status_code == 200
    assert admin.get("/api/admin/enquiries").json()["total"] == 1
    assert admin.delete(f"/api/admin/enquiries/{eid}").status_code == 403  # CSRF
    assert admin.delete(f"/api/admin/enquiries/{eid}", headers=csrf).status_code == 204
    assert admin.get(f"/api/admin/enquiries/{eid}").status_code == 404
    assert db.scalar(select(ContactEnquiry.id)) is None


def test_csv_export_respects_filters_and_neutralises_formulas(app, db, client):
    submit_enquiry(client, name="=HYPERLINK(\"http://evil\")", email="x@example.com", message="A formula in the name field should not execute in Excel.")
    submit_enquiry(client, name="Normal Person", email="n@example.com", message="A perfectly normal enquiry message for the export test.")
    admin, csrf, _ = staff(app, db, permissions=["enquiries"])
    r = admin.get("/api/admin/enquiries/export.csv")
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/csv") and "attachment" in r.headers["content-disposition"]
    rows = list(csv.reader(io.StringIO(r.text)))
    assert rows[0][:5] == ["Created", "Updated", "Status", "Name", "Email"] and len(rows) == 3
    names = {row[3] for row in rows[1:]}
    assert "'=HYPERLINK(\"http://evil\")" in names and "Normal Person" in names  # leading = is neutralised
    filtered = list(csv.reader(io.StringIO(admin.get("/api/admin/enquiries/export.csv?q=normal").text)))
    assert len(filtered) == 2
    assert db.scalar(select(AuditLog.id).where(AuditLog.action == "enquiry.export")) is not None


def test_enquiry_actions_are_audited_without_personal_data(app, db, client):
    eid = submit_enquiry(client, name="Private Person", message="Sensitive message text that must never be copied into logs.")
    admin, csrf, _ = staff(app, db, permissions=["enquiries"], email="auditme@example.com")
    admin.patch(f"/api/admin/enquiries/{eid}", json={"status": "contacted"}, headers=csrf)
    admin.post(f"/api/admin/enquiries/{eid}/notes", json={"body": "Secret internal note body"}, headers=csrf)
    admin.delete(f"/api/admin/enquiries/{eid}", headers=csrf)
    logs = db.scalars(select(AuditLog).where(AuditLog.action.like("enquiry.%")).order_by(AuditLog.created_at)).all()
    assert [l.action for l in logs] == ["enquiry.update", "enquiry.note", "enquiry.delete"]
    dump = str([(l.detail, l.resource_id, l.admin_email) for l in logs])
    assert "Private Person" not in dump and "Sensitive message" not in dump and "Secret internal note" not in dump
    assert all(l.admin_email == "auditme@example.com" and l.status == "success" for l in logs)


def test_public_contact_form_still_works_and_is_stored_for_the_admin(app, db, client):
    eid = submit_enquiry(client)
    admin, _, _ = staff(app, db, permissions=["enquiries"])
    row = admin.get(f"/api/admin/enquiries/{eid}").json()
    assert row["status"] == "new" and row["subject"] == "Software project" and row["email"] == "grace@example.com"
    assert db.execute(text("select count(*) from contact_enquiries")).scalar() == 1
