"""
Job Aggregator — queries Greenhouse and Lever ATS boards in parallel.
Every URL returned is a direct company career page (no easy-apply).
"""

import httpx
import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict

logger = logging.getLogger(__name__)

# ── Greenhouse boards (slug → display name) ──────────────────────────────────
GREENHOUSE_BOARDS: Dict[str, str] = {
    # Original
    "anthropic":        "Anthropic",
    "stripe":           "Stripe",
    "databricks":       "Databricks",
    "cloudflare":       "Cloudflare",
    "datadog":          "Datadog",
    "okta":             "Okta",
    "mongodb":          "MongoDB",
    "elastic":          "Elastic",
    "coinbase":         "Coinbase",
    "brex":             "Brex",
    "figma":            "Figma",
    "gitlab":           "GitLab",
    "discord":          "Discord",
    "lyft":             "Lyft",
    "pinterest":        "Pinterest",
    "twilio":           "Twilio",
    "robinhood":        "Robinhood",
    "dropbox":          "Dropbox",
    "instacart":        "Instacart",
    "gusto":            "Gusto",
    "mercury":          "Mercury",
    "vercel":           "Vercel",
    "amplitude":        "Amplitude",
    "mixpanel":         "Mixpanel",
    "pagerduty":        "PagerDuty",
    "fastly":           "Fastly",
    "carta":            "Carta",
    "checkr":           "Checkr",
    "lattice":          "Lattice",
    "neo4j":            "Neo4j",
    "twitch":           "Twitch",
    # FAANG-adjacent / Big Tech
    "reddit":           "Reddit",
    "shopify":          "Shopify",
    "zoom":             "Zoom",
    "atlassian":        "Atlassian",
    "palantir":         "Palantir",
    "hubspot":          "HubSpot",
    "squarespace":      "Squarespace",
    "duolingo":         "Duolingo",
    "asana":            "Asana",
    "box":              "Box",
    "zendesk":          "Zendesk",
    # Fintech
    "affirm":           "Affirm",
    "marqeta":          "Marqeta",
    "sofi":             "SoFi",
    "nerdwallet":       "NerdWallet",
    "plaid":            "Plaid",
    "chime":            "Chime",
    "ramp":             "Ramp",
    "moderntreasury":   "Modern Treasury",
    "rippling":         "Rippling",
    "toast":            "Toast",
    "recurly":          "Recurly",
    "zuora":            "Zuora",
    "chargebee":        "Chargebee",
    "avalara":          "Avalara",
    # AI / ML
    "openai":           "OpenAI",
    "cohere":           "Cohere",
    "anyscale":         "Anyscale",
    "wandb":            "Weights & Biases",
    "pinecone":         "Pinecone",
    "scale-ai":         "Scale AI",
    "glean":            "Glean",
    "perplexity":       "Perplexity AI",
    # Developer tools / infra
    "hashicorp":        "HashiCorp",
    "confluent":        "Confluent",
    "retool":           "Retool",
    "webflow":          "Webflow",
    "airtable":         "Airtable",
    "zapier":           "Zapier",
    "netlify":          "Netlify",
    "cloudinary":       "Cloudinary",
    "algolia":          "Algolia",
    "launchdarkly":     "LaunchDarkly",
    "contentful":       "Contentful",
    "dbtlabs":          "dbt Labs",
    "fivetran":         "Fivetran",
    "airbyte":          "Airbyte",
    "supabase":         "Supabase",
    "planetscale":      "PlanetScale",
    "temporal":         "Temporal",
    "clickup":          "ClickUp",
    "miro":             "Miro",
    "loom":             "Loom",
    "linear":           "Linear",
    "notion":           "Notion",
    "intercom":         "Intercom",
    # Sales / Marketing tech
    "gong":             "Gong",
    "outreach":         "Outreach",
    "salesloft":        "SalesLoft",
    "zoominfo":         "ZoomInfo",
    "sproutsocial":     "Sprout Social",
    "klaviyo":          "Klaviyo",
    "braze":            "Braze",
    "drift":            "Drift",
    "pendo":            "Pendo",
    "fullstory":        "FullStory",
    "heap":             "Heap",
    "smartsheet":       "Smartsheet",
    "qualtrics":        "Qualtrics",
    "medallia":         "Medallia",
    # Security
    "verkada":          "Verkada",
    "lacework":         "Lacework",
    "snyk":             "Snyk",
    "wiz":              "Wiz",
    "cyberark":         "CyberArk",
    "tenable":          "Tenable",
    "darktrace":        "Darktrace",
    # Healthcare / Biotech
    "benchling":        "Benchling",
    "veeva":            "Veeva",
    "epic":             "Epic",
    "hims":             "Hims & Hers",
    "ro":               "Ro",
    "oscar":            "Oscar Health",
    "tempus":           "Tempus",
    # Communications / Collaboration
    "dialpad":          "Dialpad",
    "talkdesk":         "Talkdesk",
    "sendbird":         "SendBird",
    "bandwidth":        "Bandwidth",
    "ringcentral":      "RingCentral",
    # E-commerce / Logistics
    "doordash":         "DoorDash",
    "airbnb":           "Airbnb",
    "flexport":         "Flexport",
    "shipbob":          "ShipBob",
    "goshippo":         "Shippo",
    "easypost":         "EasyPost",
    # HR tech
    "leapsome":         "Leapsome",
    "culture-amp":      "Culture Amp",
    "15five":           "15Five",
    "hibob":            "HiBob",
    "personio":         "Personio",
    # Other
    "ironclad":         "Ironclad",
    "g2":               "G2",
    "segment":          "Segment",
    "navan":            "Navan",
}

# ── Lever boards (slug → display name) ───────────────────────────────────────
LEVER_BOARDS: Dict[str, str] = {
    "netflix":          "Netflix",
    "spotify":          "Spotify",
    "canva":            "Canva",
    "flexport":         "Flexport",
    "duolingo":         "Duolingo",
    "benchling":        "Benchling",
    "verkada":          "Verkada",
    "ironclad":         "Ironclad",
    "navan":            "Navan",
    "rippling":         "Rippling",
    "plaid":            "Plaid",
    "chime":            "Chime",
    "scale":            "Scale AI",
    "launchdarkly":     "LaunchDarkly",
    "contentful":       "Contentful",
    "heap":             "Heap",
    "pendo":            "Pendo",
    "gainsight":        "Gainsight",
    "optimizely":       "Optimizely",
    "brainly":          "Brainly",
    "postman":          "Postman",
    "hashicorp":        "HashiCorp",
    "figma":            "Figma",
    "gitlab":           "GitLab",
    "discord":          "Discord",
    "notion":           "Notion",
    "airtable":         "Airtable",
    "vercel":           "Vercel",
    "linear":           "Linear",
    "retool":           "Retool",
    "webflow":          "Webflow",
    "loom":             "Loom",
}

_TECH_ROLES = {
    "engineer", "developer", "software", "backend", "frontend", "fullstack",
    "full-stack", "devops", "sre", "platform", "infrastructure", "cloud",
    "mobile", "ios", "android", "ml", "machine learning", "ai", "data",
    "security", "analyst", "scientist", "architect", "manager", "product",
    "design", "ux", "ui", "qa", "test", "python", "java", "javascript",
    "typescript", "golang", "rust", "scala", "kotlin", "swift",
}

_CACHE: Dict[str, tuple] = {}
_CACHE_TTL = 600  # 10 minutes


def _matches(title: str, query_tokens: List[str]) -> bool:
    t = title.lower()
    if any(tok in t for tok in query_tokens):
        return True
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
        with httpx.Client(timeout=12) as client:
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


class JobAggregatorService:

    def get_career_jobs(self, query: str, limit: int = 80) -> List[Dict]:
        cache_key = f"{query.lower().strip()}:{limit}"
        cached = _CACHE.get(cache_key)
        if cached and (time.time() - cached[0]) < _CACHE_TTL:
            logger.info("Job cache hit for '%s'", query)
            return cached[1]

        query_tokens = [tok.lower() for tok in query.split() if len(tok) > 2]

        all_jobs: List[Dict] = []
        max_workers = len(GREENHOUSE_BOARDS) + len(LEVER_BOARDS) + 1

        with ThreadPoolExecutor(max_workers=min(max_workers, 50)) as pool:
            futures = {}
            for slug, name in GREENHOUSE_BOARDS.items():
                futures[pool.submit(_fetch_greenhouse, slug, name, query_tokens)] = slug
            for slug, name in LEVER_BOARDS.items():
                futures[pool.submit(_fetch_lever, slug, name, query_tokens)] = f"lever:{slug}"
            futures[pool.submit(_fetch_himalayas, query_tokens)] = "_himalayas"

            for future in as_completed(futures):
                try:
                    all_jobs.extend(future.result())
                except Exception as exc:
                    logger.debug("Worker error: %s", exc)

        # Deduplicate by title + company
        seen: set = set()
        unique: List[Dict] = []
        for job in all_jobs:
            key = f"{job['title'].lower()}|{job['company'].lower()}"
            if key not in seen:
                seen.add(key)
                unique.append(job)

        def score(j: Dict) -> int:
            t = j["title"].lower()
            return sum(1 for tok in query_tokens if tok in t)

        unique.sort(key=score, reverse=True)
        result = unique[:limit]

        _CACHE[cache_key] = (time.time(), result)
        logger.info(
            "Fetched %d jobs for '%s' (raw: %d, GH: %d, Lever: %d)",
            len(result), query, len(all_jobs),
            len(GREENHOUSE_BOARDS), len(LEVER_BOARDS),
        )
        return result
