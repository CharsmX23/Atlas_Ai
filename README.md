# Atlas AI — Autonomous Business Research Platform

**Autonomous Business Intelligence Platform**

Atlas AI is an autonomous intelligence platform that deploys 12 parallel research agents across the open web, cross-verifies data, removes duplicates with fuzzy matching, and streams live results to the browser in real time.

---

## Architecture

| Layer | Stack | Deployment |
|-------|-------|-----------|
| Frontend | Next.js 14 + Tailwind + Framer Motion | Vercel |
| Backend | Python FastAPI | Railway |
| Database | Supabase (PostgreSQL + Realtime) | Supabase cloud |

---

## Research Agents (12 parallel)

| Agent | Source |
|-------|--------|
| Google Search | DuckDuckGo → Google results |
| Yelp | Business listings + reviews |
| LinkedIn | Professional profiles |
| Yellow Pages | Directory listings |
| BBB Verifier | Better Business Bureau accreditation |
| Healthgrades | Medical professionals |
| Avvo / Justia | Legal professionals |
| Government License DB | State licensing records |
| Industry Directories | Niche vertical directories |
| Website Detail | Direct business website scrape |
| Image Collector | Business photo assets |
| Quality Auditor | Cross-source confidence audit |

All searches use **DuckDuckGo** — free, no API key required.

---

## Features

| Requirement | Implementation |
|------------|---------------|
| 12-agent parallel search | `asyncio.gather()` — all agents fire simultaneously |
| Cross-source verification | Source count → confidence score (0–100) |
| Conflict detection | `has_conflict` + `conflict_data` per business |
| Fuzzy deduplication | RapidFuzz `token_sort_ratio ≥ 88` |
| Real-time streaming | Supabase Realtime → Postgres changes subscription |
| Source reliability scoring | Per-domain weights (Healthgrades 0.96 → Facebook 0.72) |
| Full business schema | name, address, phone, email, website, hours, rating, services, license, certifications, awards, social profiles, source URLs |
| Research caching | `research_jobs` table — re-queryable at any time |
| Analytics dashboard | Live KPIs, data quality metrics, top queries |
| Projects | Save and organize research collections |

---

## Local Setup

### Prerequisites
- Node.js 18+, Python 3.11+
- A Supabase project (free tier)
- Railway account (backend deployment)

### 1. Clone & install frontend
```bash
git clone <repo>
cd Atlas_Ai
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_BACKEND_URL
```

### 3. Apply migrations
```bash
supabase db push
```

### 4. Start frontend
```bash
npm run dev
# → http://localhost:3000
```

### 5. Start backend
```bash
cd backend
pip install -r requirements.txt
cp ../.env.example .env
# Fill in: SUPABASE_URL, SUPABASE_SERVICE_KEY
uvicorn main:app --reload --port 8000
```

---

## Deployment

### Backend → Railway
1. Connect repo, set root directory to `backend/`
2. Add env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ALLOWED_ORIGINS`
3. Railway auto-detects `Procfile` and deploys

### Frontend → Vercel
1. Connect repo to Vercel
2. Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_BACKEND_URL`
3. Vercel auto-detects Next.js and deploys

---

## Demo Flow

1. User types **"Cardiologists in Birmingham"**
2. Frontend calls Railway FastAPI → job created in Supabase
3. Backend fires 12 parallel agent searches
4. Each agent completion → `agent_events` INSERT → Supabase Realtime → live timeline update
5. Deduplication + confidence scoring → results saved to `businesses`
6. `research_jobs.status = 'complete'` → Realtime UPDATE → frontend transitions to ResultsView
7. Ranked business cards with verified badges, sort/filter, and research summary stats

**Fallback:** if `NEXT_PUBLIC_BACKEND_URL` is unreachable, the UI plays a mock animation and never crashes.

---

## API Reference

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/research` | Start a job `{query, mode}` → `{job_id}` |
| `GET` | `/research/{job_id}` | Full job + all businesses |
| `GET` | `/research/{job_id}/status` | Job status + stats |
| `GET` | `/health` | `{"status":"ok","version":"1.0.0"}` |
