"""Registration details (student / working professional / other, mobile, purposes) and the admin's Registered users module: filters, statistics, export, deletion."""

from sqlalchemy import select

from app.models import ContactEnquiry, User, UserProfile
from tests.admin_helpers import staff
from tests.conftest import login, make_user
from tests.test_customers_auth import fresh

BASE = {"full_name": "Riya Sharma", "email": "riya@example.com", "password": "a-long-enough-password", "mobile": "+91 98765-43210", "purposes": ["training", "career"]}
STUDENT = {**BASE, "category": "student", "institution": "Anna University", "course": "B.E.", "department": "Computer Science", "study_year": "3rd year"}
PRO = {**BASE, "email": "pro@example.com", "full_name": "Pat Pro", "category": "professional", "company": "Acme Pvt Ltd", "job_role": "QA Engineer", "industry": "IT services", "experience_years": 4}
OTHER = {**BASE, "email": "oth@example.com", "full_name": "Omar Other", "category": "other", "purposes": ["ai"], "mobile": "9000011111"}


def test_registration_collects_the_details_for_the_chosen_category_and_validates_them(client, db, env):
    env(REGISTER_RATE_LIMIT_MAX="100")
    r = client.post("/api/auth/register", json=STUDENT)
    assert r.status_code == 201 and r.json()["user"]["role"] == "user"
    p = db.scalar(select(UserProfile))
    assert (p.category, p.mobile, p.institution, p.study_year, p.purposes) == ("student", "+919876543210", "Anna University", "3rd year", ["training", "career"])  # mobile stored normalised
    assert client.post("/api/auth/register", json=PRO).status_code == 201
    missing = client.post("/api/auth/register", json={**STUDENT, "email": "m@example.com", "course": None, "institution": None})
    assert missing.status_code == 422 and {"institution", "course"} <= set(missing.json()["error"]["fields"])  # a student must give the student details
    foreign = client.post("/api/auth/register", json={**STUDENT, "email": "f@example.com", "company": "Not a student field"})
    assert foreign.status_code == 422 and "company" in foreign.json()["error"]["fields"]  # and nothing foreign is accepted
    assert client.post("/api/auth/register", json={**OTHER, "other_details": "Freelance designer"}).status_code == 201
    for bad in ({"mobile": "12345"}, {"mobile": "abc"}, {"purposes": []}, {"purposes": ["hacking"]}, {"category": "alien"}):
        r = client.post("/api/auth/register", json={**STUDENT, "email": "bad@example.com", **bad})
        assert r.status_code == 422, bad
    assert db.scalar(select(User.id).where(User.email == "bad@example.com")) is None


def test_a_customer_can_read_and_complete_only_their_own_details(app, db):
    make_user(db, email="old@example.com")  # an account from before registration collected details: no profile
    c = fresh(app)
    csrf = login(c, "old@example.com")
    assert c.get("/api/users/me/profile").json()["category"] is None
    body = {k: v for k, v in STUDENT.items() if k not in ("full_name", "email", "password")}
    assert c.put("/api/users/me/profile", json=body, headers=csrf).status_code == 200
    assert c.get("/api/users/me/profile").json()["institution"] == "Anna University"
    assert fresh(app).get("/api/users/me/profile").status_code == 401  # nobody else's details are reachable


def test_admin_filters_search_stats_and_export(app, db):
    for payload in (STUDENT, PRO, OTHER):
        assert fresh(app).post("/api/auth/register", json=payload).status_code == 201
    make_user(db, email="legacy@example.com", name="Legacy Person")  # an older account: no details
    admin, _, _ = staff(app, db, role="admin", email="support@example.com", permissions=["customers"])
    nobody, _, _ = staff(app, db, role="admin", email="limited@example.com", permissions=["content"])
    s = admin.get("/api/admin/customers/stats").json()
    assert s["total"] == 4 and s["categories"] == {"student": 1, "professional": 1, "other": 1, "not_provided": 1} and s["new"]["today"] == 4
    assert len(s["trend"]) == 30 and s["trend"][-1]["count"] == 4 and sum(d["count"] for d in s["trend"]) == 4
    assert {p["code"]: p["count"] for p in s["purposes"]} == {"training": 2, "career": 2, "ai": 1}  # most common reasons for visiting
    names = lambda q: sorted(u["full_name"] for u in admin.get(f"/api/admin/customers?{q}").json()["items"])  # noqa: E731
    assert names("category=student") == ["Riya Sharma"] and names("category=professional") == ["Pat Pro"] and names("category=none") == ["Legacy Person"]
    assert names("q=9000011111") == ["Omar Other"] and names("q=98765 43210") == ["Pat Pro", "Riya Sharma"]  # a mobile number is found however it was typed
    assert names("company=acme") == ["Pat Pro"] and names("institution=anna") == ["Riya Sharma"] and names("purpose=ai") == ["Omar Other"]
    assert names("registered_from=2999-01-01") == [] and len(names("registered_from=2000-01-01&registered_to=2999-01-01")) == 4
    assert admin.get("/api/admin/customers?purpose=hacking").status_code == 422
    assert nobody.get("/api/admin/customers/stats").status_code == 403 and nobody.get("/api/admin/customers/export").status_code == 403
    r = admin.get("/api/admin/customers/export?category=other")
    assert r.status_code == 200 and "text/csv" in r.headers["content-type"] and "Omar Other" in r.text and "Riya" not in r.text and "attachment" in r.headers["content-disposition"]
    one = admin.get("/api/admin/customers?q=omar").json()["items"][0]["id"]
    assert admin.get(f"/api/admin/customers/{one}").json()["profile"]["mobile"] == "9000011111"


def test_the_export_neutralises_spreadsheet_formulas(app, db):
    assert fresh(app).post("/api/auth/register", json={**OTHER, "full_name": '=HYPERLINK("http://evil")'}).status_code == 201
    admin, _, _ = staff(app, db, role="admin", email="support@example.com", permissions=["customers"])
    assert "'=HYPERLINK" in admin.get("/api/admin/customers/export").text


def test_deleting_an_account_is_super_admin_only_two_step_and_keeps_business_records(app, db):
    c = fresh(app)
    assert c.post("/api/auth/register", json=STUDENT).status_code == 201
    c.post("/api/contact", json={"name": "Riya", "email": "riya@example.com", "phone": "+919566679928", "enquiry_type": "project", "message": "We need a CRM for our team please.", "consent": True, "source": "contact"})
    boss, bcsrf, _ = staff(app, db, role="super_admin", email="boss@example.com")
    support, scsrf, _ = staff(app, db, role="admin", email="support@example.com", permissions=["customers"])
    uid = support.get("/api/admin/customers?q=riya").json()["items"][0]["id"]
    assert support.delete(f"/api/admin/customers/{uid}", headers=scsrf).status_code == 403  # not for ordinary administrators
    assert boss.delete(f"/api/admin/customers/{uid}", headers=bcsrf).json()["error"]["code"] == "deactivate_first"  # step 1 is deactivating
    assert support.patch(f"/api/admin/customers/{uid}", json={"is_active": False}, headers=scsrf).status_code == 200
    assert boss.delete(f"/api/admin/customers/{uid}", headers=bcsrf).status_code == 204
    db.expire_all()
    assert db.scalar(select(User.id).where(User.email == "riya@example.com")) is None and db.scalar(select(UserProfile.user_id)) is None  # account, sessions and details are gone
    assert db.scalar(select(ContactEnquiry.id)) is not None  # the enquiry they sent stays as a business record (unlinked from any account)
    assert boss.get(f"/api/admin/customers/{uid}").status_code == 404
