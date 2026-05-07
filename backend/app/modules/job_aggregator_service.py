"""
Job Aggregator — Greenhouse + Lever + Remotive + Arbeitnow in parallel.
All URLs are direct career-page or job-board links.
"""

import httpx
import logging
import threading
import time
import re
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone, timedelta
from typing import List, Dict

logger = logging.getLogger(__name__)

# ── Greenhouse boards ─────────────────────────────────────────────────────────
GREENHOUSE_BOARDS: Dict[str, str] = {
    # AI / ML
    "anthropic":        "Anthropic",
    "scaleai":          "Scale AI",
    "cohere":           "Cohere",
    "wandb":            "Weights & Biases",
    "samsara":          "Samsara",
    # Cloud / Infra
    "databricks":       "Databricks",
    "cloudflare":       "Cloudflare",
    "datadog":          "Datadog",
    "snowflake":        "Snowflake",
    "hashicorp":        "HashiCorp",
    "fastly":           "Fastly",
    "pagerduty":        "PagerDuty",
    "elastic":          "Elastic",
    "neo4j":            "Neo4j",
    "planetscale":      "PlanetScale",
    "fivetran":         "Fivetran",
    "algolia":          "Algolia",
    "contentful":       "Contentful",
    # Dev Tools / Productivity
    "figma":            "Figma",
    "gitlab":           "GitLab",
    "vercel":           "Vercel",
    "webflow":          "Webflow",
    "airtable":         "Airtable",
    "netlify":          "Netlify",
    "launchdarkly":     "LaunchDarkly",
    "intercom":         "Intercom",
    "retool":           "Retool",
    "zapier":           "Zapier",
    "notion":           "Notion",
    "asana":            "Asana",
    "smartsheet":       "Smartsheet",
    # Identity / Security
    "okta":             "Okta",
    "verkada":          "Verkada",
    "snyk":             "Snyk",
    "crowdstrike":      "CrowdStrike",
    "sentinelone":      "SentinelOne",
    "checkr":           "Checkr",
    # SaaS / Enterprise
    "mongodb":          "MongoDB",
    "zendesk":          "Zendesk",
    "hubspot":          "HubSpot",
    "servicenow":       "ServiceNow",
    "workday":          "Workday",
    "qualtrics":        "Qualtrics",
    "procore":          "Procore",
    "highspot":         "Highspot",
    "palantir":         "Palantir",
    "benchling":        "Benchling",
    # Consumer / Marketplace
    "airbnb":           "Airbnb",
    "reddit":           "Reddit",
    "squarespace":      "Squarespace",
    "duolingo":         "Duolingo",
    "instacart":        "Instacart",
    "dropbox":          "Dropbox",
    "lyft":             "Lyft",
    "pinterest":        "Pinterest",
    "twitch":           "Twitch",
    "discord":          "Discord",
    "roblox":           "Roblox",
    "coupang":          "Coupang",
    # Fintech
    "stripe":           "Stripe",
    "brex":             "Brex",
    "affirm":           "Affirm",
    "marqeta":          "Marqeta",
    "sofi":             "SoFi",
    "chime":            "Chime",
    "robinhood":        "Robinhood",
    "gusto":            "Gusto",
    "mercury":          "Mercury",
    "carta":            "Carta",
    "ramp":             "Ramp",
    "rippling":         "Rippling",
    "deel":             "Deel",
    "adyen":            "Adyen",
    "toast":            "Toast",
    "zuora":            "Zuora",
    "bill":             "Bill.com",
    "flexport":         "Flexport",
    # Comms / Collab
    "twilio":           "Twilio",
    "dialpad":          "Dialpad",
    "bandwidth":        "Bandwidth",
    "sendbird":         "SendBird",
    # Sales / Marketing Tech
    "salesloft":        "SalesLoft",
    "zoominfo":         "ZoomInfo",
    "sproutsocial":     "Sprout Social",
    "klaviyo":          "Klaviyo",
    "braze":            "Braze",
    "pendo":            "Pendo",
    "amplitude":        "Amplitude",
    "mixpanel":         "Mixpanel",
    "gorgias":          "Gorgias",
    "lattice":          "Lattice",
    # Healthcare
    "oscar":            "Oscar Health",
    # Misc
    "navan":            "Navan",
    "forter":           "Forter",
    "moderntreasury":   "Modern Treasury",
}

# ── Ashby boards ─────────────────────────────────────────────────────────────
ASHBY_BOARDS: Dict[str, str] = {
    "linear":       "Linear",
    "loom":         "Loom",
    "runway":       "Runway ML",
    "perplexity":   "Perplexity AI",
    "cursor":       "Cursor",
    "replit":       "Replit",
    "mistral":      "Mistral AI",
    "moonvalley":   "Moon Valley",
    "midjourney":   "Midjourney",
    "harvey":       "Harvey",
    "ramp":         "Ramp",
    "anysphere":    "Anysphere",
    "codeium":      "Codeium",
    "together":     "Together AI",
    "modal":        "Modal",
    "prefect":      "Prefect",
    "temporal":     "Temporal",
    "sourcegraph":  "Sourcegraph",
    "clickhouse":   "ClickHouse",
    "supabase":     "Supabase",
}

# ── Lever boards ─────────────────────────────────────────────────────────────
LEVER_BOARDS: Dict[str, str] = {
    "spotify":          "Spotify",
    "plaid":            "Plaid",
    "canva":            "Canva",
    "remote":           "Remote.com",
    "automattic":       "Automattic",
    "close.io":         "Close CRM",
    "descript":         "Descript",
    "gem":              "Gem",
    "replicahq":        "Replica",
}

_TECH_ROLES = {
    "engineer", "developer", "software", "backend", "frontend", "fullstack",
    "full-stack", "devops", "sre", "platform", "infrastructure", "cloud",
    "mobile", "ios", "android", "ml", "machine learning", "ai", "data",
    "security", "analyst", "scientist", "architect", "manager", "product",
    "design", "ux", "ui", "qa", "test", "python", "java", "javascript",
    "typescript", "golang", "rust", "scala", "kotlin", "swift", "react",
    "node", "kubernetes", "docker", "aws", "gcp", "azure", "consultant",
    "sap", "erp", "crm", "salesforce", "oracle", "sap", "tableau",
}

_CACHE: OrderedDict = OrderedDict()
_CACHE_LOCK = threading.Lock()
_CACHE_TTL = 300
_CACHE_MAX = 10


def _matches(title: str, query_tokens: List[str]) -> bool:
    t = title.lower()
    if any(tok in t for tok in query_tokens):
        return True
    return any(r in t for r in _TECH_ROLES)


def _fetch_greenhouse(slug: str, name: str, query_tokens: List[str]) -> List[Dict]:
    try:
        with httpx.Client(timeout=10) as client:
            r = client.get(
                f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs",
                headers={"User-Agent": "CareerBot/1.0"},
            )
            r.raise_for_status()
        data = r.json()
    except Exception as exc:
        logger.debug("Greenhouse %s failed: %s", slug, exc)
        return []

    jobs = []
    for j in data.get("jobs", []):
        title = j.get("title", "")
        if not _matches(title, query_tokens):
            continue
        url = j.get("absolute_url", "")
        if not url:
            continue
        offices = j.get("offices", [])
        location = offices[0].get("name", "Remote") if offices else "Remote"
        depts = j.get("departments", [])
        dept = depts[0].get("name", "") if depts else ""
        jobs.append({
            "title":     title,
            "company":   name,
            "location":  location,
            "salary":    "",
            "tags":      [dept] if dept else [],
            "url":       url,
            "posted_at": j.get("updated_at", ""),
            "source":    "Greenhouse",
            "ats":       "greenhouse",
        })
    return jobs


def _fetch_lever(slug: str, name: str, query_tokens: List[str]) -> List[Dict]:
    try:
        with httpx.Client(timeout=10) as client:
            r = client.get(
                f"https://api.lever.co/v0/postings/{slug}?mode=json",
                headers={"User-Agent": "CareerBot/1.0"},
            )
            r.raise_for_status()
        data = r.json()
    except Exception as exc:
        logger.debug("Lever %s failed: %s", slug, exc)
        return []

    jobs = []
    for j in data:
        title = j.get("text", "")
        if not _matches(title, query_tokens):
            continue
        url = j.get("hostedUrl", "")
        if not url:
            continue
        categories = j.get("categories", {})
        location = categories.get("location", "Remote") or "Remote"
        team = categories.get("team", "")
        commitment = categories.get("commitment", "")
        tags = [t for t in [team, commitment] if t]
        jobs.append({
            "title":     title,
            "company":   name,
            "location":  location,
            "salary":    "",
            "tags":      tags[:3],
            "url":       url,
            "posted_at": str(j.get("createdAt", "")),
            "source":    "Lever",
            "ats":       "lever",
        })
    return jobs


def _fetch_remotive(query_tokens: List[str]) -> List[Dict]:
    query_str = " ".join(query_tokens) or "software engineer"
    try:
        with httpx.Client(timeout=15) as client:
            r = client.get(
                "https://remotive.com/api/remote-jobs",
                params={"search": query_str, "limit": 100, "location": "usa"},
                headers={"User-Agent": "CareerBot/1.0"},
            )
            r.raise_for_status()
        data = r.json()
    except Exception as exc:
        logger.debug("Remotive failed: %s", exc)
        return []

    jobs = []
    for j in data.get("jobs", []):
        title = j.get("title", "")
        url = j.get("url", "")
        if not url:
            continue
        salary = j.get("salary", "") or ""
        category = j.get("category", "")
        tags = j.get("tags", []) or []
        job_type = j.get("job_type", "")
        all_tags = list({t for t in ([category] + tags + [job_type]) if t})[:4]
        jobs.append({
            "title":        title,
            "company":      j.get("company_name", ""),
            "location":     j.get("candidate_required_location", "Remote") or "Remote",
            "salary":       salary,
            "tags":         all_tags,
            "url":          url,
            "posted_at":    j.get("publication_date", ""),
            "source":       "Remotive",
            "ats":          "remotive",
            "company_logo": j.get("company_logo", ""),
        })
    return jobs


_USA_KEYWORDS = {
    "usa", "united states", "u.s.", "u.s.a", "remote", "worldwide", "anywhere",
    # states
    "alabama","alaska","arizona","arkansas","california","colorado","connecticut",
    "delaware","florida","georgia","hawaii","idaho","illinois","indiana","iowa",
    "kansas","kentucky","louisiana","maine","maryland","massachusetts","michigan",
    "minnesota","mississippi","missouri","montana","nebraska","nevada",
    "new hampshire","new jersey","new mexico","new york","north carolina",
    "north dakota","ohio","oklahoma","oregon","pennsylvania","rhode island",
    "south carolina","south dakota","tennessee","texas","utah","vermont",
    "virginia","washington","west virginia","wisconsin","wyoming",
    # abbreviations
    "al","ak","az","ar","ca","co","ct","de","fl","ga","hi","id","il","in",
    "ia","ks","ky","la","me","md","ma","mi","mn","ms","mo","mt","ne","nv",
    "nh","nj","nm","ny","nc","nd","oh","ok","or","pa","ri","sc","sd","tn",
    "tx","ut","vt","va","wa","wv","wi","wy","dc",
}

def _is_usa_or_remote(location: str) -> bool:
    """Return True if job is USA-based, remote, or worldwide."""
    if not location:
        return True
    loc = location.lower()
    return any(kw in loc for kw in _USA_KEYWORDS)


def _fetch_himalayas(query_tokens: List[str]) -> List[Dict]:
    query_str = " ".join(query_tokens) or "software engineer"
    try:
        with httpx.Client(timeout=15) as client:
            r = client.get(
                "https://himalayas.app/jobs/api",
                params={"q": query_str, "limit": 50},
                headers={"User-Agent": "CareerBot/1.0"},
            )
            r.raise_for_status()
        data = r.json()
    except Exception as exc:
        logger.debug("Himalayas failed: %s", exc)
        return []

    jobs = []
    for j in data.get("jobs", []):
        title = j.get("title", "")
        if not _matches(title, query_tokens):
            continue
        url = j.get("applicationLink", "")
        if not url:
            continue
        salary_min = j.get("minSalary")
        salary_max = j.get("maxSalary")
        if salary_min and salary_max:
            salary = f"${salary_min:,}–${salary_max:,}"
        elif salary_min:
            salary = f"${salary_min:,}+"
        else:
            salary = ""
        restrictions = j.get("locationRestrictions") or []
        location = ", ".join(restrictions) if restrictions else "Remote"
        seniority = j.get("seniority") or []
        categories = j.get("categories") or []
        tags = list(set(seniority + categories))[:4]
        jobs.append({
            "title":        title,
            "company":      j.get("companyName", ""),
            "location":     location,
            "salary":       salary,
            "tags":         tags,
            "url":          url,
            "posted_at":    j.get("createdAt", ""),
            "source":       "Himalayas",
            "ats":          "himalayas",
            "company_logo": j.get("companyLogo", ""),
        })
    return jobs


def _fetch_ashby(slug: str, name: str, query_tokens: List[str]) -> List[Dict]:
    try:
        with httpx.Client(timeout=10) as client:
            r = client.get(
                f"https://api.ashbyhq.com/posting-api/job-board/{slug}",
                headers={"User-Agent": "CareerBot/1.0"},
            )
            r.raise_for_status()
        data = r.json()
    except Exception as exc:
        logger.debug("Ashby %s failed: %s", slug, exc)
        return []

    jobs = []
    for j in data.get("jobs", []):
        title = j.get("title", "")
        if not _matches(title, query_tokens):
            continue
        url = j.get("jobUrl") or j.get("applyUrl", "")
        if not url:
            continue
        team_raw = j.get("team", "")
        team = (team_raw.get("name", "") if isinstance(team_raw, dict) else team_raw) or j.get("department", "")
        location = j.get("location") or ("Remote" if j.get("isRemote") else "On-site")
        jobs.append({
            "title":     title,
            "company":   name,
            "location":  location,
            "salary":    "",
            "tags":      [team] if team else [],
            "url":       url,
            "posted_at": j.get("publishedAt", ""),
            "source":    "Ashby",
            "ats":       "ashby",
        })
    return jobs


def _fetch_jobicy(query_tokens: List[str]) -> List[Dict]:
    tag = " ".join(query_tokens[:2]) if query_tokens else "software engineer"
    try:
        with httpx.Client(timeout=15) as client:
            r = client.get(
                "https://jobicy.com/api/v2/remote-jobs",
                params={"count": 50, "tag": tag, "geo": "usa"},
                headers={"User-Agent": "CareerBot/1.0"},
            )
            r.raise_for_status()
        data = r.json()
    except Exception as exc:
        logger.debug("Jobicy failed: %s", exc)
        return []

    jobs = []
    for j in data.get("jobs", []):
        url = j.get("url", "")
        if not url:
            continue
        industries = j.get("jobIndustry") or []
        job_types  = j.get("jobType") or []
        tags = list({t for t in (industries + job_types) if t})[:4]
        jobs.append({
            "title":     j.get("jobTitle", ""),
            "company":   j.get("companyName", ""),
            "location":  j.get("jobGeo", "Remote") or "Remote",
            "salary":    j.get("annualSalaryMin", "") and f"${j['annualSalaryMin']:,}+" or "",
            "tags":      tags,
            "url":       url,
            "posted_at": j.get("pubDate", ""),
            "source":    "Jobicy",
            "ats":       "jobicy",
        })
    return jobs


def _fetch_adzuna(query_tokens: List[str]) -> List[Dict]:
    from app.config import settings
    app_id  = (settings.adzuna_app_id  or "").strip()
    api_key = (settings.adzuna_api_key or "").strip()
    if not app_id or not api_key:
        return []
    query_str = " ".join(query_tokens) or "software engineer"
    try:
        with httpx.Client(timeout=15) as client:
            r = client.get(
                "https://api.adzuna.com/v1/api/jobs/us/search/1",
                params={
                    "app_id":           app_id,
                    "app_key":          api_key,
                    "results_per_page": 50,
                    "what":             query_str,
                    "sort_by":          "date",
                    "content-type":     "application/json",
                },
                headers={"User-Agent": "CareerBot/1.0"},
            )
            r.raise_for_status()
        data = r.json()
    except Exception as exc:
        logger.debug("Adzuna failed: %s", exc)
        return []

    jobs = []
    for j in data.get("results", []):
        url = j.get("redirect_url", "")
        if not url:
            continue
        sal_min = j.get("salary_min")
        sal_max = j.get("salary_max")
        if sal_min and sal_max:
            salary = f"${int(sal_min):,}–${int(sal_max):,}"
        elif sal_min:
            salary = f"${int(sal_min):,}+"
        else:
            salary = ""
        category = (j.get("category") or {}).get("label", "")
        jobs.append({
            "title":     j.get("title", ""),
            "company":   (j.get("company") or {}).get("display_name", ""),
            "location":  (j.get("location") or {}).get("display_name", ""),
            "salary":    salary,
            "tags":      [category] if category else [],
            "url":       url,
            "posted_at": j.get("created", ""),
            "source":    "Adzuna",
            "ats":       "adzuna",
        })
    return jobs


def _fetch_remoteok(query_tokens: List[str]) -> List[Dict]:
    try:
        with httpx.Client(timeout=10, follow_redirects=True) as client:
            r = client.get(
                "https://remoteok.com/api",
                headers={"User-Agent": "CareerBot/1.0"},
            )
            r.raise_for_status()
        data = r.json()
    except Exception as exc:
        logger.debug("RemoteOK failed: %s", exc)
        return []

    jobs = []
    for j in data:
        if not isinstance(j, dict):
            continue
        title = j.get("position", "")
        if not title or not _matches(title, query_tokens):
            continue
        url = j.get("url", "")
        if not url:
            continue
        tags = j.get("tags") or []
        jobs.append({
            "title":     title,
            "company":   j.get("company", ""),
            "location":  "Remote",
            "salary":    j.get("salary", "") or "",
            "tags":      tags[:4],
            "url":       url,
            "posted_at": j.get("date", ""),
            "source":    "RemoteOK",
            "ats":       "remoteok",
        })
    return jobs


def _to_ts(posted_at: str) -> float:
    """Convert posted_at string to Unix timestamp for sorting. Missing = 0 (oldest)."""
    if not posted_at:
        return 0.0
    try:
        raw = str(posted_at).strip()
        if raw.isdigit():
            ms = int(raw)
            return ms / 1000 if ms > 1e11 else float(ms)
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).timestamp()
    except Exception:
        return 0.0


def _is_within_days(posted_at: str, days: int = 30) -> bool:
    if not posted_at:
        return True
    try:
        raw = str(posted_at).strip()
        if raw.isdigit():
            dt = datetime.fromtimestamp(int(raw) / 1000, tz=timezone.utc)
        else:
            dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        return dt >= datetime.now(tz=timezone.utc) - timedelta(days=days)
    except Exception:
        return True


def _fetch_all(query_tokens: List[str]) -> List[Dict]:
    """Fetch from all sources in parallel and return deduplicated jobs sorted newest-first."""
    all_jobs: List[Dict] = []
    max_workers = len(GREENHOUSE_BOARDS) + len(LEVER_BOARDS) + len(ASHBY_BOARDS) + 6

    with ThreadPoolExecutor(max_workers=min(max_workers, 25)) as pool:
        futures = {}
        for slug, name in GREENHOUSE_BOARDS.items():
            futures[pool.submit(_fetch_greenhouse, slug, name, query_tokens)] = slug
        for slug, name in LEVER_BOARDS.items():
            futures[pool.submit(_fetch_lever, slug, name, query_tokens)] = f"lever:{slug}"
        for slug, name in ASHBY_BOARDS.items():
            futures[pool.submit(_fetch_ashby, slug, name, query_tokens)] = f"ashby:{slug}"
        futures[pool.submit(_fetch_himalayas, query_tokens)]  = "_himalayas"
        futures[pool.submit(_fetch_remotive, query_tokens)]   = "_remotive"
        futures[pool.submit(_fetch_jobicy, query_tokens)]     = "_jobicy"
        futures[pool.submit(_fetch_adzuna, query_tokens)]     = "_adzuna"
        futures[pool.submit(_fetch_remoteok, query_tokens)]   = "_remoteok"

        for future in as_completed(futures):
            try:
                all_jobs.extend(future.result())
            except Exception as exc:
                logger.debug("Worker error: %s", exc)

    # Keep USA, remote, and worldwide jobs only; ATS board jobs always pass through
    ats_sources = {"Greenhouse", "Lever", "Ashby"}
    all_jobs = [
        j for j in all_jobs
        if j.get("source") in ats_sources or _is_usa_or_remote(j.get("location", ""))
    ]

    # Filter to last 60 days
    all_jobs = [j for j in all_jobs if _is_within_days(j.get("posted_at", ""), 60)]

    # Deduplicate by url
    seen: set = set()
    unique: List[Dict] = []
    for job in all_jobs:
        key = job.get("url", "")
        if key and key not in seen:
            seen.add(key)
            unique.append(job)

    # Sort newest first; fall back to relevance for jobs without a date
    unique.sort(key=lambda j: _to_ts(j.get("posted_at", "")), reverse=True)
    return unique


class JobAggregatorService:

    def get_career_jobs(self, query: str, limit: int = 200) -> List[Dict]:
        cache_key = query.strip().lower()
        now = time.time()

        with _CACHE_LOCK:
            cached = _CACHE.get(cache_key)

        if cached:
            age = now - cached[0]
            if age < _CACHE_TTL:
                logger.info("Job cache hit for '%s'", query)
                return cached[1][:limit]
            # Serve stale while refreshing in background
            threading.Thread(
                target=self._refresh_cache, args=(cache_key,), daemon=True
            ).start()
            logger.info("Job cache stale for '%s', serving stale + background refresh", query)
            return cached[1][:limit]

        query_tokens = [tok.lower() for tok in query.split() if len(tok) > 2]
        result = _fetch_all(query_tokens)

        with _CACHE_LOCK:
            _CACHE[cache_key] = (time.time(), result)
            if len(_CACHE) > _CACHE_MAX:
                _CACHE.popitem(last=False)

        logger.info("Jobs for '%s': %d results", query, len(result))
        return result[:limit]

    def _refresh_cache(self, cache_key: str) -> None:
        query_tokens = [tok.lower() for tok in cache_key.split() if len(tok) > 2]
        result = _fetch_all(query_tokens)
        with _CACHE_LOCK:
            _CACHE[cache_key] = (time.time(), result)
            if len(_CACHE) > _CACHE_MAX:
                _CACHE.popitem(last=False)
        logger.info("Background refresh done for '%s': %d jobs", cache_key, len(result))
