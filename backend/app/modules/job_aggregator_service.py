"""
Job Aggregator — queries public Greenhouse ATS boards in parallel.
Every URL returned is a direct company career page (full application form, no easy-apply).
"""

import httpx
import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Confirmed-active Greenhouse company boards (slug → display name)
GREENHOUSE_BOARDS: Dict[str, str] = {
    "anthropic":   "Anthropic",
    "stripe":      "Stripe",
    "databricks":  "Databricks",
    "cloudflare":  "Cloudflare",
    "datadog":     "Datadog",
    "okta":        "Okta",
    "mongodb":     "MongoDB",
    "elastic":     "Elastic",
    "coinbase":    "Coinbase",
    "brex":        "Brex",
    "figma":       "Figma",
    "gitlab":      "GitLab",
    "discord":     "Discord",
    "lyft":        "Lyft",
    "pinterest":   "Pinterest",
    "twilio":      "Twilio",
    "robinhood":   "Robinhood",
    "dropbox":     "Dropbox",
    "instacart":   "Instacart",
    "gusto":       "Gusto",
    "mercury":     "Mercury",
    "vercel":      "Vercel",
    "amplitude":   "Amplitude",
    "mixpanel":    "Mixpanel",
    "pagerduty":   "PagerDuty",
    "fastly":      "Fastly",
    "carta":       "Carta",
    "checkr":      "Checkr",
    "lattice":     "Lattice",
    "neo4j":       "Neo4j",
    "twitch":      "Twitch",
}

# Keywords used to match jobs against the search query
_TECH_ROLES = {
    "engineer", "developer", "software", "backend", "frontend", "fullstack",
    "full-stack", "devops", "sre", "platform", "infrastructure", "cloud",
    "mobile", "ios", "android", "ml", "machine learning", "ai", "data",
    "security", "analyst", "scientist", "architect", "manager", "product",
    "design", "ux", "ui", "qa", "test", "python", "java", "javascript",
    "typescript", "golang", "rust", "scala", "kotlin", "swift",
}

# Simple in-process cache: (query_key) → (timestamp, jobs_list)
_CACHE: Dict[str, tuple] = {}
_CACHE_TTL = 600  # 10 minutes


def _matches(title: str, query_tokens: List[str]) -> bool:
    """Return True if the job title is relevant to the search."""
    t = title.lower()
    # If query tokens match, keep it
    if any(tok in t for tok in query_tokens):
        return True
    # Fall back: keep anything that looks like a tech role
    return any(r in t for r in _TECH_ROLES)


def _fetch_greenhouse(slug: str, name: str, query_tokens: List[str]) -> List[Dict]:
    try:
        with httpx.Client(timeout=12) as client:
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

        # Location from offices array
        offices = j.get("offices", [])
        location = offices[0].get("name", "Remote") if offices else "Remote"

        # Department
        depts = j.get("departments", [])
        dept = depts[0].get("name", "") if depts else ""

        jobs.append({
            "title": title,
            "company": name,
            "location": location,
            "salary": "",
            "tags": [dept] if dept else [],
            "url": url,
            "posted_at": j.get("updated_at", ""),
            "source": "Greenhouse",
            "ats": "greenhouse",
        })
    return jobs


def _fetch_himalayas(query_tokens: List[str]) -> List[Dict]:
    """Fetch remote jobs from Himalayas public API."""
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
            "title": title,
            "company": j.get("companyName", ""),
            "location": location,
            "salary": salary,
            "tags": tags,
            "url": url,
            "posted_at": j.get("createdAt", ""),
            "source": "Himalayas",
            "ats": "himalayas",
            "company_logo": j.get("companyLogo", ""),
        })
    return jobs


class JobAggregatorService:

    def get_career_jobs(self, query: str, limit: int = 80) -> List[Dict]:
        cache_key = f"{query.lower().strip()}:{limit}"
        cached = _CACHE.get(cache_key)
        if cached and (time.time() - cached[0]) < _CACHE_TTL:
            logger.info("Job cache hit for '%s'", query)
            return cached[1]

        query_tokens = [tok.lower() for tok in query.split() if len(tok) > 2]

        all_jobs: List[Dict] = []
        with ThreadPoolExecutor(max_workers=17) as pool:
            futures = {
                pool.submit(_fetch_greenhouse, slug, name, query_tokens): slug
                for slug, name in GREENHOUSE_BOARDS.items()
            }
            futures[pool.submit(_fetch_himalayas, query_tokens)] = "_himalayas"
            for future in as_completed(futures):
                try:
                    all_jobs.extend(future.result())
                except Exception as exc:
                    logger.debug("Worker error: %s", exc)

        # Deduplicate by title+company
        seen: set = set()
        unique: List[Dict] = []
        for job in all_jobs:
            key = f"{job['title'].lower()}|{job['company'].lower()}"
            if key not in seen:
                seen.add(key)
                unique.append(job)

        # Score relevance: exact query token hits rank higher
        def score(j: Dict) -> int:
            t = j["title"].lower()
            return sum(1 for tok in query_tokens if tok in t)

        unique.sort(key=score, reverse=True)
        result = unique[:limit]

        _CACHE[cache_key] = (time.time(), result)
        logger.info("Fetched %d career jobs for '%s' (from %d raw)", len(result), query, len(all_jobs))
        return result
