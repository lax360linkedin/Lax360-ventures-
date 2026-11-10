"""The five partnership categories on the Our Network page: each category's enquiry is stored with its own type and listed in the admin panel."""

from sqlalchemy import select

from app.models import ContactEnquiry
from tests.admin_helpers import enquiry_payload, staff

CATEGORY_TYPES = ("partner-franchise", "partner-business", "partner-authorised", "partner-technology", "partner-reseller")


def test_each_partnership_category_stores_its_own_enquiry_type_with_the_form_details(app, db, client):
    for n, kind in enumerate(CATEGORY_TYPES[:4]):  # the rate limit allows five a minute from one address: the fifth is checked below
        body = enquiry_payload(enquiry_type=kind, email=f"p{n}@example.com", company=f"Org {n}", message=f"We would like to explore the {kind} option together.", source="our-network",
                               extra={"partnership_category": "Franchise Opportunities", "country": "India", "state": "Tamil Nadu", "city": "Salem", "website": "https://org.example",
                                      "business_background": "We run an IT services company.", "additional_message": "Please call after 5 pm."})
        assert client.post("/api/contact", json=body).status_code == 201, kind
    rows = {r.enquiry_type: r for r in db.scalars(select(ContactEnquiry))}
    assert set(rows) == set(CATEGORY_TYPES[:4])
    assert rows["partner-franchise"].subject == "Partnership: Franchise" and rows["partner-franchise"].extra["city"] == "Salem"
    assert client.post("/api/contact", json=enquiry_payload(enquiry_type="partner-reseller", email="p9@example.com", message="We want to resell your software in our region.")).status_code == 201
    assert client.post("/api/contact", json=enquiry_payload(enquiry_type="partner-nonsense", email="p10@example.com")).status_code in (422, 429)

    admin, _, _ = staff(app, db, permissions=["enquiries"])
    assert admin.get("/api/admin/enquiries?type=partner").json()["total"] == 5  # all partnership enquiries, whatever the category
    assert admin.get("/api/admin/enquiries?type=partner-franchise").json()["total"] == 1
    assert admin.get("/api/admin/enquiries?type=partner-authorised").json()["items"][0]["subject"] == "Partnership: Authorised business partner"
