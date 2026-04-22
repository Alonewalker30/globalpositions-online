import requests
import logging

logger = logging.getLogger(__name__)

HN_ALGOLIA_BASE = "https://hn.algolia.com/api/v1/search"
DEVTO_BASE = "https://dev.to/api/articles"


class IndustryNewsService:
    """Fetches trending tech industry news from HackerNews and DEV.to (free, no key)."""

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "ResumeAIBuilder/1.0"})

    def fetch_hn_stories(self, query: str, limit: int = 10) -> list[dict]:
        """Fetch top HackerNews stories for a query."""
        try:
            resp = self.session.get(
                HN_ALGOLIA_BASE,
                params={
                    "query": query,
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
                    "num_comments": h.get("num_comments", 0),
                    "author": h.get("author"),
                    "created_at": h.get("created_at", "")[:10],
                    "source": "hackernews",
                }
                for h in hits
                if h.get("title")
            ]
        except Exception as e:
            logger.warning(f"HN stories API error: {e}")
            return []

    def fetch_devto_articles(self, tag: str, limit: int = 8) -> list[dict]:
        """Fetch trending DEV.to articles for a tech tag."""
        clean_tag = tag.lower().replace(" ", "").replace(".", "").replace("+", "plus")
        try:
            resp = self.session.get(
                DEVTO_BASE,
                params={"tag": clean_tag, "per_page": limit, "top": 7},
                timeout=10,
            )
            resp.raise_for_status()
            articles = resp.json()
            return [
                {
                    "title": a.get("title"),
                    "url": a.get("url"),
                    "tags": a.get("tag_list", []),
                    "reactions": a.get("positive_reactions_count", 0),
                    "reading_time": a.get("reading_time_minutes", 0),
                    "published_at": (a.get("published_at") or "")[:10],
                    "author": a.get("user", {}).get("name", ""),
                    "source": "devto",
                }
                for a in articles
                if a.get("title")
            ]
        except Exception as e:
            logger.warning(f"DEV.to API error for tag '{tag}': {e}")
            return []

    def get_industry_news(self, skills: list[str], job_title: str) -> dict:
        """Aggregate trending news for a professional's skill set."""
        primary_query = job_title
        hn_stories = self.fetch_hn_stories(primary_query, limit=10)

        # Fetch dev.to articles for top 2 skills
        devto_articles: list[dict] = []
        for skill in skills[:2]:
            devto_articles.extend(self.fetch_devto_articles(skill, limit=5))

        # Also fetch HN for top skill if different from job title
        if skills and skills[0].lower() not in job_title.lower():
            skill_news = self.fetch_hn_stories(skills[0], limit=5)
            hn_stories = (hn_stories + skill_news)[:15]

        # Sort by points
        hn_stories.sort(key=lambda x: x.get("points", 0), reverse=True)
        devto_articles.sort(key=lambda x: x.get("reactions", 0), reverse=True)

        return {
            "hn_stories": hn_stories[:10],
            "devto_articles": devto_articles[:8],
        }
