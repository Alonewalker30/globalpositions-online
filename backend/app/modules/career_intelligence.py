import json
from typing import Optional
from app.modules.claude_service import ClaudeService


class CareerIntelligenceService:
    """Orchestrates multiple public APIs + AI to generate career intelligence reports."""

    def __init__(self):
        svc = ClaudeService()
        self.client = svc.client
        self.model = svc.model
        self.mode = svc.mode

    def _chat(self, prompt: str, max_tokens: int = 1500, system: str = "") -> str:
        if self.mode == "groq":
            msgs = []
            if system:
                msgs.append({"role": "system", "content": system})
            msgs.append({"role": "user", "content": prompt})
            r = self.client.chat.completions.create(model=self.model, max_tokens=max_tokens, messages=msgs)
            return r.choices[0].message.content.strip()
        else:
            kwargs = {"model": self.model, "max_tokens": max_tokens, "messages": [{"role": "user", "content": prompt}]}
            if system:
                kwargs["system"] = system
            r = self.client.messages.create(**kwargs)
            return r.content[0].text.strip()

    def generate_intelligence_report(
        self,
        skills: list[str],
        job_title: str,
        years_experience: int,
        target_role: Optional[str],
        industry: str,
        live_jobs: list[dict],
        hn_news: list[dict],
        github_repos: list[dict],
        arxiv_papers: list[dict],
    ) -> dict:
        """Claude synthesizes all live API data into an actionable career intelligence report."""

        skills_str = ", ".join(skills)
        target = target_role or job_title

        jobs_summary = "\n".join(
            f"- {j.get('title')} at {j.get('company')} ({j.get('location', 'Remote')})"
            for j in live_jobs[:10]
        )

        news_summary = "\n".join(
            f"- {n.get('title')} (score: {n.get('points', 0)})"
            for n in hn_news[:8]
        )

        repos_summary = "\n".join(
            f"- {r.get('full_name')} ⭐{r.get('stargazers_count')} — {r.get('description', '')[:80]}"
            for r in github_repos[:6]
        )

        papers_summary = "\n".join(
            f"- {p.get('title')}"
            for p in arxiv_papers[:5]
        )

        prompt = f"""You are a senior career intelligence analyst. Using live market data below, generate a comprehensive career intelligence report for a professional.

PROFILE:
- Current skills: {skills_str}
- Current role: {job_title}
- Years of experience: {years_experience}
- Target role: {target}
- Industry: {industry}

LIVE JOB MARKET DATA (from job boards right now):
{jobs_summary or "No live jobs fetched."}

TRENDING TECH NEWS (HackerNews top stories):
{news_summary or "No news fetched."}

TRENDING GITHUB REPOSITORIES (most starred in their tech space):
{repos_summary or "No repos fetched."}

LATEST RESEARCH PAPERS (arXiv):
{papers_summary or "No papers fetched."}

Generate a JSON report with this exact structure:
{{
  "market_demand_score": <integer 0-100, how hot is this role right now>,
  "market_summary": "<2-3 sentence summary of current market conditions for this role>",
  "salary_range": {{
    "low": "<e.g. $90k>",
    "mid": "<e.g. $120k>",
    "high": "<e.g. $160k>",
    "currency": "USD"
  }},
  "top_hiring_companies": ["company1", "company2", "company3", "company4", "company5"],
  "skills_in_demand": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "skills_gap": [
    {{
      "skill": "skill name",
      "urgency": "high|medium|low",
      "reason": "why this matters for the target role"
    }}
  ],
  "career_path": [
    {{
      "step": 1,
      "role": "role title",
      "timeline": "e.g. 6-12 months",
      "key_skills_needed": ["skill1", "skill2"]
    }}
  ],
  "industry_trends": ["trend1", "trend2", "trend3"],
  "action_items": [
    {{
      "priority": "high|medium|low",
      "action": "specific actionable step",
      "timeline": "e.g. this week / this month / next 3 months"
    }}
  ],
  "learning_resources": [
    {{
      "type": "github|arxiv|course|book",
      "title": "resource title",
      "url": "url if known",
      "relevance": "why this is useful"
    }}
  ],
  "market_insight": "<one compelling insight about the job market that most candidates miss>"
}}

Return ONLY valid JSON."""

        text = self._chat(prompt, max_tokens=3000, system="You are a career intelligence analyst. Always respond with valid JSON only.")
        try:
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            return json.loads(text.strip())
        except json.JSONDecodeError:
            return {"raw": text}

    def analyze_job_match_score(
        self, resume_skills: list[str], job_listings: list[dict]
    ) -> list[dict]:
        """Score each live job listing against the user's skills."""

        if not job_listings:
            return []

        skills_str = ", ".join(resume_skills)
        jobs_str = json.dumps(
            [{"title": j.get("title"), "tags": j.get("tags", []), "description": j.get("description", "")[:200]} for j in job_listings[:10]],
            indent=2,
        )

        prompt = f"""Given a candidate with skills: {skills_str}

Score each of these job listings for fit (0-100) and explain briefly.

Jobs:
{jobs_str}

Return JSON array:
[
  {{
    "job_index": 0,
    "match_score": 85,
    "match_reason": "Strong Python/FastAPI match, missing Kubernetes",
    "apply_recommendation": "strong fit|good fit|stretch role|not recommended"
  }}
]

Return ONLY valid JSON array."""

        text = self._chat(prompt, max_tokens=1500)
        try:
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            return json.loads(text.strip())
        except json.JSONDecodeError:
            return []
