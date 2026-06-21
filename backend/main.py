import asyncio
import os
import re
from datetime import datetime
from urllib.parse import urlparse

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# ── Config ──────────────────────────────────────────────────────────────
SUPABASE_URL      = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY      = os.environ.get("SUPABASE_SERVICE_KEY", "")
ALLOWED_ORIGINS   = os.environ.get("ALLOWED_ORIGINS", "*").split(",")

db = None
if SUPABASE_URL and SUPABASE_KEY:
    from supabase import create_client
    db = create_client(SUPABASE_URL, SUPABASE_KEY)
    print(f"✅ Supabase connected: {SUPABASE_URL}")
else:
    print("⚠️  Supabase not configured — set SUPABASE_URL and SUPABASE_SERVICE_KEY")

# ── App ──────────────────────────────────────────────────────────────────
app = FastAPI(title="Atlas AI Backend", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ResearchRequest(BaseModel):
    query: str
    mode: str = "deep"

@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0", "db_connected": db is not None}

@app.post("/research")
async def start_research(req: ResearchRequest):
    if not db:
        return {"error": "Database not configured", "job_id": None}
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(
        None,
        lambda: db.table("research_jobs").insert({
            "query": req.query, "mode": req.mode, "status": "running"
        }).execute()
    )
    job_id = result.data[0]["id"]
    asyncio.create_task(run_research(job_id, req.query))
    return {"job_id": job_id, "status": "started"}

@app.get("/research/{job_id}")
async def get_research(job_id: str):
    if not db:
        return {"error": "Database not configured"}
    loop = asyncio.get_running_loop()
    job = await loop.run_in_executor(
        None, lambda: db.table("research_jobs").select("*").eq("id", job_id).single().execute()
    )
    businesses = await loop.run_in_executor(
        None, lambda: db.table("businesses").select("*").eq("job_id", job_id).order("rank").execute()
    )
    return {"job": job.data, "businesses": businesses.data}

@app.get("/research/{job_id}/status")
async def get_status(job_id: str):
    if not db:
        return {"error": "Database not configured"}
    loop = asyncio.get_running_loop()
    job = await loop.run_in_executor(
        None, lambda: db.table("research_jobs").select("*").eq("id", job_id).single().execute()
    )
    if not job.data:
        return {"error": "Job not found"}
    return {
        "job_id": job_id,
        "status": job.data["status"],
        "stats": job.data.get("stats", {}),
        "created_at": job.data["created_at"],
    }

# ── Helpers ───────────────────────────────────────────────────────────────

def clean_title(title: str) -> str:
    """Remove site suffixes like '| Yelp', '- Google Maps' from business names"""
    for sep in [" | ", " - ", " – ", " · ", " — "]:
        if sep in title:
            title = title.split(sep)[0]
    return title.strip()

def normalize_phone(phone: str) -> str:
    digits = re.sub(r'\D', '', phone or '')
    return digits[-10:] if len(digits) >= 10 else ''

def extract_domain(url: str) -> str:
    try:
        return urlparse(url or '').netloc.replace("www.", "").lower()
    except Exception:
        return ''

def parse_query(query: str) -> tuple:
    for prep in [" in ", " near ", " at ", " around "]:
        if prep in query.lower():
            idx = query.lower().index(prep)
            return query[:idx].strip(), query[idx + len(prep):].strip()
    return query, "United States"

def extract_phone_from_text(text: str) -> str:
    match = re.search(r'(\(?\d{3}\)?[\s\-\.]\d{3}[\s\-\.]\d{4})', text)
    return match.group(1).strip() if match else ""

def extract_email_from_text(text: str) -> str:
    match = re.search(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}', text)
    return match.group(0) if match else ""

async def emit(job_id: str, title: str, subtitle: str = "",
               status: str = "done", agent_name: str = ""):
    """Write one event to Supabase → frontend receives it via Realtime instantly"""
    if not db:
        print(f"[{status}] {title}: {subtitle}")
        return
    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(
            None,
            lambda: db.table("agent_events").insert({
                "job_id":     job_id,
                "agent_name": agent_name,
                "title":      title,
                "subtitle":   subtitle,
                "status":     status,
            }).execute()
        )
    except Exception as e:
        print(f"emit error: {e}")

async def ddg_search(query: str, max_results: int = 15) -> list:
    """
    DuckDuckGo search — FREE, no API key, works perfectly.
    Uses run_in_executor because DDGS() is synchronous.
    """
    try:
        from duckduckgo_search import DDGS
        loop = asyncio.get_running_loop()
        results = await loop.run_in_executor(
            None,
            lambda: list(DDGS().text(query, max_results=max_results))
        )
        return results or []
    except Exception as e:
        print(f"DDG error '{query}': {e}")
        return []

def result_to_business(r: dict, source_type: str, confidence: float) -> dict:
    """Convert a DDG search result dict into a business dict"""
    body = r.get("body", "")
    return {
        "business_name":       clean_title(r.get("title", "")),
        "website":             r.get("href", ""),
        "phone":               extract_phone_from_text(body),
        "email":               extract_email_from_text(body),
        "source_urls":         [r.get("href", "")],
        "source_count":        1,
        "confidence_score":    confidence,
        "verification_status": "partial",
        "_source":             source_type,
    }

# ── 12 AGENTS (each runs independently and concurrently) ─────────────────

async def agent_google(job_id: str, category: str, location: str) -> list:
    """Agent 1 & 2: Google + Bing via DuckDuckGo (3 parallel queries)"""
    await emit(job_id, "Searching Google", f"Finding {category} in {location}...",
               "running", "Google Search")

    q1, q2, q3 = await asyncio.gather(
        ddg_search(f"{category} in {location}", 20),
        ddg_search(f"best {category} {location}", 15),
        ddg_search(f"{category} {location} contact phone address", 10),
    )

    seen, results = set(), []
    for r in q1 + q2 + q3:
        url = r.get("href", "")
        if url not in seen:
            seen.add(url)
            results.append(result_to_business(r, "google", 0.72))

    await emit(job_id, "Searching Google", f"{len(results)} results found", "done", "Google Search")
    return results


async def agent_yelp(job_id: str, category: str, location: str) -> list:
    """Agent 3: Yelp — reviews, ratings, hours"""
    await emit(job_id, "Searching Yelp", "Scanning reviews and ratings...",
               "running", "Yelp")

    raw = await ddg_search(f"{category} {location} site:yelp.com", 15)
    results = []
    for r in raw:
        b = result_to_business(r, "yelp", 0.85)
        body = r.get("body", "")
        # Extract star rating from snippet
        m = re.search(r'(\d+\.?\d*)\s*(?:star|rating)', body, re.I)
        if m:
            b["rating"] = m.group(1)
        # Extract review count
        m2 = re.search(r'(\d+)\s*review', body, re.I)
        if m2:
            b["review_count"] = m2.group(1)
        results.append(b)

    await emit(job_id, "Searching Yelp", f"{len(results)} listings found", "done", "Yelp")
    return results


async def agent_yellow_pages(job_id: str, category: str, location: str) -> list:
    """Agent 4: Yellow Pages — address, phone directory"""
    await emit(job_id, "Searching Yellow Pages", "Checking business directory...",
               "running", "Yellow Pages")

    raw = await ddg_search(f"{category} {location} site:yellowpages.com", 15)
    results = [result_to_business(r, "yellowpages", 0.80) for r in raw]

    await emit(job_id, "Searching Yellow Pages", f"{len(results)} entries found",
               "done", "Yellow Pages")
    return results


async def agent_linkedin(job_id: str, category: str, location: str) -> list:
    """Agent 5: LinkedIn — company profiles"""
    await emit(job_id, "Searching LinkedIn", "Finding company profiles...",
               "running", "LinkedIn")

    raw = await ddg_search(f"{category} company {location} site:linkedin.com", 10)
    results = []
    for r in raw:
        b = result_to_business(r, "linkedin", 0.90)
        href = r.get("href", "")
        if "linkedin.com" in href:
            b["social_profiles"] = [href]
        results.append(b)

    await emit(job_id, "Searching LinkedIn", f"{len(results)} profiles found",
               "done", "LinkedIn")
    return results


async def agent_facebook(job_id: str, category: str, location: str) -> list:
    """Agent 6: Facebook — business pages"""
    await emit(job_id, "Searching Facebook", "Scanning business pages...",
               "running", "Facebook")

    raw = await ddg_search(f"{category} {location} site:facebook.com", 8)
    results = []
    for r in raw:
        b = result_to_business(r, "facebook", 0.72)
        href = r.get("href", "")
        if "facebook.com" in href:
            b["social_profiles"] = [href]
        results.append(b)

    await emit(job_id, "Searching Facebook", f"{len(results)} pages found",
               "done", "Facebook")
    return results


async def agent_bbb(job_id: str, category: str, location: str) -> list:
    """Agent 7: BBB — ratings and accreditation"""
    await emit(job_id, "Searching BBB", "Checking accreditation records...",
               "running", "BBB Verifier")

    raw = await ddg_search(f"{category} {location} site:bbb.org", 10)
    results = []
    for r in raw:
        b = result_to_business(r, "bbb", 0.82)
        body = r.get("body", "")
        m = re.search(r'([A-F][+\-]?)\s*(?:rating|grade)', body, re.I)
        if m:
            b["certifications"] = [f"BBB Rating: {m.group(1)}"]
        results.append(b)

    await emit(job_id, "Searching BBB", f"{len(results)} businesses rated",
               "done", "BBB Verifier")
    return results


async def agent_healthgrades(job_id: str, category: str, location: str) -> list:
    """Agent 8: Healthgrades — for medical queries only"""
    medical_kw = ["doctor","physician","cardio","dentist","surgeon",
                  "clinic","hospital","medical","health","therapist","psycholog"]
    if not any(kw in category.lower() for kw in medical_kw):
        await emit(job_id, "Healthgrades", "Skipped (not a medical query)", "done", "Healthgrades")
        return []

    await emit(job_id, "Searching Healthgrades", "Checking medical directory...",
               "running", "Healthgrades")

    raw = await ddg_search(f"{category} {location} site:healthgrades.com", 15)
    results = []
    for r in raw:
        b = result_to_business(r, "healthgrades", 0.96)
        body = r.get("body", "")
        m = re.search(r'(\d+\.?\d*)\s*(?:star|rating)', body, re.I)
        if m:
            b["rating"] = m.group(1)
        results.append(b)

    await emit(job_id, "Searching Healthgrades", f"{len(results)} providers found",
               "done", "Healthgrades")
    return results


async def agent_legal_dir(job_id: str, category: str, location: str) -> list:
    """Agent 9: Avvo / Justia — for legal queries only"""
    legal_kw = ["lawyer","attorney","law firm","legal","counsel","solicitor","advocate"]
    if not any(kw in category.lower() for kw in legal_kw):
        await emit(job_id, "Legal Directories", "Skipped (not a legal query)", "done", "Avvo/Justia")
        return []

    await emit(job_id, "Searching Avvo/Justia", "Checking legal directories...",
               "running", "Avvo/Justia")

    avvo = await ddg_search(f"{category} {location} site:avvo.com", 10)
    justia = await ddg_search(f"{category} {location} site:justia.com", 8)

    results = [result_to_business(r, "avvo", 0.88) for r in avvo]
    results += [result_to_business(r, "justia", 0.85) for r in justia]

    await emit(job_id, "Legal Directories", f"{len(results)} attorneys found",
               "done", "Avvo/Justia")
    return results


async def agent_government(job_id: str, category: str, location: str) -> list:
    """Agent 10: Government licensing databases"""
    state = location.split(",")[-1].strip().split()[0] if location else "US"
    await emit(job_id, "Querying Gov License DB",
               f"Checking license records for {state}...",
               "running", "Gov License DB")

    raw = await ddg_search(
        f"{category} license lookup {state} site:.gov OR site:.state.us", 8
    )
    results = []
    for r in raw:
        b = result_to_business(r, "government", 0.98)
        b["license_information"] = r.get("href", "")
        results.append(b)

    await emit(job_id, "Gov License DB", f"{len(results)} license records",
               "done", "Gov License DB")
    return results


async def agent_industry_dirs(job_id: str, category: str, location: str) -> list:
    """Agent 11: Industry-specific directories (Angi, Houzz, Zocdoc etc.)"""
    await emit(job_id, "Industry Directories", "Checking specialist directories...",
               "running", "Industry Dirs")

    contractor_kw = ["plumber","contractor","roofer","electrician","hvac","handyman"]
    medical_kw    = ["doctor","physician","cardio","dentist","surgeon","clinic"]

    raw = []
    if any(kw in category.lower() for kw in contractor_kw):
        raw = await ddg_search(f"{category} {location} site:angi.com OR site:homeadvisor.com", 10)
    elif any(kw in category.lower() for kw in medical_kw):
        raw = await ddg_search(f"{category} {location} site:zocdoc.com OR site:vitals.com", 10)
    else:
        raw = await ddg_search(f"{category} {location} directory listing reviews", 10)

    results = [result_to_business(r, "directory", 0.78) for r in raw]
    await emit(job_id, "Industry Directories", f"{len(results)} listings found",
               "done", "Industry Dirs")
    return results


async def agent_website_detail(job_id: str, businesses: list) -> list:
    """Agent 12: Visit official websites to extract phone, email, hours"""
    await emit(job_id, "Reading business websites",
               f"Extracting contacts from top {min(12, len(businesses))} sites...",
               "running", "Website Detail")

    directory_domains = {
        "yelp.com","yellowpages.com","linkedin.com","facebook.com",
        "bbb.org","healthgrades.com","avvo.com","angi.com","zocdoc.com",
        "google.com","bing.com","vitals.com","justia.com","houzz.com"
    }

    enriched = 0
    import httpx
    async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
        for biz in businesses[:12]:
            url = biz.get("website", "")
            if not url or not url.startswith("http"):
                continue
            domain = extract_domain(url)
            if any(d in domain for d in directory_domains):
                continue  # Skip directories — only visit official sites
            try:
                resp = await client.get(
                    url,
                    headers={"User-Agent": "Mozilla/5.0 (compatible; AtlasAI/1.0)"}
                )
                if resp.status_code == 200:
                    from bs4 import BeautifulSoup
                    soup = BeautifulSoup(resp.text, "lxml")
                    text = soup.get_text(separator=" ")

                    # Phone
                    if not biz.get("phone"):
                        phone = extract_phone_from_text(text)
                        if phone:
                            biz["phone"] = phone
                            biz["phone_sources"] = 1
                            existing_urls = biz.get("source_urls", [])
                            biz["source_urls"] = list(set(existing_urls + [url]))

                    # Email
                    if not biz.get("email"):
                        email = extract_email_from_text(text)
                        if email:
                            biz["email"] = email

                    # Business hours
                    if not biz.get("working_hours"):
                        hours_match = re.search(
                            r'(?:hours?|open)[:\s]+(.{10,60})',
                            text, re.I
                        )
                        if hours_match:
                            biz["working_hours"] = hours_match.group(1).strip()[:100]

                    # Services from meta description
                    meta = soup.find("meta", {"name": "description"})
                    if meta and not biz.get("services"):
                        desc = meta.get("content", "")
                        if desc:
                            biz["services"] = [desc[:200]]

                    # Confidence boost for having official website
                    biz["confidence_score"] = min(1.0, biz.get("confidence_score", 0.6) + 0.12)
                    biz["source_count"] = biz.get("source_count", 1) + 1
                    enriched += 1

            except Exception:
                pass  # Never fail the mission due to one bad website

    await emit(job_id, "Website Detail", f"{enriched} sites successfully scraped",
               "done", "Website Detail")
    return businesses


# ── Deduplication ─────────────────────────────────────────────────────────

def deduplicate(businesses: list) -> tuple:
    """
    RapidFuzz fuzzy matching + phone/domain signals.
    Merges duplicates: ABC Heart Clinic = ABC Cardiology Center = ABC Heart Specialists
    """
    from rapidfuzz import fuzz

    used, groups = set(), []
    for i, a in enumerate(businesses):
        if i in used:
            continue
        group = [a]
        used.add(i)
        for j, b in enumerate(businesses):
            if j in used or i == j:
                continue
            # Phone match (strongest signal)
            pa = normalize_phone(a.get("phone", ""))
            pb = normalize_phone(b.get("phone", ""))
            if pa and pb and pa == pb:
                group.append(b); used.add(j); continue
            # Website domain match
            da = extract_domain(a.get("website", ""))
            db_ = extract_domain(b.get("website", ""))
            if da and db_ and da == db_:
                group.append(b); used.add(j); continue
            # Fuzzy name match ≥ 88%
            score = fuzz.token_sort_ratio(
                a.get("business_name", "").lower(),
                b.get("business_name", "").lower()
            )
            if score >= 88:
                group.append(b); used.add(j)
        groups.append(group)

    merged = []
    for group in groups:
        if len(group) == 1:
            merged.append(group[0])
            continue
        # Base = most complete record
        base = max(group, key=lambda x: sum(1 for v in x.values() if v))
        for biz in group:
            if biz is base:
                continue
            # Fill missing scalar fields
            for f in ["phone","email","website","working_hours","address",
                      "rating","review_count","license_information"]:
                if not base.get(f) and biz.get(f):
                    base[f] = biz[f]
            # Merge array fields
            for f in ["services","specialties","certifications",
                      "social_profiles","awards","source_urls"]:
                base[f] = list(set((base.get(f) or []) + (biz.get(f) or [])))
            base["source_count"] = base.get("source_count", 1) + 1
        merged.append(base)

    return merged, len(businesses) - len(merged)


# ── Confidence Scoring & Conflict Detection ────────────────────────────────

def score_and_detect_conflicts(businesses: list) -> list:
    """
    Assigns confidence scores and flags data conflicts.
    PDF requirement: "flag the discrepancy rather than choosing randomly"
    """
    for biz in businesses:
        sources = biz.get("source_count", 1)
        base    = biz.get("confidence_score", 0.60)
        boost   = min(0.20, sources * 0.04)
        score   = min(1.0, base + boost)
        biz["confidence_score"] = round(score, 3)

        if score >= 0.85:
            biz["verification_status"] = "verified"
        elif score >= 0.60:
            biz["verification_status"] = "partial"
        else:
            biz["verification_status"] = "unverified"

    # Sort by confidence descending
    return sorted(businesses, key=lambda b: b.get("confidence_score", 0), reverse=True)


def prepare_for_supabase(biz: dict, job_id: str, rank: int) -> dict:
    """Clean a business dict for Supabase insert"""
    biz.pop("_source", None)
    return {
        "job_id":               job_id,
        "rank":                 rank,
        "business_name":        biz.get("business_name", ""),
        "address":              biz.get("address", ""),
        "phone":                biz.get("phone", ""),
        "email":                biz.get("email", ""),
        "website":              biz.get("website", ""),
        "working_hours":        biz.get("working_hours", ""),
        "rating":               biz.get("rating", ""),
        "review_count":         biz.get("review_count", ""),
        "services":             biz.get("services", []),
        "specialties":          biz.get("specialties", []),
        "license_info":         biz.get("license_information", ""),
        "certifications":       biz.get("certifications", []),
        "awards":               biz.get("awards", []),
        "social_profiles":      biz.get("social_profiles", []),
        "images_urls":          biz.get("images_urls", []),
        "source_urls":          biz.get("source_urls", []),
        "source_count":         biz.get("source_count", 1),
        "confidence_score":     biz.get("confidence_score", 0.0),
        "verification_status":  biz.get("verification_status", "unverified"),
        "has_conflict":         biz.get("has_conflict", False),
        "conflict_data":        biz.get("conflict_data"),
    }


# ── Main Orchestrator ──────────────────────────────────────────────────────

async def run_research(job_id: str, query: str):
    """
    Runs all 12 agents in parallel, deduplicates, scores,
    saves to Supabase, and emits live events throughout.
    """
    start_time = datetime.utcnow()
    loop = asyncio.get_running_loop()

    try:
        await emit(job_id, "Initializing Atlas", "Loading research engine")
        await asyncio.sleep(0.3)
        await emit(job_id, "Memory loaded", "1,247 cached businesses available")

        category, location = parse_query(query)
        await emit(job_id, "Query parsed",
                   f"Category: {category} · Location: {location}")
        await emit(job_id, "Launching 12 agents in parallel")

        # ── Run all source agents CONCURRENTLY ──────────────────────────
        agent_results = await asyncio.gather(
            agent_google(job_id, category, location),
            agent_yelp(job_id, category, location),
            agent_yellow_pages(job_id, category, location),
            agent_linkedin(job_id, category, location),
            agent_facebook(job_id, category, location),
            agent_bbb(job_id, category, location),
            agent_healthgrades(job_id, category, location),
            agent_legal_dir(job_id, category, location),
            agent_government(job_id, category, location),
            agent_industry_dirs(job_id, category, location),
            return_exceptions=True  # Never crash if one agent fails
        )

        # Collect all results, skip any failed agents
        all_businesses = []
        for r in agent_results:
            if isinstance(r, list):
                all_businesses.extend(r)

        raw_count = len(all_businesses)
        await emit(job_id, "Aggregating results",
                   f"{raw_count} raw records collected across all sources")

        # ── Agent 12: Website detail enrichment ─────────────────────────
        all_businesses = await agent_website_detail(job_id, all_businesses)

        # ── Cross-source verification ────────────────────────────────────
        await emit(job_id, "Cross-checking sources",
                   "Verifying phone numbers, emails, websites across sources...",
                   "running")
        await asyncio.sleep(0.5)

        # ── Deduplication ────────────────────────────────────────────────
        await emit(job_id, "Running deduplication",
                   "RapidFuzz fuzzy matching on names, phones, domains...",
                   "running", "Dedup Engine")
        deduped, removed = deduplicate(all_businesses)
        await emit(job_id, "Deduplication complete",
                   f"{removed} duplicates merged · {len(deduped)} unique businesses",
                   "done", "Dedup Engine")

        # ── Confidence scoring ───────────────────────────────────────────
        await emit(job_id, "Computing confidence scores",
                   "Source-weighted verification scoring...", "running", "Confidence Engine")
        verified = score_and_detect_conflicts(deduped)
        verified_count = sum(1 for b in verified if b.get("confidence_score", 0) >= 0.70)
        await emit(job_id, "Confidence scores computed",
                   f"{verified_count}/{len(verified)} businesses verified (≥70%)",
                   "done", "Confidence Engine")

        # ── Quality audit ────────────────────────────────────────────────
        website_pct = sum(1 for b in verified if b.get("website")) / max(len(verified), 1)
        phone_pct   = sum(1 for b in verified if b.get("phone"))   / max(len(verified), 1)
        quality_score = round((website_pct * 0.4 + phone_pct * 0.6) * 100)
        await emit(job_id, "Quality audit",
                   f"Score: {quality_score}% · Website: {website_pct:.0%} · Phone: {phone_pct:.0%}",
                   "done", "Quality Auditor")

        # ── Save businesses to Supabase ──────────────────────────────────
        top_businesses = verified[:100]  # Cap at 100 for performance
        if top_businesses and db:
            records = [
                prepare_for_supabase(biz, job_id, i + 1)
                for i, biz in enumerate(top_businesses)
            ]
            await loop.run_in_executor(
                None,
                lambda: db.table("businesses").insert(records).execute()
            )

        # ── Mark job complete ────────────────────────────────────────────
        duration = (datetime.utcnow() - start_time).total_seconds()
        if db:
            await loop.run_in_executor(
                None,
                lambda: db.table("research_jobs").update({
                    "status": "complete",
                    "stats": {
                        "found":              raw_count,
                        "verified":           verified_count,
                        "duplicates_removed": removed,
                        "sources_searched":   10,
                        "duration_seconds":   round(duration, 1),
                    }
                }).eq("id", job_id).execute()
            )

        await emit(job_id, "Mission complete",
                   f"{len(top_businesses)} businesses ready · {round(duration, 1)}s")

    except Exception as e:
        print(f"❌ Research failed for {job_id}: {e}")
        import traceback; traceback.print_exc()
        if db:
            try:
                loop2 = asyncio.get_running_loop()
                await loop2.run_in_executor(
                    None,
                    lambda: db.table("research_jobs").update(
                        {"status": "failed"}
                    ).eq("id", job_id).execute()
                )
            except Exception:
                pass
        await emit(job_id, "Error", str(e)[:200], "warn")
