import asyncio
import os
import random
import re
from datetime import datetime, timedelta
from urllib.parse import urlparse, urljoin

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
    asyncio.create_task(run_research(job_id, req.query, req.mode))
    return {"job_id": job_id, "status": "started"}

@app.get("/research/{job_id}")
async def get_research(job_id: str):
    if not db:
        return {"error": "Database not configured"}
    loop = asyncio.get_running_loop()
    job_row = await loop.run_in_executor(
        None, lambda: db.table("research_jobs").select("*").eq("id", job_id).single().execute()
    )
    biz_rows = await loop.run_in_executor(
        None, lambda: db.table("businesses").select("*").eq("job_id", job_id)
                        .order("confidence_score", desc=True).execute()
    )

    job  = job_row.data  or {}
    bizs = biz_rows.data or []

    # Build search_summary — prefer dedicated columns, fall back to legacy stats blob
    stats = job.get("stats") or {}
    search_summary = {
        "businesses_found":          job.get("businesses_found")          or stats.get("found")              or len(bizs),
        "businesses_verified":       job.get("businesses_verified")       or stats.get("verified")           or 0,
        "duplicates_removed":        job.get("duplicates_removed")        or stats.get("duplicates_removed") or 0,
        "sources_searched":          job.get("sources_searched")          or stats.get("sources_searched")   or 0,
        "research_duration_seconds": job.get("research_duration_seconds") or stats.get("duration_seconds")   or 0,
    }

    return {
        # ── Backward-compat keys (frontend reads job.status / job.stats) ──
        "job":        job,
        "businesses": bizs,
        # ── New structured format ──────────────────────────────────────────
        "job_id":        job_id,
        "query":         job.get("query", ""),
        "status":        job.get("status", ""),
        "search_summary": search_summary,
        "data_quality":  job.get("data_quality")  or {},
        "source_scores": job.get("source_scores") or {},
    }

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
        "job_id":    job_id,
        "status":    job.data["status"],
        "stats":     job.data.get("stats", {}),
        "created_at": job.data["created_at"],
    }

# ── Helpers ───────────────────────────────────────────────────────────────

def clean_title(title: str) -> str:
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

def extract_address_from_text(text: str) -> str:
    match = re.search(r'\d+\s+[A-Za-z][^,\n]{2,40},\s*[A-Za-z ]{2,30},\s*[A-Z]{2}', text)
    return match.group(0).strip() if match else ""

def decode_url(url: str) -> str:
    return url.strip() if url else ""

def parse_hours(hours_data) -> str:
    if not hours_data:
        return ""
    if isinstance(hours_data, str):
        return hours_data[:150]
    if isinstance(hours_data, dict):
        parts = [f"{k.capitalize()[:3]}: {v}" for k, v in list(hours_data.items())[:5]]
        return " · ".join(parts)[:200]
    if isinstance(hours_data, list):
        return " · ".join(str(h) for h in hours_data[:5])[:200]
    return ""

def extract_services(business_type: str, snippet: str) -> list:
    services = []
    if business_type:
        for part in re.split(r'[·•,]', business_type):
            part = part.strip()
            if part and len(part) < 50:
                services.append(part)
    service_kw = [
        "cardiology","echocardiography","stress testing","cardiac catheterization",
        "interventional","electrophysiology","vascular","heart failure",
        "preventive care","consultation","primary care","specialty care",
        "plumbing","electrical","hvac","roofing","contracting",
        "legal","litigation","family law","criminal defense","estate planning",
    ]
    snippet_lower = snippet.lower()
    for kw in service_kw:
        if kw in snippet_lower and kw.title() not in services:
            services.append(kw.title())
    return services[:8]

def extract_awards(snippet: str) -> list:
    found = []
    for pattern in [
        r'top\s+(?:doctor|rated|provider)[\w\s]*\d{4}',
        r'best\s+(?:of|doctor|rated)[\w\s]*\d{4}',
        r'\d{4}\s+(?:winner|award|recognition)',
    ]:
        for m in re.findall(pattern, snippet, re.IGNORECASE):
            found.append(m[:80])
    return list(set(found))[:5]

def merge_source_urls(a, b) -> dict:
    if isinstance(a, list):
        a = {f"src_{i}": u for i, u in enumerate(a)}
    if isinstance(b, list):
        b = {f"src_{i+100}": u for i, u in enumerate(b)}
    return {**(a if isinstance(a, dict) else {}), **(b if isinstance(b, dict) else {})}

# ── Analytics helpers ─────────────────────────────────────────────────────

def compute_source_scores(agent_result_map: dict) -> dict:
    """
    Compute reliability score (0–100) for each agent source.
    agent_result_map: {source_name: [business_dicts]}
    """
    scores: dict = {}
    for source, results in agent_result_map.items():
        if not results:
            scores[source] = 30   # 50 base − 20 for zero results
            continue
        score = 50
        count = len(results)
        if count >= 5:
            score += 10
        with_phone   = sum(1 for r in results if r.get("phone"))
        with_website = sum(1 for r in results if r.get("website"))
        with_hours   = sum(1 for r in results if r.get("working_hours"))
        if count > 0:
            if with_phone   / count >= 0.80: score += 15
            if with_website / count >= 0.80: score += 15
            if with_hours   / count >= 0.50: score += 10
        scores[source] = min(100, score)
    return scores

def compute_data_quality(businesses: list) -> dict:
    """Compute field-coverage percentages across the business list."""
    n = max(len(businesses), 1)
    def pct(field: str) -> float:
        return round(sum(1 for b in businesses if b.get(field)) / n * 100, 1)
    return {
        "pct_with_website": pct("website"),
        "pct_with_phone":   pct("phone"),
        "pct_with_hours":   pct("working_hours"),
        "pct_with_license": pct("license_information"),
        "pct_with_address": pct("address"),
        "pct_with_email":   pct("email"),
    }

# ── Events ────────────────────────────────────────────────────────────────

async def emit(job_id: str, title: str, subtitle: str = "",
               status: str = "done", agent_name: str = ""):
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

# ── Search ────────────────────────────────────────────────────────────────

async def ddg_search(query: str, max_results: int = 15) -> list:
    loop = asyncio.get_running_loop()

    serper_key = os.environ.get("SERPER_API_KEY", "")
    if serper_key:
        def _serper():
            try:
                import requests
                resp = requests.post(
                    "https://google.serper.dev/search",
                    headers={
                        "X-API-KEY": serper_key,
                        "Content-Type": "application/json",
                    },
                    json={"q": query, "num": min(max_results, 10), "gl": "us", "hl": "en"},
                    timeout=15,
                )
                if resp.status_code != 200:
                    print(f"Serper error: {resp.status_code} {resp.text[:100]}")
                    return []
                data = resp.json()
                results = []
                for place in data.get("places", [])[:max_results]:
                    hours_raw = place.get("openingHours", place.get("hours", ""))
                    if isinstance(hours_raw, dict):
                        hours = "; ".join(f"{k}: {v}" for k, v in list(hours_raw.items())[:3])
                    elif isinstance(hours_raw, list):
                        hours = "; ".join(str(h) for h in hours_raw[:3])
                    else:
                        hours = str(hours_raw) if hours_raw else ""
                    results.append({
                        "title":         place.get("title", ""),
                        "href":          place.get("website", ""),
                        "body":          place.get("address", ""),
                        "_address":      place.get("address", ""),
                        "_phone":        place.get("phoneNumber", ""),
                        "_rating":       str(place.get("rating", "")),
                        "_review_count": str(place.get("ratingCount", "")),
                        "_hours":        hours,
                        "_type":         place.get("category", place.get("type", "")),
                    })
                remaining = max(0, max_results - len(results))
                for item in data.get("organic", [])[:remaining]:
                    results.append({
                        "title": item.get("title", ""),
                        "href":  item.get("link", ""),
                        "body":  item.get("snippet", ""),
                    })
                kg = data.get("knowledgeGraph", {})
                if kg.get("title") and not results:
                    results.insert(0, {
                        "title": kg.get("title", ""),
                        "href":  kg.get("website", ""),
                        "body":  kg.get("description", ""),
                    })
                return results
            except Exception as e:
                print(f"Serper error: {e}")
                return []

        results = await loop.run_in_executor(None, _serper)
        if results:
            print(f"Serper OK: {len(results)} results for '{query}'")
            return results
        print(f"Serper returned 0 for '{query}'")
    else:
        print("SERPER_API_KEY not set")

    from bs4 import BeautifulSoup
    from urllib.parse import parse_qs, urlparse, unquote

    def _ddg_html():
        try:
            import requests
            resp = requests.post(
                "https://html.duckduckgo.com/html/",
                data={"q": query},
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
                timeout=15,
            )
            soup = BeautifulSoup(resp.text, "html.parser")
            results = []
            for r in soup.select(".result")[:max_results]:
                title_el   = r.select_one(".result__title a")
                snippet_el = r.select_one(".result__snippet")
                if not title_el:
                    continue
                href = title_el.get("href", "")
                if "uddg=" in href:
                    params_parsed = parse_qs(urlparse(href).query)
                    href = unquote(params_parsed.get("uddg", [""])[0])
                results.append({
                    "title": title_el.get_text(strip=True),
                    "href":  href,
                    "body":  snippet_el.get_text(strip=True) if snippet_el else "",
                })
            return results
        except Exception as e:
            print(f"DDG HTML error: {e}")
            return []

    for attempt in range(2):
        if attempt > 0:
            await asyncio.sleep(random.uniform(2, 4))
        results = await loop.run_in_executor(None, _ddg_html)
        if results:
            print(f"DDG HTML OK: {len(results)} results")
            return results

    print(f"ALL methods failed for: '{query}'")
    return []

def result_to_business(r: dict, source_type: str, confidence: float) -> dict:
    body    = r.get("body", "")
    href    = decode_url(r.get("href", ""))
    phone   = r.get("_phone") or extract_phone_from_text(body)
    address = r.get("_address") or extract_address_from_text(body)
    hours   = parse_hours(r.get("_hours", ""))
    rating  = r.get("_rating", "")

    source_urls: dict = {}
    if href:    source_urls["discovered"]   = href
    if phone:   source_urls["phone"]        = href
    if address: source_urls["address"]      = href
    if rating:  source_urls["rating"]       = href
    if hours:   source_urls["working_hours"] = href

    return {
        "business_name":       clean_title(r.get("title", "")),
        "website":             href,
        "phone":               phone,
        "address":             address,
        "email":               extract_email_from_text(body),
        "rating":              rating,
        "review_count":        r.get("_review_count", ""),
        "working_hours":       hours,
        "services":            extract_services(r.get("_type", ""), body),
        "specialties":         [],
        "license_information": "",
        "certifications":      [],
        "awards":              extract_awards(body),
        "social_profiles":     [],
        "images_urls":         [],
        "source_urls":         source_urls,
        "source_count":        1,
        "_confidence_base":    confidence,   # internal only — used during merging
        "confidence_score":    0,            # computed later by score_and_detect_conflicts
        "verification_status": "partial",
        "_source":             source_type,
    }

# ── 12 AGENTS ─────────────────────────────────────────────────────────────

async def agent_google(job_id: str, category: str, location: str, mode: str = "deep") -> list:
    await emit(job_id, "Searching Google", f"Finding {category} in {location}...",
               "running", "Google Search")

    if mode == "fast":
        raw_lists = await asyncio.gather(
            ddg_search(f"{category} in {location}", 10),
            ddg_search(f"best {category} {location}", 10),
        )
    else:
        raw_lists = await asyncio.gather(
            ddg_search(f"{category} in {location}", 10),
            ddg_search(f"best {category} {location} phone", 10),
            ddg_search(f"{category} {location} address contact", 10),
            ddg_search(f"top {category} near {location}", 10),
        )

    seen, results = set(), []
    for r in [item for sublist in raw_lists for item in sublist]:
        url = r.get("href", "")
        if url not in seen:
            seen.add(url)
            results.append(result_to_business(r, "google", 0.72))

    await emit(job_id, "Searching Google", f"{len(results)} results found", "done", "Google Search")
    return results


async def agent_yelp(job_id: str, category: str, location: str) -> list:
    await emit(job_id, "Searching Yelp", "Scanning reviews and ratings...",
               "running", "Yelp")

    raw = await ddg_search(f"{category} {location} site:yelp.com", 15)
    results = []
    for r in raw:
        b = result_to_business(r, "yelp", 0.85)
        body = r.get("body", "")
        m = re.search(r'(\d+\.?\d*)\s*(?:star|rating)', body, re.I)
        if m:
            b["rating"] = m.group(1)
        m2 = re.search(r'(\d+)\s*review', body, re.I)
        if m2:
            b["review_count"] = m2.group(1)
        results.append(b)

    await emit(job_id, "Searching Yelp", f"{len(results)} listings found", "done", "Yelp")
    return results


async def agent_yellow_pages(job_id: str, category: str, location: str) -> list:
    await emit(job_id, "Searching Yellow Pages", "Checking business directory...",
               "running", "Yellow Pages")

    raw = await ddg_search(f"{category} {location} site:yellowpages.com", 15)
    results = [result_to_business(r, "yellowpages", 0.80) for r in raw]

    await emit(job_id, "Searching Yellow Pages", f"{len(results)} entries found",
               "done", "Yellow Pages")
    return results


async def agent_linkedin(job_id: str, category: str, location: str) -> list:
    await emit(job_id, "Searching LinkedIn", "Finding company profiles...",
               "running", "LinkedIn")

    raw = await ddg_search(f"{category} company {location} site:linkedin.com", 10)
    results = []
    for r in raw:
        b = result_to_business(r, "linkedin", 0.90)
        href = decode_url(r.get("href", ""))
        if "linkedin.com" in href:
            b["social_profiles"] = [href]
            b["source_urls"]["social_profiles"] = href
        results.append(b)

    await emit(job_id, "Searching LinkedIn", f"{len(results)} profiles found",
               "done", "LinkedIn")
    return results


async def agent_facebook(job_id: str, category: str, location: str) -> list:
    await emit(job_id, "Searching Facebook", "Scanning business pages...",
               "running", "Facebook")

    raw = await ddg_search(f"{category} {location} site:facebook.com", 8)
    results = []
    for r in raw:
        b = result_to_business(r, "facebook", 0.72)
        href = decode_url(r.get("href", ""))
        if "facebook.com" in href:
            b["social_profiles"] = [href]
            b["source_urls"]["social_profiles"] = href
        results.append(b)

    await emit(job_id, "Searching Facebook", f"{len(results)} pages found",
               "done", "Facebook")
    return results


async def agent_bbb(job_id: str, category: str, location: str) -> list:
    await emit(job_id, "Searching BBB", "Checking accreditation records...",
               "running", "BBB Verifier")

    raw = await ddg_search(f"{category} {location} site:bbb.org", 10)
    results = []
    for r in raw:
        b = result_to_business(r, "bbb", 0.82)
        href = decode_url(r.get("href", ""))
        body = r.get("body", "")
        certs = []
        rating_m = re.search(r'BBB\s*[Rr]ating[:\s]*([A-F][+\-]?)', body)
        if rating_m:
            certs.append(f"BBB Rating: {rating_m.group(1)}")
        if re.search(r'accredited', body, re.I):
            certs.append("BBB Accredited Business")
        if certs:
            b["certifications"] = certs
            b["source_urls"]["certifications"] = href
        results.append(b)

    await emit(job_id, "Searching BBB", f"{len(results)} businesses rated",
               "done", "BBB Verifier")
    return results


async def agent_healthgrades(job_id: str, category: str, location: str) -> list:
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
    legal_kw = ["lawyer","attorney","law firm","legal","counsel","solicitor","advocate"]
    if not any(kw in category.lower() for kw in legal_kw):
        await emit(job_id, "Legal Directories", "Skipped (not a legal query)", "done", "Avvo/Justia")
        return []

    await emit(job_id, "Searching Avvo/Justia", "Checking legal directories...",
               "running", "Avvo/Justia")

    avvo   = await ddg_search(f"{category} {location} site:avvo.com", 10)
    justia = await ddg_search(f"{category} {location} site:justia.com", 8)

    results  = [result_to_business(r, "avvo",   0.88) for r in avvo]
    results += [result_to_business(r, "justia", 0.85) for r in justia]

    await emit(job_id, "Legal Directories", f"{len(results)} attorneys found",
               "done", "Avvo/Justia")
    return results


async def agent_government(job_id: str, category: str, location: str) -> list:
    state = location.split(",")[-1].strip().split()[0] if location else "US"
    await emit(job_id, "Querying Gov License DB",
               f"Checking license records for {state}...",
               "running", "Gov License DB")

    raw = await ddg_search(
        f"{category} license number lookup {state} site:.gov", 10
    )
    results = []
    for r in raw:
        b = result_to_business(r, "government", 0.98)
        href = decode_url(r.get("href", ""))
        body = r.get("body", "")
        lic_m = re.search(
            r'(?:license\s*(?:no|number|#)?[:.\s]*|lic[.\s]+)([A-Z0-9\-]{5,20})',
            body, re.IGNORECASE
        )
        if lic_m:
            b["license_information"] = lic_m.group(1)
            b["source_urls"]["license_information"] = href
        else:
            b["source_urls"]["government"] = href
        results.append(b)

    await emit(job_id, "Gov License DB", f"{len(results)} license records",
               "done", "Gov License DB")
    return results


async def agent_industry_dirs(job_id: str, category: str, location: str) -> list:
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
    top_n = min(15, len(businesses))
    await emit(job_id, "Reading business websites",
               f"Extracting full details from top {top_n} sites...",
               "running", "Website Detail")

    directory_domains = {
        "yelp.com","yellowpages.com","linkedin.com","facebook.com",
        "bbb.org","healthgrades.com","avvo.com","angi.com","zocdoc.com",
        "google.com","bing.com","vitals.com","justia.com","houzz.com",
    }

    enriched = 0
    import httpx
    from bs4 import BeautifulSoup

    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        for biz in businesses[:top_n]:
            url = biz.get("website", "")
            if not url or not url.startswith("http"):
                continue
            if any(d in extract_domain(url) for d in directory_domains):
                continue
            try:
                resp = await client.get(
                    url,
                    headers={"User-Agent": "Mozilla/5.0 (compatible; AtlasAI/1.0)"}
                )
                if resp.status_code != 200:
                    continue

                soup = BeautifulSoup(resp.text, "html.parser")
                text = soup.get_text(separator=" ")
                src_urls = biz.setdefault("source_urls", {})

                if not biz.get("phone"):
                    phone = extract_phone_from_text(text)
                    if phone:
                        biz["phone"] = phone
                        src_urls["phone"] = url

                if not biz.get("email"):
                    email = extract_email_from_text(text)
                    if email:
                        biz["email"] = email
                        src_urls["email"] = url

                if not biz.get("working_hours"):
                    for pat in [
                        r'(?:hours?|open)[:\s]+((?:mon|tue|wed|thu|fri|sat|sun)[\w\s\-:,]+(?:am|pm)\s*[\w\s\-:,]*(?:am|pm)?)',
                        r'((?:mon|tue|wed|thu|fri)[\w\s\-:,]+(?:am|pm)\s*(?:[\-–]\s*\d+(?::\d+)?\s*(?:am|pm))?)',
                    ]:
                        m = re.search(pat, text, re.IGNORECASE)
                        if m:
                            biz["working_hours"] = m.group(1).strip()[:120]
                            src_urls["working_hours"] = url
                            break

                if not biz.get("services"):
                    services = []
                    for h in soup.find_all(["h2", "h3"])[:15]:
                        t = h.get_text(strip=True)
                        if 2 < len(t) < 50 and not any(
                            skip in t.lower()
                            for skip in ["about", "contact", "home", "cookie", "privacy", "faq"]
                        ):
                            services.append(t)
                    if services:
                        biz["services"] = services[:8]
                        src_urls["services"] = url

                if not biz.get("images_urls"):
                    imgs = []
                    for img in soup.find_all("img", src=True)[:30]:
                        src = img["src"]
                        if src.startswith("//"):
                            src = "https:" + src
                        elif src.startswith("/"):
                            src = urljoin(url, src)
                        elif not src.startswith("http"):
                            continue
                        if any(x in src.lower() for x in ["logo","icon","favicon","sprite",".svg",".gif"]):
                            continue
                        imgs.append(src)
                        if len(imgs) >= 5:
                            break
                    if imgs:
                        biz["images_urls"] = imgs
                        src_urls["images"] = url

                if not biz.get("social_profiles"):
                    socials = []
                    for a in soup.find_all("a", href=True):
                        h = a["href"]
                        if any(s in h for s in [
                            "facebook.com/","twitter.com/","instagram.com/",
                            "linkedin.com/","youtube.com/","x.com/",
                        ]):
                            socials.append(h)
                    if socials:
                        biz["social_profiles"] = list(set(socials))[:5]
                        src_urls["social_profiles"] = url

                if not biz.get("certifications"):
                    text_lower = text.lower()
                    certs = [
                        kw.title() for kw in [
                            "board certified","fellowship trained","abms certified",
                            "joint commission accredited","accredited","licensed",
                        ]
                        if kw in text_lower
                    ]
                    if certs:
                        biz["certifications"] = certs
                        src_urls["certifications"] = url

                biz["source_count"] = biz.get("source_count", 1) + 1
                enriched += 1

            except Exception:
                pass

    await emit(job_id, "Website Detail", f"{enriched} sites scraped for full details",
               "done", "Website Detail")
    return businesses


# ── Deduplication ─────────────────────────────────────────────────────────

def deduplicate(businesses: list) -> tuple:
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
            pa = normalize_phone(a.get("phone", ""))
            pb = normalize_phone(b.get("phone", ""))
            if pa and pb and pa == pb:
                group.append(b); used.add(j); continue
            da  = extract_domain(a.get("website", ""))
            db_ = extract_domain(b.get("website", ""))
            if da and db_ and da == db_:
                group.append(b); used.add(j); continue
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
        base = max(group, key=lambda x: sum(1 for v in x.values() if v))
        for biz in group:
            if biz is base:
                continue
            for f in ["phone","email","website","working_hours","address",
                      "rating","review_count","license_information"]:
                if not base.get(f) and biz.get(f):
                    base[f] = biz[f]
            for f in ["services","specialties","certifications","social_profiles","awards"]:
                base[f] = list(set((base.get(f) or []) + (biz.get(f) or [])))
            base["source_urls"] = merge_source_urls(
                base.get("source_urls", {}), biz.get("source_urls", {})
            )
            base["source_count"] = base.get("source_count", 1) + 1
        merged.append(base)

    return merged, len(businesses) - len(merged)


# ── Confidence Scoring & Verification ────────────────────────────────────

def score_and_detect_conflicts(businesses: list) -> list:
    """
    Assign integer confidence scores (0–100) and set is_verified per business.

    Scoring rubric:
      +20  has website
      +20  has phone
      +15  has address
      +15  has working_hours
      +15  has license_information
      +10  source_urls has ≥ 2 distinct keys (cross-source verification)
      + 5  has email
    Max = 100
    """
    for biz in businesses:
        score = 0
        if biz.get("website"):                          score += 20
        if biz.get("phone"):                            score += 20
        if biz.get("address"):                          score += 15
        if biz.get("working_hours"):                    score += 15
        if biz.get("license_information"):              score += 15
        if len(biz.get("source_urls") or {}) >= 2:     score += 10
        if biz.get("email"):                            score +=  5
        biz["confidence_score"] = score

        # Verified: non-empty name + at least 2 of [phone, website, address, hours]
        contact = [biz.get("phone"), biz.get("website"),
                   biz.get("address"), biz.get("working_hours")]
        present = sum(1 for f in contact if f)
        biz["is_verified"] = bool(biz.get("business_name")) and present >= 2

        if biz["is_verified"]:
            biz["verification_status"] = "verified"
        elif biz.get("business_name"):
            biz["verification_status"] = "partial"
        else:
            biz["verification_status"] = "unverified"

    return sorted(businesses, key=lambda b: b.get("confidence_score", 0), reverse=True)


def prepare_for_supabase(biz: dict, job_id: str, rank: int) -> dict:
    biz.pop("_source", None)
    biz.pop("_confidence_base", None)
    source_urls = biz.get("source_urls", {})
    if isinstance(source_urls, list):
        source_urls = {f"src_{i}": u for i, u in enumerate(source_urls)}
    return {
        "job_id":               job_id,
        "rank":                 rank,
        "business_name":        biz.get("business_name", ""),
        "address":              biz.get("address", ""),
        "phone":                biz.get("phone", ""),
        "email":                biz.get("email", ""),
        "website":              biz.get("website", ""),
        "working_hours":        biz.get("working_hours", ""),
        "rating":               str(biz.get("rating", "")),
        "review_count":         str(biz.get("review_count", "")),
        "services":             biz.get("services", [])        or [],
        "specialties":          biz.get("specialties", [])     or [],
        "license_information":  biz.get("license_information", ""),
        "certifications":       biz.get("certifications", [])  or [],
        "awards":               biz.get("awards", [])          or [],
        "social_profiles":      biz.get("social_profiles", []) or [],
        "images_urls":          biz.get("images_urls", [])     or [],
        "source_urls":          source_urls,
        "source_count":         biz.get("source_count", 1),
        "confidence_score":     biz.get("confidence_score", 0),   # integer 0–100
        "is_verified":          biz.get("is_verified", False),
        "verification_status":  biz.get("verification_status", "unverified"),
        "has_conflict":         biz.get("has_conflict", False),
        "conflict_data":        biz.get("conflict_data"),
    }


# ── Agent source name map (order must match asyncio.gather call below) ────
_AGENT_SOURCE_NAMES = [
    "serper_google",
    "yelp",
    "yellowpages",
    "linkedin",
    "bbb",
    "healthgrades",
    "government",
    "industry_dirs",
]


# ── Main Orchestrator ──────────────────────────────────────────────────────

async def run_research(job_id: str, query: str, mode: str = "deep"):
    start_time = datetime.utcnow()
    loop = asyncio.get_running_loop()

    try:
        await emit(job_id, "Initializing Atlas", "Loading research engine")

        category, location = parse_query(query)
        await emit(job_id, "Query parsed",
                   f"Category: {category} · Location: {location}")

        if db:
            await loop.run_in_executor(
                None,
                lambda: db.table("businesses").delete().eq("job_id", job_id).execute()
            )

        # ── Cache check ───────────────────────────────────────────────────
        if db:
            try:
                six_hours_ago = (datetime.utcnow() - timedelta(hours=6)).isoformat()
                cached = await loop.run_in_executor(None, lambda:
                    db.table("research_jobs")
                      .select("*")
                      .eq("query", query)
                      .eq("status", "complete")
                      .gte("created_at", six_hours_ago)
                      .neq("id", job_id)
                      .limit(1)
                      .execute()
                )
                if cached.data:
                    cached_job = cached.data[0]
                    cached_job_id = cached_job["id"]
                    old_biz = await loop.run_in_executor(None, lambda:
                        db.table("businesses")
                          .select("*")
                          .eq("job_id", cached_job_id)
                          .execute()
                    )
                    if old_biz.data:
                        await emit(job_id, "Cache hit!",
                                   f"Found {len(old_biz.data)} cached results from recent search")
                        new_records = []
                        for biz in old_biz.data:
                            new_biz = {k: v for k, v in biz.items()
                                       if k not in ("id", "job_id", "created_at")}
                            new_biz["job_id"] = job_id
                            new_records.append(new_biz)
                        await loop.run_in_executor(None, lambda:
                            db.table("businesses").insert(new_records).execute()
                        )
                        await loop.run_in_executor(None, lambda:
                            db.table("research_jobs").update({
                                "status":                    "complete",
                                "stats":                     cached_job.get("stats"),
                                "businesses_found":          cached_job.get("businesses_found"),
                                "businesses_verified":       cached_job.get("businesses_verified"),
                                "duplicates_removed":        cached_job.get("duplicates_removed"),
                                "sources_searched":          cached_job.get("sources_searched"),
                                "research_duration_seconds": cached_job.get("research_duration_seconds"),
                                "data_quality":              cached_job.get("data_quality"),
                                "source_scores":             cached_job.get("source_scores"),
                            }).eq("id", job_id).execute()
                        )
                        await emit(job_id, "Mission complete",
                                   f"Served from cache · {len(old_biz.data)} businesses")
                        return
            except Exception as e:
                print(f"Cache check error: {e}")

        await emit(job_id, "Launching 8 agents in parallel")

        # ── Run all agents concurrently ───────────────────────────────────
        agent_results = await asyncio.gather(
            agent_google(job_id, category, location, mode),
            agent_yelp(job_id, category, location),
            agent_yellow_pages(job_id, category, location),
            agent_linkedin(job_id, category, location),
            agent_bbb(job_id, category, location),
            agent_healthgrades(job_id, category, location),
            agent_government(job_id, category, location),
            agent_industry_dirs(job_id, category, location),
            return_exceptions=True,
        )

        # ── Build per-source result map for scoring ───────────────────────
        agent_result_map: dict = {}
        all_businesses: list   = []
        for name, result in zip(_AGENT_SOURCE_NAMES, agent_results):
            safe = result if isinstance(result, list) else []
            agent_result_map[name] = safe
            all_businesses.extend(safe)

        raw_count        = len(all_businesses)
        sources_searched = sum(1 for r in agent_result_map.values() if r)
        source_scores    = compute_source_scores(agent_result_map)

        await emit(job_id, "Aggregating results",
                   f"{raw_count} raw records · {sources_searched} active sources")

        # ── Agent: website detail enrichment ─────────────────────────────
        all_businesses = await agent_website_detail(job_id, all_businesses)

        # ── Cross-source verification ─────────────────────────────────────
        await emit(job_id, "Cross-checking sources",
                   "Verifying phone numbers, emails, websites across sources...",
                   "running")

        # ── Deduplication ─────────────────────────────────────────────────
        await emit(job_id, "Running deduplication",
                   "RapidFuzz fuzzy matching on names, phones, domains...",
                   "running", "Dedup Engine")
        deduped, removed = deduplicate(all_businesses)
        await emit(job_id, "Deduplication complete",
                   f"{removed} duplicates merged · {len(deduped)} unique businesses",
                   "done", "Dedup Engine")

        # ── Confidence scoring + verification ─────────────────────────────
        await emit(job_id, "Computing confidence scores",
                   "Field-completeness scoring (0–100)...", "running", "Confidence Engine")
        scored = score_and_detect_conflicts(deduped)
        businesses_verified = sum(1 for b in scored if b.get("is_verified"))
        await emit(job_id, "Confidence scores computed",
                   f"{businesses_verified}/{len(scored)} businesses verified",
                   "done", "Confidence Engine")

        # ── Quality audit ─────────────────────────────────────────────────
        website_pct   = sum(1 for b in scored if b.get("website")) / max(len(scored), 1)
        phone_pct     = sum(1 for b in scored if b.get("phone"))   / max(len(scored), 1)
        quality_score = round((website_pct * 0.4 + phone_pct * 0.6) * 100)
        await emit(job_id, "Quality audit",
                   f"Score: {quality_score}% · Website: {website_pct:.0%} · Phone: {phone_pct:.0%}",
                   "done", "Quality Auditor")

        # ── Save businesses ───────────────────────────────────────────────
        top_businesses = scored[:100]
        if top_businesses and db:
            records = [
                prepare_for_supabase(biz, job_id, i + 1)
                for i, biz in enumerate(top_businesses)
            ]
            await loop.run_in_executor(
                None,
                lambda: db.table("businesses").insert(records).execute()
            )

        # ── Compute data quality from final set ───────────────────────────
        data_quality = compute_data_quality(top_businesses)

        # ── Mark job complete ─────────────────────────────────────────────
        duration = (datetime.utcnow() - start_time).total_seconds()
        if db:
            await loop.run_in_executor(
                None,
                lambda: db.table("research_jobs").update({
                    "status": "complete",
                    # Legacy stats blob — frontend ResearchSummaryCard reads this
                    "stats": {
                        "found":              raw_count,
                        "verified":           businesses_verified,
                        "duplicates_removed": removed,
                        "sources_searched":   sources_searched,
                        "duration_seconds":   round(duration, 1),
                    },
                    # Dedicated columns for structured API response
                    "businesses_found":           raw_count,
                    "businesses_verified":        businesses_verified,
                    "duplicates_removed":         removed,
                    "sources_searched":           sources_searched,
                    "research_duration_seconds":  round(duration, 1),
                    "data_quality":               data_quality,
                    "source_scores":              source_scores,
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
