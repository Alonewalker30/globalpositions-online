"""
AI service — uses Groq (free) as primary, falls back to Anthropic if configured.
Groq free tier: 14,400 req/day, llama-3.3-70b-versatile model.
Get a free key at https://console.groq.com
"""
import json
import logging
from app.config import settings

logger = logging.getLogger(__name__)

_GROQ_MODEL = "llama-3.3-70b-versatile"
_ANTHROPIC_MODEL = "claude-3-5-sonnet-20241022"


def _build_client():
    """Return (client, mode) where mode is 'groq' or 'anthropic'."""
    groq_key = (settings.groq_api_key or "").strip()
    anthropic_key = (settings.anthropic_api_key or "").strip()

    if groq_key and not groq_key.startswith("your_"):
        from groq import Groq
        logger.info("AI backend: Groq (%s)", _GROQ_MODEL)
        return Groq(api_key=groq_key), "groq"

    if anthropic_key and not anthropic_key.startswith("your_"):
        import anthropic
        logger.info("AI backend: Anthropic (%s)", _ANTHROPIC_MODEL)
        return anthropic.Anthropic(api_key=anthropic_key), "anthropic"

    raise RuntimeError(
        "No AI key configured. Add GROQ_API_KEY (free at console.groq.com) "
        "or ANTHROPIC_API_KEY to backend/.env"
    )


class ClaudeService:
    def __init__(self):
        self.client, self.mode = _build_client()
        self.model = _GROQ_MODEL if self.mode == "groq" else _ANTHROPIC_MODEL

    def _chat(self, prompt: str, max_tokens: int = 1500, system: str = "") -> str:
        """Unified chat call — works for both Groq and Anthropic."""
        if self.mode == "groq":
            msgs = []
            if system:
                msgs.append({"role": "system", "content": system})
            msgs.append({"role": "user", "content": prompt})
            r = self.client.chat.completions.create(
                model=self.model,
                max_tokens=max_tokens,
                messages=msgs,
            )
            return r.choices[0].message.content.strip()
        else:
            kwargs = {"model": self.model, "max_tokens": max_tokens,
                      "messages": [{"role": "user", "content": prompt}]}
            if system:
                kwargs["system"] = system
            r = self.client.messages.create(**kwargs)
            return r.content[0].text.strip()

    def _parse_json(self, text: str) -> dict:
        text = text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        try:
            return json.loads(text.strip())
        except json.JSONDecodeError:
            return {"raw": text}

    def analyze_job_description(self, job_description: str) -> dict:
        prompt = f"""Analyze this job description and return ONLY valid JSON:
{{
  "job_title": "",
  "key_responsibilities": [],
  "required_skills": [],
  "preferred_skills": [],
  "years_of_experience": "",
  "company_industry": "",
  "tech_stack": [],
  "seniority_level": "",
  "working_scenario": ""
}}

Job Description:
{job_description}

Return ONLY the JSON object."""
        return self._parse_json(self._chat(prompt, 1500))

    def get_resume_improvement_suggestions(self, resume_text: str, job_description: str, job_analysis: dict) -> dict:
        prompt = f"""You are an ATS resume optimizer. Return ONLY valid JSON:
{{
  "role_title_update": "",
  "key_improvements": [
    {{"section": "", "original": "", "suggested": "", "reason": "", "priority": "high/medium/low"}}
  ],
  "missing_keywords": [],
  "scenario_additions": [
    {{"bullet_point": "", "section": ""}}
  ],
  "ats_optimization_tips": []
}}

RESUME:
{resume_text[:3000]}

JOB DESCRIPTION:
{job_description[:2000]}

Return ONLY the JSON object."""
        return self._parse_json(self._chat(prompt, 2000))

    def research_company_tech_stack(self, company_name: str, industry: str) -> dict:
        prompt = f"""Return ONLY valid JSON about {company_name} ({industry}):
{{
  "likely_tech_stack": [],
  "cloud_platforms": [],
  "frontend_tech": [],
  "backend_tech": [],
  "databases": [],
  "development_practices": [],
  "common_tools": []
}}

Return ONLY the JSON object."""
        return self._parse_json(self._chat(prompt, 800))
