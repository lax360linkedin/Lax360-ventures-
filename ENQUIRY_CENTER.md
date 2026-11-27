# Enquiry center and Google Sheets

Every website form is saved in the database first. The Enquiry center (Admin > Leads & customers > Enquiry center) groups them into categories; Google Sheets is a second copy for reporting.

## Where each form goes

| Category | Worksheet (default name) | Forms |
| --- | --- | --- |
| General Contact Enquiries | General Enquiries | Contact page "Something else", quote requests |
| Introductory Contact Form Enquiries | Intro Contact Enquiries | The contact card after the intro animation (`source = welcome-card`) |
| Education & Training Enquiries | Education Enquiries | College workshop enquiries |
| Course Enquiries | Course Enquiries | Course enquiries |
| Internship Enquiries | Internship Enquiries | Careers / internship form |
| Digital Marketing Enquiries | Digital Marketing Enquiries | Digital marketing enquiries |
| IT & Software Enquiries | IT & Software Enquiries | Software project, AI, website/app enquiries |
| Franchise / Authorized Partner / Referral Partner Enquiries | Franchise Enquiries / Authorized Partner Enquiries / Referral Partner Enquiries | Partnership applications and the enquiry form on the partnership pages |
| Upcoming Service Enquiries | Upcoming Services | Interest in an upcoming service; also a copy of any partnership application that names an upcoming division |
| Consultation Requests | Consultation Requests | Demo requests; also a copy of any partnership application that requests a consultation |
| Other Enquiries | Other Enquiries | Every other form type |

The routing lives in `backend/app/enquiry_categories.py` (types and sources) and the columns of each worksheet in `backend/app/services/sheets_service.py` (`TAB_COLUMNS`).

## Setup (once)

1. Create a Google service account and a spreadsheet; share the spreadsheet (Editor) with the service account's e-mail.
2. On the server set `GOOGLE_SHEETS_SPREADSHEET_ID` and `GOOGLE_SERVICE_ACCOUNT_JSON` (or `GOOGLE_SERVICE_ACCOUNT_FILE`). The key is never sent to the browser.
3. Run `alembic upgrade head` (migrations 0029 and 0030 add the multi-division fields and the sync log).
4. Admin > Enquiry center > Google Sheets > **Create missing worksheets** (or `python -m app.cli sheets-setup`).

## Managing it

- Worksheet names and on/off per category: Enquiry center > Google Sheets. Renaming starts a new worksheet; rows already copied stay where they are.
- Existing worksheets, headers and data are never changed: rows are only appended.
- Every copy is logged in `sheet_sync` (status, attempts, last error without secrets). A failed copy never affects the visitor; it is retried on the next submission, from **Retry not-yet-copied**, or with `python -m app.cli sheets-sync --all`.
- A sheet row is a snapshot of the submission. Status changes, assignment and notes are made in the admin panel (the database is the source of truth).

## Admin-managed content added in this round

| Feature | Where |
| --- | --- |
| Upcoming service categories and services (status, images, partner availability) | Services > Upcoming service categories / Upcoming services |
| Enquiry form at the bottom of partnership pages (on/off, heading, introduction) | Partnerships > Partnership settings |
| Business divisions in the partnership forms | Partnerships > Navigation menu, and the upcoming service categories |
| Intro contact card (on/off, heading, introduction) | Welcome Experience > Welcome Experience settings |
| Partner "Our Products" list (add, hide, replace) | Services > Partner product list |
| Course list (add, hide, replace) | Services > Education courses |
