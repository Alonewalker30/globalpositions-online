"""
Trending Skills — fetches real question counts from StackOverflow Tags API.
Returns normalized demand scores for a curated set of tech skills.
Cache TTL: 24 hours (SO anonymous quota is 300 req/day).
"""

import gzip
import httpx
import logging
import time
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

_CACHE: Dict[str, Any] = {}
_CACHE_TTL = 86400  # 24 hours

_SKILLS = [
    "python", "javascript", "typescript", "java", "go", "rust", "kotlin",
    "swift", "c++", "react.js", "node.js", "aws", "docker", "kubernetes",
    "postgresql", "mongodb", "redis", "graphql", "pytorch", "tensorflow",
    "fastapi", "next.js", "vue.js", "git", "linux",
]

_SO_BASE = "https://api.stackexchange.com/2.3/tags"


def _fetch_page(tags_batch: List[str]) -> Dict[str, int]:
    """Fetch question counts for up to 20 tags in one request."""
    joined = ";".join(tags_batch)
    counts: Dict[str, int] = {}
    try:
        with httpx.Client(timeout=15) as client:
            r = client.get(
                f"{_SO_BASE}/{joined}/info",
                params={"site": "stackoverflow"},
                headers={"Accept-Encoding": "gzip"},
            )
            r.raise_for_status()
        # httpx decompresses gzip automatically
        data = r.json()
        for item in data.get("items", []):
            counts[item["name"]] = item.get("count", 0)
    except Exception as exc:
        logger.debug("SO tags API failed: %s", exc)
    return counts


class TrendingSkillsService:

    def get_trending_skills(self) -> List[Dict[str, Any]]:
        cached = _CACHE.get("trending")
        if cached and (time.time() - cached["ts"]) < _CACHE_TTL:
            return cached["data"]

        # Batch into groups of 20 (SO limit)
        batches = [_SKILLS[i:i + 20] for i in range(0, len(_SKILLS), 20)]
        all_counts: Dict[str, int] = {}
        for batch in batches:
            all_counts.update(_fetch_page(batch))

        if not all_counts:
            # Return stale cache if available
            if "trending" in _CACHE:
                return _CACHE["trending"]["data"]
            return []

        max_count = max(all_counts.values()) or 1
        result = []
        for skill in _SKILLS:
            count = all_counts.get(skill, all_counts.get(skill.replace(".", ""), 0))
            result.append({
                "skill": skill,
                "count": count,
                "score": round(count / max_count * 100, 1),
            })

        # Sort by count descending
        result.sort(key=lambda x: x["count"], reverse=True)

        _CACHE["trending"] = {"ts": time.time(), "data": result}
        logger.info("Fetched trending skills: top=%s (%d)", result[0]["skill"] if result else "", len(result))
        return result
