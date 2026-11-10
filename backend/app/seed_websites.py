"""The website portfolio (`python -m app.cli seed-websites`): every entry of "Explore Our Websites", loaded into the CMS so it is managed in the admin panel.

What is written here comes from inspecting each LIVE website (its pages, menus, headings, forms and files) and the web addresses supplied by LAX360. Only things seen on
the site are described: nothing is assumed about how a site works behind the scenes, so admin panels, databases and the type of site (static / dynamic / web app) are left
empty unless confirmed (the two Luxury Jewellery demos are named Static / Dynamic by LAX360). Screenshots are real captures of the live sites (frontend/public/assets/websites/).
Two entries have no web address yet; an administrator adds it in the admin panel, and no link is invented.
"""

from __future__ import annotations

W = "/assets/websites/"


def shots(key: str, n: int) -> str:
    names = [f"{key}.jpg"] + [f"{key}-{i}.jpg" for i in range(2, n + 1)]
    return "\n".join(W + x for x in names)


def mobile(key: str) -> str:
    return W + f"{key}-mobile.jpg"


VITE = "Built with Vite (a production build was detected in the site's files)"
NEXT = "Built with Next.js (detected in the site's files)"
VERCEL = "Hosted on Vercel (from the web address)"
NETLIFY = "Hosted on Netlify (from the web address)"

# slug: (title, category, entry_kind, website_type, url, shots, summary, overview, features, modules, technologies)
ENTRIES = [
    ("cadpoint", "CADPOINT", "Training & Education", "company", "", "https://www.cadpoint.co.in/", 1,
     "Website of the CADPOINT Authorized Training Centre: course areas, registration and contact.",
     "The CADPOINT website presents the training centre and its course areas: IT, AI, digital marketing, multimedia, engineering and more. Visitors can browse the programme areas, register and contact the centre.",
     "Main menu: Home, About, Services, Courses, Ecosystem and Contact, with a Register Now button.\nAdmissions banner: \"Admissions Open 2026\" appears in the header.\nHero actions: Explore Courses and Contact Us.\nContact details: phone number and email address in the page header.\nA form with input fields for registration or enquiries.",
     "Course departments: lists the programme areas, including Artificial Intelligence, Software Development, Cloud Computing, Cyber Security, Data Science, Finance & Accounting, Digital Marketing, Multimedia & Design, CADD Engineering and Automation & RPA.\nIT & Non-IT career programs: a department card for career courses such as Python, full-stack web development and data analytics.\nCreative department: multimedia, AR and VR development.\nRegistration / contact: a form and a Register Now button.",
     [VITE]),
    ("sdphysiocare", "SDphysiocare", "Healthcare", "client", "", "https://www.sdphysiocare.com/", 3,
     "Physiotherapy clinic website with services, an about section and an appointment form.",
     "A website for SD PhysioCare, a physiotherapy practice. It introduces the clinic and its founder, lists the services and lets visitors book an appointment.",
     "Main menu: Home, About, Services, Booking and Contact, with a menu button on small screens.\nHero actions: Book Appointment and Our Services.\nAbout section describing the clinic's approach and its founder.\nA booking form with input fields.\nPatient-count highlight (\"1000+ Patients Treated\") as stated by the clinic.",
     "Home: hero with the clinic's message and the two main actions.\nAbout: the clinic's approach to treatment and its founder.\nServices: the physiotherapy services offered.\nBooking: an appointment form.\nContact: how to reach the clinic.",
     [VITE]),
    ("devs-clinic", "Devs Clinic", "Healthcare", "client", "", "https://www.devshairandskincare.com/", 2,
     "Hair and skin clinic website with treatments, specialists and a consultation request form.",
     "A website for Devs Hair and Skin Clinic in Erode. It presents the clinic, its specialists and treatments, and asks new visitors to request a free consultation.",
     "Welcome pop-up with a consultation request form: name, phone, email, primary concern (a list of skin and hair concerns) and preferred date, with an option to skip and explore the website.\nMain menu: Home, About, Specialists, Services, Treatments and Contact, with a Book Consultation button.\nAbout section with the clinic's mission and vision.\nA free skin analysis call to action.\nSpecialist profiles for the dermatologist and hair specialist.\nPrivacy Notice link.",
     "Consultation request: the pop-up form and the Book Consultation button.\nAbout: introduction, mission and vision.\nSpecialists: the clinic's dermatologist and hair specialist.\nServices and Treatments: the hair, skin and laser treatments offered.\nContact.",
     [VITE]),
    ("fatcat-wealthy", "FatCat Wealthy", "Finance", "client", "", "https://www.fatcatwealthy.com/", 3,
     "Financial education and investment services website with a services menu and enquiry form.",
     "The FatCat Wealthy website presents financial education and investment services: mutual funds, insurance, broking, loans and an academy. Visitors can browse the services and send an enquiry.",
     "Main menu: Home, About Us, Services (with a dropdown), Academy, Business, Career, Zoho Partner, Contact Us and Login.\nServices dropdown: Investment Broking, Mutual Fund, Stock Broking, Insurance and Loans.\nWhat We Offer: Mutual Funds (SIPs, goal-based planning, STP and SWP strategies) and Insurance Services (including health insurance).\nEnquiry form with name, email, mobile number, address and message fields.\nLogin link.",
     "Services overview: all services with a View All Services link.\nMutual Funds: SIPs, goal-based planning and STP / SWP strategies.\nInsurance Services: insurance protection options.\nAcademy and Business sections in the main menu.\nCareer and Contact pages.\nEnquiry form.",
     []),
    ("aether-fitness", "AETHER FITNESS", "Gym & Fitness", "demo", "", "https://gym-web-nine-phi.vercel.app/", 3,
     "Demo website for a premium gym: programmes, trainers, memberships and gallery.",
     "A demonstration website for an athletic club. It combines a bold hero, a scrolling offers banner, programme and trainer sections and membership calls to action.",
     "Main menu: Home, About, Programs, Trainers, Membership, Gallery and Contact, with a Join Now button.\nHero actions: Explore Memberships and View Programs.\nHighlight counters (24/7 access, coaches, arena size and active members).\nScrolling promotional banner across the page.\nBranding: AETHER FIT, Athletic Performance.",
     "Hero: headline, counters and the two main actions.\nPrograms and Trainers: the classes and coaches.\nMembership: the membership options.\nGallery.\nContact.",
     [VITE, VERCEL]),
    ("haute-cuisine", "Haute Cuisine Indienne & Royal Dining", "Restaurant & Hospitality", "demo", "", "https://food-hotel-demo-web.vercel.app/", 2,
     "Demo website for a fine-dining Indian restaurant with menu, story, gallery and table booking.",
     "A cinematic demonstration website for a premium Indian dining brand. A scroll-driven opening leads into the menu, the restaurant's story and booking actions.",
     "Main menu: Home, About, Menu, Story, Gallery and Contact.\nBook Table and Order Now buttons in the header.\nScroll-driven storytelling section (\"Scroll To Assemble\").\nHero actions: Explore Our Menu and Reserve A Table.\nSections on cooking methods and ingredients.\nForms with input fields.",
     "Hero: the brand message with Explore Our Menu and Reserve A Table.\nMenu.\nStory: \"The Spice Royale Legacy\" and the culinary craft sections.\nGallery.\nBook Table and Order Now.\nContact.",
     [NEXT, VERCEL]),
    ("tiny-titans", "Tiny Titans", "Kindergarten", "demo", "", "https://tiny-titans-school.netlify.app/", 3,
     "Demo website for a kindergarten with programmes, teachers, admissions and quick contact options.",
     "A friendly demonstration website for the Tiny Titans Kindergarten. It introduces the school, its programmes and teachers and makes it easy to call or message on WhatsApp.",
     "Main menu: Home, About Us, Programs, Admissions, Gallery and Contact, with a slide-out menu on small screens.\nChat on WhatsApp link and a call link with the phone number.\nProgrammes: Play School, Pre-KG and Junior-KG, among others.\nDay-care section for working parents.\nCore values and a Meet Our Teachers section.\nContact email address.",
     "Welcome: introduction to the kindergarten.\nAbout Our School and Core Values.\nDay care.\nMeet Our Teachers.\nEducational Programs.\nAdmissions, Gallery and Contact.",
     [NETLIFY]),
    ("ironlinebuild", "IronlineBuild", "Construction", "demo", "", "https://immersive-build-gallery.lovable.app/", 2,
     "Demo website for a construction company with services, projects, process and quotes.",
     "A demonstration website for a civil and structural contractor. It lists the construction disciplines, recent builds and the way the company works, with prominent quote and consultation actions.",
     "Main menu: Home, About, Services, Projects, Gallery, Process, Testimonials, FAQ and Contact, with a Get a Quote button.\nSix services: Residential, Commercial and Industrial Construction, Renovation & Remodelling, Civil Works and Project Management.\nRecent builds section.\nFour written promises (safety-led sites, transparent BOQ, on-time handover and a warranty).\nCalls to action: Start Your Project, See Our Work and Book a Consultation.",
     "Hero and key figures.\nWho we are.\nWhat we do: the six disciplines.\nRecent builds.\nProcess, Testimonials and FAQ.\nContact: Get a Quote and Book a Consultation.",
     [VITE, "Created with Lovable (the page shows an \"Edit with Lovable\" badge)", "Hosted on lovable.app (from the web address)"]),
    ("construction-demo-2", "Construction Website Demo 2", "Construction", "demo", "", "https://construction-website-rho-hazel.vercel.app/", 2,
     "Second construction demo: services, projects, FAQ, careers and a blog.",
     "A demonstration website for a commercial and industrial construction group. It covers services, featured projects, client logos, frequently asked questions and careers.",
     "Main menu: Home, About, Services, Projects, Gallery, Careers, Blog and Contact, with a phone number and a Get a Quote button.\nSix services: Commercial, Industrial & Manufacturing, Residential, Design-Build, Renovation & Retrofit and Pre-Construction.\nFeatured projects with a View full portfolio link.\nWhy choose us points: on-time delivery, safety culture, budget certainty and in-house expertise.\nClient logo strip and a frequently asked questions section.\nStart Your Project call to action.",
     "Home: hero and key figures.\nServices: the six services.\nWhy choose us.\nProjects.\nTrusted-by logos.\nFAQ.\nContact.",
     [VITE, VERCEL]),
    ("buildcore", "BuildCore Construction", "Construction", "demo", "", "https://buildcore-construction.ai.studio/", 2,
     "Construction company demo with services, projects, gallery, process and a quote form.",
     "A demonstration website for BuildCore Construction. It explains the company, its values and services and invites visitors to request a quote.",
     "Main menu: Home, About, Services, Projects, Gallery, Process and Contact, with a Get a Quote button.\nHero actions: View Our Work and Our Services.\nKey figures (years of experience, projects, awards and team).\nCore values: integrity, excellence and safety first.\nA quote form with input fields.",
     "Hero: Solid Foundations. Enduring Structures.\nAbout.\nCore values.\nServices and Projects.\nGallery and Process.\nContact: the quote form.",
     ["Google AI Studio app (the page title is \"My Google AI Studio App\" and it is hosted on ai.studio)", VITE]),
    ("cop-mens-wear", "COP MENS WEAR", "E-commerce", "demo", "", "https://consmenswear.ai.studio/", 3,
     "Men's fashion store demo with categories, new arrivals, offers and sign-in.",
     "A demonstration online store for a men's fashion brand: shop by category, new arrivals with prices and offer tags, collections and a sign-in link.",
     "Main menu: Home, Shop, New Arrivals, Offers, About and Contact, with Sign In.\nSeven categories: Shirts, T-Shirts, Hoodies & Sweatshirts, Jackets & Blazers, Trousers & Pants, Jeans & Denim and Accessories.\nNew Arrivals product cards with offer tags and a 3D View label.\nSpotlight Collection and Urban Essentials collection sections.\nSpecial promotion section.",
     "Hero: Define your presence with elegance, with Shop Collection and Explore New Arrivals.\nShop by Category.\nNew Arrivals.\nCollections.\nPromotion.\nAbout, Contact and Sign In.",
     ["Google AI Studio app (hosted on ai.studio, from the web address)", VITE]),
    ("e-commerce-demo-2", "E-commerce Demo 2", "E-commerce", "demo", "", "https://e-commerce-mu-five-15.vercel.app/", 2,
     "Multi-category marketplace demo with a bag, saved items, account and light / dark mode.",
     "A demonstration marketplace that sells across departments. Visitors browse categories, see product tiles with prices, and use a bag, saved items and an account area.",
     "Main menu: Home, Shop, Collections, About and Contact.\nAccount, Saved and Bag links with a bag count.\nSwitch between light and dark mode.\nFive departments: Fashion, Furniture, Electronics, Medicines and Cosmetics.\nProduct tiles with ratings and prices.\nShop Now and Explore Categories calls to action.",
     "Hero: Everything you need, all in one place.\nCore departments.\nFeatured products.\nBag and Saved items.\nAccount.\nAbout and Contact.",
     [VITE, VERCEL]),
    ("hospital-management-demo", "Hospital Management Website Demo", "Hospital", "demo", "", "https://hospital-web-frontend.vercel.app/", 3,
     "Multi-specialist hospital demo: specialities, doctors, services, facilities and appointment calls to action.",
     "A demonstration website for a multi-specialist hospital. It covers the hospital's specialities, doctors, services and facilities, with appointment and doctor-search actions.",
     "Main menu: Home, About, Specialities, Doctors, Services, Facilities, Health Packages and Contact Us, with an emergency phone number and a Book Appointment button.\nSpecialities menu: Cardiology, Neurology, Orthopaedics, Paediatrics and Dermatology.\nDoctors menu: Our Doctors and Find a Doctor.\nServices menu: Emergency Care, Diagnostic Services, Pharmacy and Ambulance Services.\nFacilities menu: Hospital Infrastructure and ICU & Critical Care.\nHero actions: Book an Appointment and Find a Doctor.\nHighlights for doctors, specialities and emergency care.",
     "Hero: Advanced Care. Compassionate Healing.\nAbout and Why Choose Us.\nSpecialities.\nDoctors: Explore Our Doctors and Find a Doctor.\nServices.\nFacilities and infrastructure.\nHealth Packages.\nContact.",
     [VITE, VERCEL]),
    ("lax360-real-estate", "LAX360 Real Estate", "Real Estate", "demo", "", "https://demo-real-estate-five.vercel.app/", 2,
     "Luxury real estate demo with featured properties, a 3D model, advisory services and enquiries.",
     "A demonstration website for a luxury real estate advisory. It features properties, a 3D architectural model, the advisory services and ways to enquire.",
     "Main menu: Home, About, Properties, Projects, Locations, Blog, Testimonials and Contact, with a Book Viewing button.\nFeatured properties and enclaves, such as The Obsidian Pavilion and The Waterfront Sky Penthouse.\n3D architectural model section.\nAdvisory services: private acquisitions, editorial sales campaigns, off-market placements, boutique project marketing and relocation & concierge.\nMaterials inspector section.\nDirect phone line and enquiry email address.\nSkip to content link.",
     "Hero.\nFeatured Works & Current Enclaves.\n3D Architectural Model.\nAdvisory services.\nMaterials.\nProperties, Projects and Locations pages.\nBlog and Testimonials.\nContact: Book Viewing.",
     [VITE, VERCEL]),
    ("event-management-demo", "Event Management Website Demo", "Event Management", "demo", "", "", 0,
     "Demo website for event management businesses. The live website link will be added soon.",
     "A demonstration website for event management businesses is planned. Its live website address has not been supplied yet; it will appear here, with the details of its pages, once it is available.",
     "", "", []),
    ("apex-institute-of-technology-science", "Apex Institute of Technology & Science", "College & Education", "demo", "", "https://college-web-phi.vercel.app/", 3,
     "College demo website with courses, admissions, placements, news and events.",
     "A demonstration website for an engineering and arts college. It covers programmes, admissions, facilities, placements, news and events.",
     "Main menu: Home, About Us, Courses, Admissions, Facilities, Placements, Gallery, News & Events, Careers and Contact Us, with an Apply Now button.\nHero video background and an Explore Courses action.\nFuture-ready undergraduate and postgraduate programmes (B.Tech in Computer Science & Engineering, Artificial Intelligence & Data Science, and Electronics & Communication Engineering).\nLatest News & Announcements and Upcoming Campus Events sections.\nAbout Apex Institute with autonomous pedagogy and dual-degree tie-up highlights.\nConnect With Us, Quick Links and Contact Information.",
     "Hero.\nAbout.\nPrograms.\nPlacements.\nNews & Announcements.\nUpcoming Campus Events.\nAdmissions: Apply Now.\nContact and Quick Links.",
     [VITE, VERCEL]),
    ("academy-website-demo", "Academy Website Demo", "Academy", "demo", "", "", 0,
     "Demo website for academies. The live website link will be added soon.",
     "A demonstration website for academies is planned. Its live website address has not been supplied yet; it will appear here, with the details of its pages, once it is available.",
     "", "", []),
    ("school-website-demo", "School Website Demo", "School & Education", "demo", "", "https://school-demo-nine-tau.vercel.app/", 2,
     "School demo with a scroll-driven campus journey, programmes, facilities and admissions.",
     "A demonstration website for a school. A scroll-driven journey introduces the campus, followed by academic stages, programmes, facilities and admissions.",
     "Main menu: Home, About, Programs, Campus Life, Facilities, Admissions, Careers and Contact, with an Apply Now button.\nScroll-driven campus journey in four stages.\nEducational philosophy section.\nAcademic stages of growth, including Early Years.\nCampus life: championship athletics, music and fine arts.",
     "Welcome journey.\nEducational Philosophy.\nAcademic Stages of Growth.\nCampus Life.\nFacilities.\nAdmissions: Apply Now.\nCareers and Contact.",
     [NEXT, VERCEL]),
    ("luxury-jewellery-static", "Luxury Jewellery – Static Website", "Jewellery", "demo", "static", "https://jewellery-web-demo-five.vercel.app/", 2,
     "Static jewellery showcase with a filterable collection gallery and a scroll-driven story.",
     "The static version of the Luxury Jewellery demo. It is a visual showcase: a scroll-driven brand story followed by a signature collection gallery that can be filtered by type.",
     "Main menu: Home, Collection, Investments, About and Contact, with a Shop Collection button.\nScroll-driven brand story.\nSignature collection gallery filtered by All, Rings, Necklaces and Bracelets.\nForms with input fields.",
     "Hero: Crafted to captivate.\nBrand story sections.\nThe Signature Collection gallery with filters.\nInvestments and About.\nContact.",
     [NEXT, VERCEL]),
    ("haute-weaves-couture", "Haute Weaves & Couture", "Textiles", "demo", "", "https://textiles-web.vercel.app/", 1,
     "Textile and couture demo with curated collections, an artisan gallery and a scroll-driven story.",
     "A demonstration website for a handloom and couture brand. A scroll-driven story in four acts leads into the curated collections and the artisan gallery.",
     "Main menu: Home, About Us, Collections, Gallery and Contact, with a Contact Atelier button.\nFour-act scroll-driven story.\nSix curated collections: Silk, Embroidered, Festive, Bridal, Contemporary and Heritage.\nThe Artisan Gallery.\nVision and mission section.\nForms with input fields.",
     "Story: Textile Genesis, Living Heritage, Kinetic Grace and The Climax.\nAbout and Vision & Mission.\nCurated Collections.\nThe Artisan Gallery.\nContact.",
     [NEXT, VERCEL]),
    ("luxury-jewellery-dynamic", "Luxury Jewellery – Dynamic Website", "Jewellery", "demo", "dynamic", "https://jewellery-dynamic-web.vercel.app/", 2,
     "Dynamic jewellery demo with collections, custom jewellery, services, offers and enquiries.",
     "The dynamic version of the Luxury Jewellery demo. It presents collections with design counts, a custom jewellery service, offers and events, and enquiry actions.",
     "Main menu: Home, About Us, Collections, Gallery, Custom Jewellery, Services, Offers / Events and Contact, with an Enquire button.\nSignature collections with design counts (for example Gold Jewellery and Diamond Jewellery).\nHero actions: Explore Collections and Enquire Now.\nReserve Private Lounge call to action.\nBrand heritage section.",
     "Hero: Timeless Jewellery.\nThe Sovereign Maison: the brand story.\nCurated Suites: the signature collections.\nGallery and Custom Jewellery.\nServices and Offers / Events.\nContact: Enquire.",
     [VITE, VERCEL]),
]

NOTE = {
    "static": "A static website serves pages that are prepared in advance and shown as they are. It suits a showcase where the content seldom changes.",
    "dynamic": "A dynamic website builds its pages from data when they are opened. It suits content that changes and is updated from a data source.",
}


def rows() -> list[dict]:
    out = []
    for n, (slug, title, category, kind, typ, url, shot_count, summary, overview, features, modules, tech) in enumerate(ENTRIES, start=1):
        data = {"category": category, "entry_kind": kind, "summary": summary, "overview": overview, "features": features, "modules": modules, "technologies": "\n".join(tech)}
        if typ:
            data["website_type"] = typ
            data["type_reason"] = NOTE[typ]
        if url:
            data["website_link"] = url
            data["embed_preview"] = True
            data["preview_paths"] = shots(slug if slug not in KEY else KEY[slug], shot_count)
            data["mobile_path"] = mobile(KEY.get(slug, slug))
        if n in (1, 4, 5, 13, 14, 15):
            data["featured"] = True
        data = {k: v for k, v in data.items() if v not in ("", None)}
        out.append({"slug": slug, "title": title, "sort_order": n * 10, "data": data})
    return out


# slug in the CMS -> the file key used for its screenshots
KEY = {"cop-mens-wear": "cop-menswear", "e-commerce-demo-2": "ecommerce-demo-2", "hospital-management-demo": "hospital-demo", "lax360-real-estate": "real-estate",
       "apex-institute-of-technology-science": "apex-institute", "school-website-demo": "school-demo", "luxury-jewellery-static": "jewellery-static",
       "haute-weaves-couture": "haute-weaves", "luxury-jewellery-dynamic": "jewellery-dynamic"}
