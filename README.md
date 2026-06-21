# Atlas AI — Autonomous Business Research Platform

**Chettinad CodeFest 2026 · Grand Finale · June 25, 2026**

Atlas AI is an autonomous agent that researches businesses across 12 data sources in parallel, cross-verifies information, removes duplicates with fuzzy matching, and streams results in real time.

---

## Architecture

| Layer | Stack | Deployment |
|-------|-------|-----------|
| Frontend | Next.js 13 + shadcn/ui + Framer Motion | Netlify / Antigravity |
| Backend | Python FastAPI | Railway |
| Database | Supabase (PostgreSQL + Realtime) | Supabase cloud |

---

## Sources Searched (per PDF requirements)

Google · Yelp · Yellow Pages · LinkedIn · BBB · Healthgrades (medical) · Avvo / Justia (legal) + general DDG reviews — **8 parallel queries per search**

All via **DuckDuckGo Search** — free, no API key required.

---

## Features matching competition PDF requirements

| Requirement | Implementation |
|------------|---------------|
| Multi-source parallel search | `asyncio.gather()` — 8 DDG queries fired simultaneously |
| Cross-source verification | Source count → confidence score (0.60 base + 0.05 per source) |
| Conflict detection | `has_conflict` + `conflict_data` fields on businesses table |
| Fuzzy deduplication | RapidFuzz `token_sort_ratio ≥ 88` |
| Real-time streaming | Supabase Realtime → frontend Postgres changes subscription |
| Source reliability scoring | Per-domain weights (Healthgrades 0.96 → Facebook 0.72) |
| Full business schema | name, address, phone, email, website, hours, rating, services, license, certifications, awards, social profiles, source URLs |
| Caching | `research_jobs` table — re-queryable at any time |
| Export | JSON via GET /research/{job_id} |

---

## Local Setup

### Prerequisites
- Node.js 18+, Python 3.11+
- A Supabase project (free tier is fine)
- Railway account (for backend deployment)

### 1. Clone & install frontend
```bash
git clone <repo>
cd Atlas_Ai
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
# Edit .env.local — fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_BACKEND_URL
```

### 3. Run Supabase migrations
Apply all files in `supabase/migrations/` via the Supabase SQL editor or CLI:
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
# Edit .env — fill in SUPABASE_URL and SUPABASE_SERVICE_KEY
uvicorn main:app --reload --port 8000
```

---

## Deployment

### Backend → Railway
1. Create a new Railway project, connect this repo
2. Set **root directory** to `backend/`
3. Add env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ALLOWED_ORIGINS`
4. Railway auto-detects `Procfile` and `runtime.txt`

### Frontend → Netlify
1. Connect repo to Netlify
2. Build command: `npx next build`  |  Publish dir: `.next`
3. Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_BACKEND_URL`

---

## Demo flow

1. User types **"Cardiologists in Birmingham"**
2. Frontend calls Railway FastAPI → job created in Supabase
3. Backend fires 8 parallel DDG searches + Healthgrades
4. Each agent completion → `agent_events` INSERT → Supabase Realtime → frontend timeline updates live
5. Deduplication + confidence scoring → results saved to `businesses` table
6. `research_jobs.status = 'complete'` → Realtime UPDATE → frontend transitions to results in under a second
7. Real business names, websites, and confidence scores displayed

**Fallback guarantee:** if `NEXT_PUBLIC_BACKEND_URL` is not set or the backend is unreachable, the UI plays a mock animation and never crashes.

---

## API Reference

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/research` | Start a research job `{query, mode}` → `{job_id}` |
| `GET` | `/research/{job_id}` | Full job + all businesses |
| `GET` | `/research/{job_id}/status` | Job status + stats |
| `GET` | `/health` | `{"status":"ok","version":"1.0.0"}` |
# test
