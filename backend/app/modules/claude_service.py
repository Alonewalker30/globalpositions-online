"""
AI service — priority order: NVIDIA NIM → Groq → Anthropic.

NVIDIA NIM (free, 80+ models): https://build.nvidia.com/models
  Set NVIDIA_API_KEY in Render env vars.
  Default model: meta/llama-3.3-70b-instruct (fast, reliable, great for resume rewriting)
  For long-context chat you can set NVIDIA_MODEL=moonshotai/kimi-k2-instruct (128K ctx)

Groq (free fallback): https://console.groq.com — 14,400 req/day
"""
import json
import logging
from app.config import settings

logger = logging.getLogger(__name__)

_GROQ_MODEL      = "llama-3.3-70b-versatile"
_ANTHROPIC_MODEL = "claude-3-5-sonnet-20241022"
_NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"


def _build_client():
    """Return (client, mode). Priority: nvidia → groq → anthropic."""
    nvidia_key    = (settings.nvidia_api_key or "").strip()
    groq_key      = (settings.groq_api_key or "").strip()
    anthropic_key = (settings.anthropic_api_key or "").strip()

    if nvidia_key:
        from openai import OpenAI
        model = (settings.nvidia_model or "meta/llama-3.3-70b-instruct").strip()
        logger.info("AI backend: NVIDIA NIM (%s)", model)
        return OpenAI(api_key=nvidia_key, base_url=_NVIDIA_BASE_URL), "nvidia"

    if groq_key and not groq_key.startswith("your_"):
        from groq import Groq
        logger.info("AI backend: Groq (%s)", _GROQ_MODEL)
        return Groq(api_key=groq_key), "groq"

    if anthropic_key and not anthropic_key.startswith("your_"):
        import anthropic
        logger.info("AI backend: Anthropic (%s)", _ANTHROPIC_MODEL)
        return anthropic.Anthropic(api_key=anthropic_key), "anthropic"

    raise RuntimeError(
        "No AI key configured. Add NVIDIA_API_KEY (free: build.nvidia.com) "
        "or GROQ_API_KEY (free: console.groq.com) to Render environment variables."
    )


class ClaudeService:
    def __init__(self):
        self.client, self.mode = _build_client()
        if self.mode == "nvidia":
            self.model = (settings.nvidia_model or "deepseek-ai/deepseek-r1").strip()
        elif self.mode == "groq":
            self.model = _GROQ_MODEL
        else:
            self.model = _ANTHROPIC_MODEL

    def _chat(self, prompt: str, max_tokens: int = 1500, system: str = "") -> str:
        """Unified chat — works for NVIDIA NIM (OpenAI-compat), Groq, and Anthropic."""
        if self.mode in ("nvidia", "groq"):
            msgs = []
            if system:
                msgs.append({"role": "system", "content": system})
            msgs.append({"role": "user", "content": prompt})
            r = self.client.chat.completions.create(
                model=self.model,
                max_tokens=max_tokens,
                messages=msgs,
                timeout=45,
            )
            return (r.choices[0].message.content or "").strip()
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
        prompt = f"""You are an elite ATS resume optimizer. Return ONLY valid JSON:
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

RULES:
- Suggest complete bullet rewrites, not minor edits
- Every suggested bullet must include a quantified metric (%, $, x faster, N users, etc.)
- Use the JD's exact keywords and verb tenses
- If the resume role does not match the JD, still provide bullets that bridge the gap

RESUME:
{resume_text[:3000]}

JOB DESCRIPTION:
{job_description[:2000]}

Return ONLY the JSON object."""
        return self._parse_json(self._chat(prompt, 2500))

    def rewrite_resume_for_job(self, resume_data: dict, job_description: str) -> dict:
        """Aggressively rewrite resume bullets to match JD. Generates new bullets if needed."""
        exp_lines = []
        for i, exp in enumerate(resume_data.get("experience", [])):
            exp_lines.append(f"Experience {i}: {exp.get('title','')} at {exp.get('company','')}")
            for b in exp.get("bullets", []):
                if b.strip():
                    exp_lines.append(f"  - {b}")

        prompt = f"""You are a top-tier resume ghostwriter. Your task: completely rewrite the candidate's resume bullets so they are a near-perfect match for the job description below.

STRICT RULES:
1. REWRITE every bullet — do not keep original wording
2. Every bullet MUST start with a strong action verb from the JD (e.g. Led, Architected, Scaled, Shipped, Reduced)
3. Every bullet MUST contain a quantified metric — invent a realistic one if needed (e.g. "improved latency by 40%", "served 2M+ users")
4. Use the JD's exact tech stack terms and keywords throughout
5. If the candidate's role/title does not match the JD role — ASSUME they were performing that work at their company and write bullets accordingly
6. Write 4 strong bullets per experience entry
7. The summary_rewrite should open with the exact job title from the JD

JOB DESCRIPTION:
{job_description[:3000]}

CANDIDATE EXPERIENCE:
{chr(10).join(exp_lines) or "No experience provided — generate relevant bullets from scratch based on JD"}

CURRENT SKILLS:
{", ".join(resume_data.get("skills", []))}

Return ONLY valid JSON:
{{
  "rewrites": [
    {{
      "experience_index": 0,
      "bullets": ["bullet 1", "bullet 2", "bullet 3", "bullet 4"],
      "title_suggestion": "updated job title to display"
    }}
  ],
  "summary_rewrite": "2-3 sentence professional summary targeting the exact JD role",
  "skills_to_add": ["skill1", "skill2", "skill3"]
}}"""
        return self._parse_json(self._chat(prompt, 3000))

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
