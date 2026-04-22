import requests
import logging
from typing import Optional

logger = logging.getLogger(__name__)

REMOTIVE_BASE = "https://remotive.com/api/remote-jobs"
HN_ALGOLIA_BASE = "https://hn.algolia.com/api/v1/search"


class JobMarketService:
    """Fetches live job market data from free public APIs (no key required)."""

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "ResumeAIBuilder/1.0"})

    # Keywords that signal a tech/engineering role
    _TECH_KEYWORDS = {
        "engineer", "developer", "dev", "software", "backend", "frontend", "fullstack",
        "full-stack", "full stack", "data", "ml", "ai", "machine learning", "devops",
        "cloud", "python", "java", "react", "node", "golang", "rust", "typescript",
        "infrastructure", "platform", "sre", "security", "architect", "analytics",
        "mobile", "ios", "android", "embedded", "firmware", "qa", "test", "sdet",
        "research", "scientist", "nlp", "vision", "deep learning",
    }

    def _is_tech_job(self, job: dict) -> bool:
        title = (job.get("title") or "").lower()
        return any(kw in title for kw in self._TECH_KEYWORDS)

    def fetch_remote_jobs(self, search_term: str, limit: int = 20) -> list[dict]:
        """Fetch remote tech jobs from Remotive API."""
        try:
            resp = self.session.get(
                REMOTIVE_BASE,
                params={"search": search_term, "limit": limit},
                timeout=10,
            )
            resp.raise_for_status()
            jobs = resp.json().get("jobs", [])
            results = [
                {
                    "title": j.get("title"),
                    "company": j.get("company_name"),
                    "location": j.get("candidate_required_location", "Remote"),
                    "salary": j.get("salary", ""),
                    "tags": j.get("tags", []),
                    "description": j.get("description", "")[:300],
                    "url": j.get("url"),
                    "posted_at": j.get("publication_date", ""),
                    "source": "remotive",
                }
                for j in jobs
            ]
            # Keep only tech-related postings
            return [j for j in results if self._is_tech_job(j)]
        except Exception as e:
            logger.warning(f"Remotive API error: {e}")
            return []

    def fetch_hn_job_posts(self, query: str, limit: int = 10) -> list[dict]:
        """Fetch job-related posts from HackerNews via Algolia search API."""
        try:
            resp = self.session.get(
                HN_ALGOLIA_BASE,
                params={
                    "query": f"{query} hiring",
                    "tags": "story",
                    "hitsPerPage": limit,
                },
                timeout=10,
            )
            resp.raise_for_status()
            hits = resp.json().get("hits", [])
            return [
                {
                    "title": h.get("title"),
                    "url": h.get("url") or f"https://news.ycombinator.com/item?id={h.get('objectID')}",
                    "points": h.get("points", 0),
                    "author": h.get("author"),
                    "created_at": h.get("created_at", ""),
                    "source": "hackernews",
                }
                for h in hits
                if h.get("title")
            ]
        except Exception as e:
            logger.warning(f"HN Algolia job API error: {e}")
            return []

    def get_market_data(self, job_title: str, skills: Optional[list[str]] = None) -> dict:
        """Aggregate job market data for a role."""
        remote_jobs = self.fetch_remote_jobs(job_title, limit=20)

        # Also search by primary skill if provided
        skill_jobs = []
        if skills:
            primary_skill = skills[0] if skills else ""
            skill_jobs = self.fetch_remote_jobs(primary_skill, limit=10)

        hn_jobs = self.fetch_hn_job_posts(job_title, limit=10)

        # Deduplicate by title+company
        all_jobs = remote_jobs + skill_jobs
        seen = set()
        unique_jobs = []
        for j in all_jobs:
            key = f"{j.get('title')}|{j.get('company')}"
            if key not in seen:
                seen.add(key)
                unique_jobs.append(j)

        return {
            "live_jobs": unique_jobs[:25],
            "hn_posts": hn_jobs,
            "total_found": len(unique_jobs),
        }
