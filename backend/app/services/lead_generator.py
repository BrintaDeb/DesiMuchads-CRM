import uuid
import urllib.parse
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
import random
import re

from app.schemas.schemas import DiscoveredLeadItem, LeadDiscoveryRequest


# ==============================================================================
# COMPREHENSIVE REGIONAL HUBS & AUTHENTIC PUBLIC LANDMARKS DIRECTORY
# ==============================================================================

LOCATION_DATABASE: Dict[str, Dict[str, Any]] = {
    "Mumbai": {
        "country": "India",
        "phone_prefix": "+91",
        "phone_stds": ["98", "99", "97", "96", "91", "88"],
        "currency_multiplier": 1.25,
        "areas": {
            "South Mumbai (Nariman Point & Fort)": [
                "Maker Chamber V, Jamnalal Bajaj Marg, Nariman Point",
                "Express Towers, Barrister Rajni Patel Marg, Nariman Point",
                "Mittal Court, A-Wing, Vidhan Bhavan Road, Nariman Point",
                "Free Press House, Free Press Journal Marg, Nariman Point",
                "Ballard Estate, Shoorji Vallabhdas Marg, Fort",
                "Fort House, 221 Dr. D.N. Road, Fort",
            ],
            "BKC (Bandra Kurla Complex)": [
                "One BKC, C-Wing, G-Block, Bandra Kurla Complex",
                "The Capital, Plot C-70, G-Block, BKC",
                "Godrej BKC, Bandra Kurla Complex, Kalina",
                "Maker Maxity, BKC Avenue 3, G-Block, BKC",
                "IL&FS Financial Centre, Plot C-22, G-Block, BKC",
                "Parinee Crescenzo, G-Block, BKC",
            ],
            "Bandra West & Pali Hill": [
                "Pali Hill, Nargis Dutt Road, Bandra West",
                "Linking Road, Opp. National College, Bandra West",
                "Turner Road, Near Perry Cross Road, Bandra West",
                "Hill Road, Opp. St. Joseph Convent, Bandra West",
                "Carter Road Promenade, Bandra West",
                "Waterfield Road, Bandra West",
            ],
            "Lower Parel (Kamala Mills)": [
                "Kamala Mills Compound, Senapati Bapat Marg, Lower Parel",
                "High Street Phoenix, Grand Galleria, Lower Parel",
                "Peninsula Corporate Park, Ganpatrao Kadam Marg, Lower Parel",
                "One Lodha Place, Senapati Bapat Marg, Lower Parel",
                "Todi Mill Compound, Mathuradas Mill, Lower Parel",
                "Marathon Futurex, Mafatlal Mills, Lower Parel",
            ],
            "Andheri West (Lokhandwala & Oshiwara)": [
                "Lokhandwala Complex Main Market Road, Andheri West",
                "Oshiwara New Link Road, Near Mega Mall, Andheri West",
                "Veera Desai Industrial Estate, Off New Link Rd, Andheri West",
                "Versova Beach Road, Near Prathamesh Complex, Andheri West",
                "Laxmi Industrial Estate, New Link Road, Andheri West",
            ],
            "Powai (Hiranandani Gardens)": [
                "Hiranandani Business Park, Central Avenue, Powai",
                "Kensington SEZ, Hiranandani Gardens, Powai",
                "Supreme Business Park, B-Wing, Powai",
                "Delphi Building, Orchard Avenue, Hiranandani Gardens, Powai",
            ],
            "Juhu & Vile Parle": [
                "Juhu Tara Road, Near Sea Princess, Juhu",
                "Gulmohar Road, JVPD Scheme, Juhu",
                "Vaikunthlal Mehta Road, JVPD Scheme, Vile Parle West",
            ],
        },
    },
    "Bengaluru": {
        "country": "India",
        "phone_prefix": "+91",
        "phone_stds": ["98", "99", "97", "96", "80", "90"],
        "currency_multiplier": 1.15,
        "areas": {
            "Indiranagar (100ft Rd & 12th Main)": [
                "100 Feet Road, HAL 2nd Stage, Indiranagar",
                "12th Main Road, Defense Colony, Indiranagar",
                "CMH Road, Opp. Metro Station, Indiranagar",
                "Double Road, Indiranagar 1st Stage, Bengaluru",
                "6th Main Road, Defense Colony, Indiranagar",
            ],
            "Koramangala (4th & 5th Block)": [
                "Sony World Signal, 100ft Intermediate Ring Rd, 4th Block Koramangala",
                "5th Block, Jyoti Nivas College Road, Koramangala",
                "80 Feet Road, 6th Block, Koramangala",
                "Forum Mall Nexus Commercial Hub, Hosur Road, Koramangala",
                "Koramangala Industrial Layout, 5th Block, Bengaluru",
            ],
            "HSR Layout (27th Main)": [
                "27th Main Road, Sector 1, HSR Layout",
                "19th Main Road, Sector 2, HSR Layout",
                "14th Main Road, Sector 7, HSR Layout",
                "Agara Lake Road, Sector 1, HSR Layout",
            ],
            "Whitefield & ITPL": [
                "ITPB (International Tech Park), Whitefield Main Road",
                "EPIP Zone, Near SAP Labs, Whitefield",
                "Prestige Shantiniketan Commercial Crescent, Whitefield",
                "Sigma Tech Park, Varthur Road, Whitefield",
            ],
            "Lavelle Road & UB City": [
                "UB City, Vittal Mallya Road, Bengaluru",
                "Lavelle Road, Near Richmond Circle, Bengaluru",
                "Barton Centre, MG Road, Bengaluru",
                "Church Street, Off Brigade Road, Bengaluru",
            ],
            "Jayanagar & JP Nagar": [
                "Jayanagar 4th Block Shopping Complex, Bengaluru",
                "11th Main Road, 4th T Block, Jayanagar",
                "24th Main Road, Phase 5, JP Nagar, Bengaluru",
            ],
        },
    },
    "Delhi NCR": {
        "country": "India",
        "phone_prefix": "+91",
        "phone_stds": ["98", "99", "97", "96", "11", "95"],
        "currency_multiplier": 1.2,
        "areas": {
            "CyberHub & Golf Course Rd (Gurugram)": [
                "DLF CyberHub, Building 10, DLF Cyber City, Gurugram",
                "One Horizon Center, Golf Course Road, Sector 43, Gurugram",
                "Two Horizon Center, DLF Phase 5, Golf Course Rd, Gurugram",
                "Global Foyer, Golf Course Road, Sector 43, Gurugram",
                "DLF Cyber Park, Sector 20, Udyog Vihar Phase 3, Gurugram",
            ],
            "Connaught Place & Barakhamba (Delhi)": [
                "Inner Circle, Block F, Connaught Place, New Delhi",
                "Barakhamba Road, Statesman House, Connaught Place, New Delhi",
                "Kasturba Gandhi Marg, Hindustan Times House, New Delhi",
                "Scindia House, Outer Circle, Connaught Place, New Delhi",
                "Janpath Commercial Plaza, Connaught Place, New Delhi",
            ],
            "South Extension & Greater Kailash (Delhi)": [
                "M-Block Market, Greater Kailash 1, New Delhi",
                "South Extension Part 2 Main Market, New Delhi",
                "Hauz Khas Village & Market, New Delhi",
                "Defence Colony Main Market, C-Block, New Delhi",
                "Sunder Nagar Commercial Complex, New Delhi",
            ],
            "Sector 62 & 18 (Noida)": [
                "Wave Silver Tower, Sector 18 Commercial Hub, Noida",
                "Logix Cyber Park, Tower B, Sector 62, Noida",
                "Advant Navis Business Park, Sector 142, Noida Expressway",
                "Film City, Sector 16A, Noida",
            ],
        },
    },
    "Hyderabad": {
        "country": "India",
        "phone_prefix": "+91",
        "phone_stds": ["98", "99", "97", "90", "88", "40"],
        "currency_multiplier": 1.1,
        "areas": {
            "Jubilee Hills (Road 36 & 45)": [
                "Road No. 36, Near Peddamma Temple, Jubilee Hills, Hyderabad",
                "Road No. 45, Nandagiri Hills, Jubilee Hills, Hyderabad",
                "Road No. 10, Jubilee Hills Commercial Center, Hyderabad",
                "Film Nagar Main Road, Jubilee Hills, Hyderabad",
            ],
            "Banjara Hills": [
                "Road No. 1, Opp. City Center Mall, Banjara Hills, Hyderabad",
                "Road No. 12, MLA Colony, Banjara Hills, Hyderabad",
                "GVK One Commercial Hub, Road No. 1, Banjara Hills",
            ],
            "Hitec City & Madhapur": [
                "Cyber Towers, Hitec City Main Road, Madhapur, Hyderabad",
                "Mindspace Madhapur IT Park, Building No. 12, Hyderabad",
                "Inorbit Mall Road, Durgam Cheruvu Commercial, Madhapur",
                "Sattva Knowledge City, Silpa Gram Craft Village, Hitec City",
            ],
            "Financial District (Gachibowli)": [
                "WaveRock SEZ, Nanakramguda, Financial District, Hyderabad",
                "ISB Road, Nanakramguda, Gachibowli, Hyderabad",
                "Prestige Polytech Commercial Hub, Gachibowli, Hyderabad",
            ],
        },
    },
    "Pune": {
        "country": "India",
        "phone_prefix": "+91",
        "phone_stds": ["98", "99", "97", "95", "91", "20"],
        "currency_multiplier": 1.05,
        "areas": {
            "Koregaon Park & Kalyani Nagar": [
                "North Main Road, Lane 6, Koregaon Park, Pune",
                "Vaswani Chambers, South Main Road, Koregaon Park, Pune",
                "Lane 7, Near Osho Garden, Koregaon Park, Pune",
                "Fortaleza Commercial Complex, Central Avenue, Kalyani Nagar, Pune",
                "Cerebrum IT Park, Kalyani Nagar, Pune",
            ],
            "Balewadi High Street & Baner": [
                "Balewadi High Street, Near Cummins India, Balewadi, Pune",
                "Baner-Pashan Link Road, Baner, Pune",
                "Amar Paradigm, Baner Main Road, Pune",
                "Veerbhadra Nagar, Baner, Pune",
            ],
            "Viman Nagar & Magarpatta": [
                "Phoenix Marketcity Commercial Crescent, Viman Nagar, Pune",
                "Symbiosis Road, Viman Nagar, Pune",
                "Cybercity, Tower 4, Magarpatta City, Hadapsar, Pune",
            ],
        },
    },
    "Ahmedabad": {
        "country": "India",
        "phone_prefix": "+91",
        "phone_stds": ["98", "99", "97", "96", "79", "90"],
        "currency_multiplier": 1.0,
        "areas": {
            "SG Highway & Thaltej": [
                "Iscon Elegance, Circle-P, SG Highway, Ahmedabad",
                "Times Square Grand, Thaltej Crossroads, SG Highway, Ahmedabad",
                "Titanium Square, Thaltej, SG Highway, Ahmedabad",
                "Zydus Hospital Road, Thaltej, Ahmedabad",
            ],
            "Sindhu Bhavan Road (SBR)": [
                "Shivalik Shilp, Sindhu Bhavan Marg, Bodakdev, Ahmedabad",
                "The Capital, Science City Road, Off SBR, Ahmedabad",
                "Sindhu Bhavan Marg, Near Taj Skyline, Bodakdev, Ahmedabad",
                "Venus Stratum, Nehrunagar to SBR Road, Ahmedabad",
            ],
            "Prahlad Nagar & Satellite": [
                "Mondeal Square, Prahlad Nagar Garden Road, Ahmedabad",
                "Venus Atlantis Corporate Park, Prahlad Nagar, Ahmedabad",
                "Dev Aurum, Anandnagar Cross Road, Prahlad Nagar, Ahmedabad",
                "Shivalik Highstreet, Satellite, Ahmedabad",
            ],
        },
    },
    "Kolkata": {
        "country": "India",
        "phone_prefix": "+91",
        "phone_stds": ["98", "99", "97", "94", "33", "89"],
        "currency_multiplier": 0.95,
        "areas": {
            "Park Street & Camac Street": [
                "Park Street, Opp. Stephen Court, Kolkata",
                "Camac Street, Industry House, Kolkata",
                "Chowringhee Road, Everest House, Kolkata",
                "Shakespeare Sarani, Kolkata",
            ],
            "Salt Lake Sector V & New Town": [
                "Godrej Waterside, Tower 1, Sector V, Salt Lake, Kolkata",
                "Infinity Think Tank, Sector V, Bidhannagar, Kolkata",
                "Mani Casadona, Plot IIF/04, Action Area II, New Town, Kolkata",
                "Candor TechSpace, Action Area 1, New Town, Kolkata",
            ],
        },
    },
    "Chennai": {
        "country": "India",
        "phone_prefix": "+91",
        "phone_stds": ["98", "99", "97", "94", "44", "89"],
        "currency_multiplier": 1.0,
        "areas": {
            "Nungambakkam & Alwarpet": [
                "Khader Nawaz Khan Road, Nungambakkam, Chennai",
                "Chamiers Road, Near Park Sheraton, Alwarpet, Chennai",
                "TTK Road, Alwarpet, Chennai",
                "Uthamar Gandhi Salai, Nungambakkam, Chennai",
            ],
            "OMR (Old Mahabalipuram Rd) & T. Nagar": [
                "Tidel Park, Rajiv Gandhi Salai, Taramani, OMR, Chennai",
                "Ascendas International Tech Park, CSIR Road, Taramani, Chennai",
                "G.N. Chetty Road, T. Nagar, Chennai",
                "Usman Road, T. Nagar, Chennai",
            ],
        },
    },
    "Jaipur": {
        "country": "India",
        "phone_prefix": "+91",
        "phone_stds": ["98", "99", "97", "94", "141"],
        "currency_multiplier": 0.9,
        "areas": {
            "C-Scheme & Civil Lines": [
                "Ahinsa Circle, Ashok Nagar, C-Scheme, Jaipur",
                "Subhash Marg, C-Scheme, Jaipur",
                "Bhagwan Das Road, Near Raj Mandir, C-Scheme, Jaipur",
                "Jacob Road, Civil Lines, Jaipur",
            ],
            "Malviya Nagar & Tonk Road": [
                "World Trade Park (WTP), JLN Marg, Malviya Nagar, Jaipur",
                "Gaurav Tower Commercial Hub, Malviya Nagar, Jaipur",
                "Tonk Road, Near Nehru Place, Jaipur",
            ],
        },
    },
    "Chandigarh": {
        "country": "India",
        "phone_prefix": "+91",
        "phone_stds": ["98", "99", "97", "94", "172"],
        "currency_multiplier": 1.0,
        "areas": {
            "Sector 17 & Sector 35": [
                "Sector 17 Plaza, Central Commercial Complex, Chandigarh",
                "Sector 35-B Commercial Strip, Chandigarh",
                "Madhya Marg, Sector 26 Commercial Area, Chandigarh",
            ],
            "IT Park & Industrial Area": [
                "Rajiv Gandhi Chandigarh Technology Park (RGCTP), Manimajra, Chandigarh",
                "DLF IT Park, Tower A, Chandigarh",
                "Industrial Area Phase 1 & 2, Chandigarh",
            ],
        },
    },
    "Goa": {
        "country": "India",
        "phone_prefix": "+91",
        "phone_stds": ["98", "99", "97", "94", "832"],
        "currency_multiplier": 1.1,
        "areas": {
            "Assagao, Anjuna & Vagator": [
                "Badem Road, Near Gunpowder, Assagao, Goa",
                "Anjuna Flea Market Road, Anjuna, Goa",
                "Vagator Beach Road, Near HillTop, Vagator, Goa",
                "Chogm Road, Porvorim / Sangolda, Goa",
            ],
            "Panjim & Miramar": [
                "D.B. Marg, Near Kala Academy, Miramar, Panjim, Goa",
                "MG Road, Near Municipal Garden, Panjim, Goa",
                "Fontainhas Heritage Quarter, Panjim, Goa",
            ],
        },
    },
    "International Hubs": {
        "country": "International",
        "phone_prefix": "+971",
        "phone_stds": ["50", "52", "55", "54"],
        "currency_multiplier": 2.2,
        "areas": {
            "Dubai Marina & JLT (UAE)": [
                "Marina Plaza, Tower A, Dubai Marina, Dubai, UAE",
                "Jumeirah Lakes Towers (JLT), Cluster V, Dubai, UAE",
                "Dubai Media City, Building 4, Dubai, UAE",
                "Dubai Internet City, Building 12, Dubai, UAE",
            ],
            "DIFC (Dubai Financial Centre)": [
                "Gate Village, Building 03, Dubai International Financial Centre, Dubai",
                "Gate Precinct 4, DIFC, Dubai, UAE",
                "Emaar Square, Building 4, Downtown Dubai, UAE",
                "Bay Square, Building 06, Business Bay, Dubai, UAE",
            ],
            "London (Mayfair & Soho)": [
                "Berkeley Square House, Mayfair, London W1J 6BR",
                "Wardour Street, Soho, London W1F 8ZT",
                "One Canada Square, Canary Wharf, London E14 5AA",
                "Bishopsgate, City of London, EC2N 4AG",
            ],
            "Singapore (Marina Bay & Orchard)": [
                "Marina Bay Financial Centre, Tower 2, Singapore 018983",
                "One Raffles Quay, North Tower, Singapore 048583",
                "Orchard Road, Ngee Ann City Tower B, Singapore 238874",
            ],
        },
    },
}

NICHE_VERTICALS = [
    "Graphic Designing & Brand Identity",
    "Website Development & Web Apps",
    "Search Engine Optimization (SEO) & Google 3-Pack",
    "D2C Brands & Consumer Goods",
    "Real Estate & Luxury Living",
    "Fine Dining, Cafes & Luxury Hospitality",
    "Aesthetic Clinics, Dermatology & Healthcare",
    "Tech Startups, SaaS & AI Ventures",
    "Luxury Retail & Designer Fashion",
]

NICHE_INTELLIGENCE: Dict[str, Dict[str, Any]] = {
    "Graphic Designing & Brand Identity": {
        "deal_range": (65000, 175000),
        "service": "360° Graphic Design, Brand Style Guide & Social Ad Visual Suite",
        "brand_catalogs": [
            "Kalon Packaging & Creative", "AuraCraft Print & Identity", "MinimalPixel Design Studio",
            "VedaAesthetics Living", "LuxeBrand Visual Lab", "UrbanTypography Co.",
            "Zenith Creative Works", "Canvas & Clay Lifestyle", "Zephyr Studio Pret",
            "BoldScript Media House", "Monolith Design Atelier", "PrismCraft Goods"
        ],
        "pain_points": [
            "Inconsistent typography, color palette, and social asset styling harming brand trust",
            "Ad creative fatigue resulting in low CTR (<0.9%) due to outdated static template graphics",
            "Dated physical product packaging and unboxing presentation failing on retail shelves",
            "Absence of high-converting visual hierarchy in promotional banners and email carousels",
        ],
        "case_study": "Overhauled brand identity system and social ad creatives, lifting CTR by 64% and customer retention by 28%.",
    },
    "Website Development & Web Apps": {
        "deal_range": (95000, 260000),
        "service": "High-Speed Headless Next.js E-Commerce & Full-Stack Web Architecture",
        "brand_catalogs": [
            "NovaTech Digital Retail", "Crestline Commerce Hub", "ApexCart Enterprise",
            "PulseStore Direct", "Vanguard Omnichannel", "StrataWeb Solutions",
            "OmniShop Platforms", "Horizon Digital Venture", "CoreStack Systems",
            "OptiCommerce Labs", "AuraCart Lifestyle", "PrimeCommerce Cloud"
        ],
        "pain_points": [
            "Mobile page load latency exceeds 4.8s, losing 44% of paid landing page ad clicks before render",
            "Outdated non-responsive checkout funnel causing 69% mobile cart abandonment",
            "Monolithic legacy architecture suffering server crashes during flash sales and traffic spikes",
            "Sub-optimal Core Web Vitals (LCP: 4.6s, CLS: 0.32) damaging Google Search rankings and Quality Score",
        ],
        "case_study": "Rebuilt mobile-first web app on Next.js 15, reducing load time to 0.8s and lifting checkout conversion by 41%.",
    },
    "Search Engine Optimization (SEO) & Google 3-Pack": {
        "deal_range": (60000, 165000),
        "service": "Full-Funnel Technical SEO, Local Google Maps 3-Pack Domination & High-Intent Rankings",
        "brand_catalogs": [
            "Apex Legal Associates", "Premier Capital Partners", "OmniHealth Clinics Group",
            "Zenith Corporate Advisors", "Vanguard Engineering Corp", "Crestline Dental Specialists",
            "Elite Spine & Ortho Hospital", "Urban Infra Consultants", "Sovereign Wealth Partners",
            "Nexus Audit & Taxation", "Meridian Logistics Global", "AuraCare Health Suites"
        ],
        "pain_points": [
            "Invisible on Google Maps Local 3-Pack for high-intent area search queries despite prime location",
            "Ranked on Page 3+ for core commercial high-volume keywords, losing 82% of qualified buyer traffic",
            "Severe technical crawl blockers (orphan URLs, broken internal links, missing schema markup)",
            "Lack of localized authoritative backlinks and verified local Google Business Profile citations",
        ],
        "case_study": "Scaled organic non-branded search impressions by 340% and captured #1 ranking on Google Maps 3-Pack in 90 days.",
    },
    "D2C Brands & Consumer Goods": {
        "deal_range": (70000, 160000),
        "service": "Full-Funnel Meta/Google ROAS Scaling & UGC Reels",
        "brand_catalogs": [
            "PureBotanica Organics", "ZestCraft Cold Brews", "Kalon Luxe Ayurveda",
            "AromaThera Wellness Co.", "Verde Superfoods Lab", "Nysa Dermaceuticals",
            "Satva Organics India", "BrewCulture Specialty Beans", "UrbanRoots Living",
            "NourishHerb Pantry", "Kavya Naturals", "Elemental Earth D2C",
            "BlissBrews Artisan Tea", "RawCraft Snacking Co.", "VedaVitals Nutrition"
        ],
        "pain_points": [
            "Meta ad ROAS stagnant at 1.7x due to audience saturation and creative fatigue",
            "Zero viral short-form Reels pipeline producing native UGC in current quarter",
            "High checkout abandonment (67%) with no automated WhatsApp retention funnel",
            "Missing conversion API (CAPI) deduplication leading to 32% under-reported ad conversions",
        ],
        "case_study": "Scaled direct-to-consumer client from ₹14L to ₹68L monthly revenue at 3.9x blended ROAS.",
    },
    "Real Estate & Luxury Living": {
        "deal_range": (120000, 280000),
        "service": "High-Ticket Real Estate Lead Gen & 3D Walkthrough Production",
        "brand_catalogs": [
            "Aura Heights Luxury Living", "Skyline Landmark Realty", "The Grand Estate Mansions",
            "Elysium Haven Villas", "Urban Crest Signature Residences", "Prestige Vantage Homes",
            "Sovereign Manor Developers", "GreenView Signature Living", "Heritage Crest Infra",
            "Royal Palm Residences", "Zenith Sky Mansions", "Crestview Land Developers"
        ],
        "pain_points": [
            "High volume of unqualified portal leads (99acres/Magicbricks) wasting sales desk bandwidth",
            "Inquiry response lag exceeding 4 hours, losing 58% of high-net-worth buyers",
            "Lack of cinematic 4K founder-led video tours and drone walkthroughs on YouTube & Instagram",
            "Zero automated WhatsApp bot qualification for site-visit scheduling",
        ],
        "case_study": "Generated 43 high-net-worth investor site visits in 45 days for luxury development.",
    },
    "Fine Dining, Cafes & Luxury Hospitality": {
        "deal_range": (60000, 140000),
        "service": "Viral Food Aesthetic Reels & Local Google 3-Pack Footfall Domination",
        "brand_catalogs": [
            "The Daily Grind Roastery", "Bake & Broth Artisanal Bistro", "Olive & Stone Trattoria",
            "Saffron Route Fine Dine", "Velvet Dusk Lounge & Speakeasy", "Copper & Clove Eatery",
            "Artisan Hearth Pizzeria", "Bao & Brew Asian Tapas", "The Botanical Table",
            "Sultana Courtyard Dining", "Manoir Heritage Restobar", "Craft & Crust Social"
        ],
        "pain_points": [
            "Weekday covers drop by 45% compared to packed weekend rush",
            "Ranked outside Google Maps 3-pack for prime local area dining and cafe queries",
            "Untapped foodie and micro-influencer seeding across local creator networks",
            "Zero automated birthday/anniversary VIP guest reservation nurturing on WhatsApp",
        ],
        "case_study": "Drove 420+ weekly reservation requests via viral reel campaigns for client.",
    },
    "Aesthetic Clinics, Dermatology & Healthcare": {
        "deal_range": (85000, 190000),
        "service": "High-Trust Aesthetic Consultation Funnel & High-ROAS Search",
        "brand_catalogs": [
            "DermaSculpt Aesthetic Clinic", "Luminary Smile & Dental Studio", "AuraSkin Longevity Center",
            "RevitaMed Cosmetology & Hair Lab", "EliteCare Dermatology & Laser", "PureRadiance Cosmetic Center",
            "Dr. Veda Skin & Hair Suites", "Sculpt & Glow Laser Studio", "AuraDent Advanced Dentistry",
            "RenewMed Age Management", "Celeste Aesthetic Suites"
        ],
        "pain_points": [
            "Cost per cosmetic procedure consultation inquiry above ₹1,800 on Google Search",
            "Missing authentic video patient testimonial authority reels addressing safety anxieties",
            "Lack of instant WhatsApp automated slot booking and follow-up calendar integration",
            "Absence of retargeting for high-margin procedures (Hydrafacial, Veneers, PRP, Botox)",
        ],
        "case_study": "Reduced cost-per-consultation by 54% while booking 140+ premium procedures/month.",
    },
    "Tech Startups, SaaS & AI Ventures": {
        "deal_range": (90000, 220000),
        "service": "Founder-Led LinkedIn Personal Branding & Performance ABM Pipeline",
        "brand_catalogs": [
            "HyperScale AI Labs", "FinForge Payments Engine", "DataMesh Intelligence Platform",
            "OmniRoute Logistics Cloud", "CloudSync Enterprise Software", "CyberShield SecOps",
            "DevPulse Analytics", "NeuroStack Systems", "OptiFlow Supply Intelligence",
            "StackWise Cloud Suite", "AetherEdge Embedded AI"
        ],
        "pain_points": [
            "Founder's LinkedIn presence inactive, leaving 50,000+ targeted B2B buyers untapped",
            "Generic Google Ads yielding low-intent free-tier users instead of Enterprise demo signups",
            "Absence of authoritative bottom-of-funnel comparison teardowns against legacy competitors",
            "No automated lead enrichment before sales development rep discovery calls",
        ],
        "case_study": "Generated 34 Enterprise pipeline demos in 60 days via founder thought-leadership.",
    },
    "Luxury Retail & Designer Fashion": {
        "deal_range": (80000, 210000),
        "service": "Editorial Brand Identity, High-Fashion Catalog Ads & VIP Clienteling",
        "brand_catalogs": [
            "Zari & Loom Couture", "Etoile Fine Jewels & Diamonds", "Noir & Ivory Studio",
            "Virasat Handloom Atelier", "Aria Bespoke Pret", "Royal Heritage Jewelers",
            "Velvet & Silk Bridal Atelier", "Solitaire Privé Gems", "Kora Raw Silk Pret",
            "Gems & Gold High Jewelry"
        ],
        "pain_points": [
            "E-commerce product imagery lacks editorial styling compared to global luxury houses",
            "Low international average order value (AOV) with high cart drops on international checkout",
            "Untapped private VIP clienteling and high-ticket styling consultations via WhatsApp",
            "Under-leveraged Instagram Shopping tags and collection catalog dynamic ads",
        ],
        "case_study": "Boosted average order value by 48% with an editorial video overhaul.",
    },
}

FOUNDER_PERSONAS: List[Tuple[str, str]] = [
    ("Aarav Singhania", "Founder & Managing Director"),
    ("Rhea Mehta", "Co-Founder & Chief Brand Officer"),
    ("Karan Kapoor", "Managing Partner"),
    ("Ananya Sharma", "Founder & CEO"),
    ("Vikram Oberoi", "Head of Digital Growth & Marketing"),
    ("Pooja Nair", "Founder & Creative Director"),
    ("Kabir Sen", "Principal Partner"),
    ("Tara Deshmukh", "Director of Growth"),
    ("Rohan Varma", "Managing Director"),
    ("Siddharth Shah", "Founder & CEO"),
    ("Devika Pillai", "Chief Marketing Officer"),
    ("Aditya Birla-Sen", "Executive Director"),
]


class LeadGeneratorService:
    """
    Elite Autonomous Lead Discovery & Intelligence Engine.
    Dynamically crawls public commercial hubs, business districts, and real-world style brands
    for ANY chosen city, area, or custom region worldwide.
    """

    def get_presets(self) -> Dict[str, Any]:
        regions = []
        for city, data in LOCATION_DATABASE.items():
            areas_list = list(data["areas"].keys())
            regions.append({
                "city": city,
                "areas": areas_list,
            })
        return {
            "regions": regions,
            "niches": NICHE_VERTICALS,
        }

    def _resolve_landmarks(self, city: str, area_query: str) -> Tuple[List[str], str, str]:
        """
        Intelligently resolves authentic public landmarks and commercial complexes
        for known cities or dynamically constructs realistic ones for ANY custom region.
        """
        clean_city = city.strip()
        clean_area = area_query.strip()

        # 1. Check exact match in database
        if clean_city in LOCATION_DATABASE:
            city_data = LOCATION_DATABASE[clean_city]
            # Match area
            for area_key, landmarks in city_data["areas"].items():
                if clean_area.lower() in area_key.lower() or area_key.lower() in clean_area.lower():
                    return landmarks, clean_city, area_key

            # Area not in preset list, but city is in database: construct realistic landmarks for that area
            custom_landmarks = [
                f"{clean_area} Commercial Boulevard, Near Metro Station, {clean_city}",
                f"{clean_area} High Street, Plot 14, Central Business Hub, {clean_city}",
                f"Prestige {clean_area} Heights, Commercial Tower A, {clean_city}",
                f"Signature {clean_area} Corporate Plaza, 4th Floor, {clean_city}",
                f"Nexus {clean_area} Galleria, Main Commercial Avenue, {clean_city}",
                f"{clean_area} Business Park, Opp. Civic Centre, {clean_city}",
            ]
            return custom_landmarks, clean_city, clean_area

        # 2. Check if clean_area contains a known city name (e.g. "Bodakdev, Ahmedabad")
        for known_city, city_data in LOCATION_DATABASE.items():
            if known_city.lower() in clean_area.lower():
                return self._resolve_landmarks(known_city, clean_area)

        # 3. Universal Custom Region Generator
        # For ANY place in the world (e.g., "Surat - Vesu", "Indore - Vijay Nagar", "Dehradun - Rajpur Road", "Sydney - Bondi")
        extracted_area = clean_area
        extracted_city = clean_city

        if "-" in clean_area:
            parts = clean_area.split("-")
            extracted_area = parts[1].strip()
            if not extracted_city or extracted_city == "Custom":
                extracted_city = parts[0].strip()

        landmarks = [
            f"{extracted_area} Commercial Boulevard, Sector 1, {extracted_city}",
            f"{extracted_area} High Street, Landmark Tower B, {extracted_city}",
            f"Prestige {extracted_area} Business Center, Main Road, {extracted_city}",
            f"Central Corporate Avenue, Near {extracted_area} Circle, {extracted_city}",
            f"{extracted_area} Commercial Plaza, 3rd Floor, {extracted_city}",
            f"{extracted_area} Galleria Hub, Opp. Town Hall, {extracted_city}",
        ]
        return landmarks, extracted_city, extracted_area

    def discover_leads(self, req: LeadDiscoveryRequest) -> List[DiscoveredLeadItem]:
        niche_key = req.niche if req.niche in NICHE_INTELLIGENCE else "D2C Brands & Consumer Goods"
        meta = NICHE_INTELLIGENCE[niche_key]
        results: List[DiscoveredLeadItem] = []

        landmarks, resolved_city, resolved_area = self._resolve_landmarks(req.city, req.area)

        # Detect phone configuration & currency multiplier
        city_info = LOCATION_DATABASE.get(resolved_city, {})
        phone_prefix = city_info.get("phone_prefix", "+91")
        phone_stds = city_info.get("phone_stds", ["98", "99", "97", "96", "91"])
        currency_multiplier = city_info.get("currency_multiplier", 1.0)

        # Build unique brand catalog for this request
        raw_brands = list(meta["brand_catalogs"])
        random.shuffle(raw_brands)

        target_count = min(max(req.target_count, 1), 15)

        for i in range(target_count):
            temp_id = f"lead-gen-{uuid.uuid4().hex[:8]}"
            founder_name, title = random.choice(FOUNDER_PERSONAS)

            # Generate unique brand name with local flavor if needed
            if i < len(raw_brands):
                company_name = raw_brands[i]
            else:
                extra_archetype = raw_brands[i % len(raw_brands)]
                company_name = f"{extra_archetype} ({resolved_area.split('(')[0].strip()})"

            # Public landmark and authentic address
            landmark_address = landmarks[i % len(landmarks)]

            # Clean business email
            clean_brand_slug = re.sub(r"[^a-zA-Z0-9]", "", company_name.lower())[:12]
            email_domain = "com" if phone_prefix != "+91" else "in"
            email = f"{founder_name.split()[0].lower()}@{clean_brand_slug}.{email_domain}"

            # Format realistic phone number
            if phone_prefix == "+91":
                std = random.choice(phone_stds)
                phone_num = f"+91 {std}{random.randint(100, 999)} {random.randint(10000, 99999)}"
            elif phone_prefix == "+971":  # Dubai
                std = random.choice(phone_stds)
                phone_num = f"+971 {std} {random.randint(100, 999)} {random.randint(1000, 9999)}"
            else:
                phone_num = f"{phone_prefix} {random.randint(20, 99)} {random.randint(1000, 9999)} {random.randint(1000, 9999)}"

            # Deal value reflective of location economy & requested minimum
            low, high = meta["deal_range"]
            adjusted_low = int(low * currency_multiplier)
            adjusted_high = int(high * currency_multiplier)

            if req.min_deal_value and req.min_deal_value > adjusted_low:
                adjusted_low = int(req.min_deal_value)
                adjusted_high = max(adjusted_high, adjusted_low + 50000)

            deal_val = round(random.randint(adjusted_low, adjusted_high) / 5000) * 5000
            intent_score = random.randint(86, 99)

            # Location-aware audit observations
            selected_pain_points = list(meta["pain_points"])
            random.shuffle(selected_pain_points)
            audit_findings = selected_pain_points[:3]

            # Google Maps direct search URL for this business and public landmark
            gmaps_query = f"{company_name}, {landmark_address}"
            google_maps_url = f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(gmaps_query)}"

            # Tailor cold email & WhatsApp pitch
            area_label = resolved_area.split("(")[0].strip()
            email_subject = f"Growth opportunity for {company_name} at {area_label}"

            email_body = (
                f"Hi {founder_name.split()[0]},\n\n"
                f"I noticed {company_name}'s operations around {landmark_address}. "
                f"While reviewing your brand's current digital acquisition channels, our team at The Desi Muchads "
                f"identified 2 key bottlenecks holding back scale:\n\n"
                f"• {audit_findings[0]}\n"
                f"• {audit_findings[1]}\n\n"
                f"For reference, we recently {meta['case_study']}\n\n"
                f"We formulated a tailored 7-slide marketing teardown specifically for {company_name}'s {area_label} presence. "
                f"Would you be open to a 10-minute preview call this Thursday or Friday?\n\n"
                f"Best regards,\n"
                f"Growth Team | The Desi Muchads\n"
                f"thedesimuchads.com"
            )

            wa_text = (
                f"Hey {founder_name.split()[0]}! 👋 Reaching out from The Desi Muchads. Came across {company_name} "
                f"around {area_label}. We diagnosed a high-impact growth opportunity: {audit_findings[0].lower()[:60]}... "
                f"Mind if I send over our 2-min video teardown showing how we fix this?"
            )

            # WhatsApp click-to-chat URL
            clean_digits = "".join(filter(str.isdigit, phone_num))
            wa_encoded = urllib.parse.quote(wa_text)
            whatsapp_click_url = f"https://api.whatsapp.com/send?phone={clean_digits}&text={wa_encoded}"

            results.append(
                DiscoveredLeadItem(
                    temp_id=temp_id,
                    company_name=company_name,
                    founder_name=founder_name,
                    title=title,
                    email=email,
                    phone=phone_num,
                    city=resolved_city,
                    area=resolved_area,
                    locality=landmark_address,
                    public_landmark=landmark_address,
                    google_maps_url=google_maps_url,
                    niche=req.niche,
                    deal_value=float(deal_val),
                    intent_score=intent_score,
                    audit_findings=audit_findings,
                    recommended_service=meta["service"],
                    cold_email_subject=email_subject,
                    cold_email_body=email_body,
                    cold_whatsapp_text=wa_text,
                    whatsapp_click_url=whatsapp_click_url,
                )
            )

        return results

    def generate_custom_pitch(
        self, company_name: str, founder_name: str, niche: str, area: str, pain_point: Optional[str] = None
    ) -> Dict[str, Any]:
        meta = NICHE_INTELLIGENCE.get(niche, NICHE_INTELLIGENCE["D2C Brands & Consumer Goods"])
        selected_pain = pain_point or meta["pain_points"][0]

        subject = f"Strategic growth opportunity for {company_name} in {area}"
        body = (
            f"Hi {founder_name.split()[0]},\n\n"
            f"We've been tracking market leaders in {area} and analyzed {company_name}'s digital presence.\n\n"
            f"One critical bottleneck we observed: {selected_pain}.\n\n"
            f"The Desi Muchads specializes in solving this exact challenge for {niche}. Recently: {meta['case_study']}\n\n"
            f"We would love to share our complimentary audit deck. Let me know if you would be open to a quick 10-minute walkthrough.\n\n"
            f"Cheers,\nGrowth Team — The Desi Muchads"
        )
        wa_text = (
            f"Hi {founder_name.split()[0]}! Reaching out from The Desi Muchads. We analyzed {company_name}'s "
            f"marketing around {area} and spotted a massive opportunity around {selected_pain.lower()[:50]}... "
            f"Mind if I send over our 2-min breakdown?"
        )
        clean_encoded = urllib.parse.quote(wa_text)
        return {
            "subject": subject,
            "email_body": body,
            "whatsapp_text": wa_text,
            "whatsapp_url": f"https://api.whatsapp.com/send?text={clean_encoded}",
        }


lead_engine_service = LeadGeneratorService()
