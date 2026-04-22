import requests
import xml.etree.ElementTree as ET
import logging
import time
from urllib.parse import quote

logger = logging.getLogger(__name__)

ARXIV_BASE = "https://export.arxiv.org/api/query"
GITHUB_BASE = "https://api.github.com/search/repositories"


class SkillsAdvisorService:
    """Fetches learning resources from arXiv and GitHub (both free, no API key required)."""

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "ResumeAIBuilder/1.0"})

    def fetch_arxiv_papers(self, skill: str, max_results: int = 5) -> list[dict]:
        """Search arXiv for recent papers on a skill/technology."""
        try:
            resp = self.session.get(
                ARXIV_BASE,
                params={
                    "search_query": f"all:{quote(skill)}",
                    "start": 0,
                    "max_results": max_results,
                    "sortBy": "submittedDate",
                    "sortOrder": "descending",
                },
                timeout=20,
            )
            resp.raise_for_status()

            ns = {"atom": "http://www.w3.org/2005/Atom"}
            root = ET.fromstring(resp.text)
            papers = []

            for entry in root.findall("atom:entry", ns):
                title_el = entry.find("atom:title", ns)
                summary_el = entry.find("atom:summary", ns)
                id_el = entry.find("atom:id", ns)
                published_el = entry.find("atom:published", ns)

                papers.append(
                    {
                        "title": (title_el.text or "").strip().replace("\n", " "),
                        "summary": (summary_el.text or "").strip()[:200],
                        "url": (id_el.text or "").strip(),
                        "published": (published_el.text or "")[:10],
                        "source": "arxiv",
                    }
                )

            return papers
        except Exception as e:
            logger.warning(f"arXiv API error for '{skill}': {e}")
            return []

    def fetch_github_trending(self, skill: str, limit: int = 6) -> list[dict]:
        """Find top GitHub repositories for a skill/technology."""
        try:
            resp = self.session.get(
                GITHUB_BASE,
                params={
                    "q": f"{skill} in:name,description,topics",
                    "sort": "stars",
                    "order": "desc",
                    "per_page": limit,
                },
                timeout=10,
            )
            resp.raise_for_status()
            items = resp.json().get("items", [])
            return [
                {
                    "full_name": r.get("full_name"),
                    "description": (r.get("description") or "")[:120],
                    "stargazers_count": r.get("stargazers_count", 0),
                    "language": r.get("language"),
                    "topics": r.get("topics", [])[:5],
                    "url": r.get("html_url"),
                    "source": "github",
                }
                for r in items
            ]
        except Exception as e:
            logger.warning(f"GitHub API error for '{skill}': {e}")
            return []

    def get_skill_resources(self, skills: list[str]) -> dict:
        """Aggregate learning resources for the top skills."""
        top_skills = skills[:3]

        all_repos: list[dict] = []
        all_papers: list[dict] = []

        for i, skill in enumerate(top_skills):
            repos = self.fetch_github_trending(skill, limit=4)
            all_repos.extend(repos)
            # Only fetch arXiv for the most relevant/academic skill, with rate-limit gap
            if i == 0:
                papers = self.fetch_arxiv_papers(skill, max_results=5)
                all_papers.extend(papers)
                if papers:
                    time.sleep(1)  # polite pause between arXiv calls
            elif i < 2:
                time.sleep(1)
                papers = self.fetch_arxiv_papers(skill, max_results=3)
                all_papers.extend(papers)

        # Deduplicate repos by full_name
        seen_repos: set[str] = set()
        unique_repos = []
        for r in all_repos:
            key = r.get("full_name", "")
            if key and key not in seen_repos:
                seen_repos.add(key)
                unique_repos.append(r)

        return {
            "github_repos": sorted(unique_repos, key=lambda x: x.get("stargazers_count", 0), reverse=True)[:10],
            "arxiv_papers": all_papers[:8],
        }
