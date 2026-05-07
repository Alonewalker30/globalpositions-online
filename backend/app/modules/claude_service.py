"""
AI service — provider priority: Cerebras → Gemini → NVIDIA NIM → Groq → Together AI → Anthropic.

Cerebras   (fastest, free):   https://cloud.cerebras.ai        — set CEREBRAS_API_KEY
Gemini     (free, 1500/day):  https://aistudio.google.com      — set GEMINI_API_KEY
NVIDIA NIM (free, 80 models): https://build.nvidia.com         — set NVIDIA_API_KEY
Groq       (free fallback):   https://console.groq.com         — set GROQ_API_KEY
Together AI (free tier):      https://api.together.xyz         — set TOGETHER_API_KEY
Anthropic  (last resort):     https://console.anthropic.com

Model tiers (user-selectable):
  fast     → Cerebras 8B / Gemini Flash / Groq 8B  — instant, structured tasks
  balanced → Cerebras 70B / Gemini Flash / Groq 70B — default, good quality (default)
  quality  → best available                          — heavy reasoning, rewrites
"""
import json
import logging
from app.config import settings

logger = logging.getLogger(__name__)

# Model names
_CEREBRAS_FAST_MODEL = "llama3.1-8b"
_CEREBRAS_MODEL      = "llama-3.3-70b"
_GEMINI_FAST_MODEL   = "gemini-2.0-flash"
_GEMINI_MODEL        = "gemini-2.0-flash"
_GROQ_FAST_MODEL     = "llama-3.1-8b-instant"
_GROQ_MODEL          = "deepseek-r1-distill-llama-70b"
_TOGETHER_MODEL      = "meta-llama/Llama-3.3-70B-Instruct-Turbo"
_ANTHROPIC_MODEL     = "claude-3-5-sonnet-20241022"

# Base URLs
_CEREBRAS_BASE_URL = "https://api.cerebras.ai/v1"
_GEMINI_BASE_URL   = "https://generativelanguage.googleapis.com/v1beta/openai/"
_NVIDIA_BASE_URL   = "https://integrate.api.nvidia.com/v1"
_TOGETHER_BASE_URL = "https://api.together.xyz/v1"


def _build_client():
    """Return (client, mode). Priority: cerebras → nvidia → groq → together → anthropic."""
    cerebras_key  = (settings.cerebras_api_key or "").strip()
    nvidia_key    = (settings.nvidia_api_key or "").strip()
    groq_key      = (settings.groq_api_key or "").strip()
    together_key  = (settings.together_api_key or "").strip()
    anthropic_key = (settings.anthropic_api_key or "").strip()

    if cerebras_key:
        from openai import OpenAI
        logger.info("AI backend: Cerebras (%s)", _CEREBRAS_MODEL)
        return OpenAI(api_key=cerebras_key, base_url=_CEREBRAS_BASE_URL), "cerebras"

    gemini_key = (settings.gemini_api_key or "").strip()
    if gemini_key:
        from openai import OpenAI
        logger.info("AI backend: Gemini (%s)", _GEMINI_MODEL)
        return OpenAI(api_key=gemini_key, base_url=_GEMINI_BASE_URL), "gemini"

    if nvidia_key:
        from openai import OpenAI
        model = (settings.nvidia_model or "meta/llama-3.3-70b-instruct").strip()
        logger.info("AI backend: NVIDIA NIM (%s)", model)
        return OpenAI(api_key=nvidia_key, base_url=_NVIDIA_BASE_URL), "nvidia"

    if groq_key and not groq_key.startswith("your_"):
        from groq import Groq
        logger.info("AI backend: Groq (%s)", _GROQ_MODEL)
        return Groq(api_key=groq_key), "groq"

    if together_key:
        from openai import OpenAI
        logger.info("AI backend: Together AI (%s)", _TOGETHER_MODEL)
        return OpenAI(api_key=together_key, base_url=_TOGETHER_BASE_URL), "together"

    if anthropic_key and not anthropic_key.startswith("your_"):
        import anthropic
        logger.info("AI backend: Anthropic (%s)", _ANTHROPIC_MODEL)
        return anthropic.Anthropic(api_key=anthropic_key), "anthropic"

    raise RuntimeError(
        "No AI key configured. Add CEREBRAS_API_KEY (fastest, free: cloud.cerebras.ai) "
        "or GROQ_API_KEY (free: console.groq.com) to environment variables."
    )


class ClaudeService:
    def __init__(self):
        self.client, self.mode = _build_client()

        if self.mode == "cerebras":
            self.model = _CEREBRAS_MODEL
        elif self.mode == "gemini":
            self.model = _GEMINI_MODEL
        elif self.mode == "nvidia":
            self.model = (settings.nvidia_model or "meta/llama-3.3-70b-instruct").strip()
        elif self.mode == "groq":
            self.model = _GROQ_MODEL
        elif self.mode == "together":
            self.model = _TOGETHER_MODEL
        else:
            self.model = _ANTHROPIC_MODEL

        # Cache all free provider clients so every path can fall through the full chain
        gemini_key = (settings.gemini_api_key or "").strip()
        if gemini_key:
            from openai import OpenAI
            self._gemini_client = OpenAI(api_key=gemini_key, base_url=_GEMINI_BASE_URL)
        else:
            self._gemini_client = None

        groq_key = (settings.groq_api_key or "").strip()
        if groq_key and not groq_key.startswith("your_"):
            from groq import Groq
            self._groq_client = Groq(api_key=groq_key)
        else:
            self._groq_client = None

        cerebras_key = (settings.cerebras_api_key or "").strip()
        if cerebras_key:
            from openai import OpenAI
            self._cerebras_client = OpenAI(api_key=cerebras_key, base_url=_CEREBRAS_BASE_URL)
        else:
            self._cerebras_client = None

        together_key = (settings.together_api_key or "").strip()
        if together_key:
            from openai import OpenAI
            self._together_client = OpenAI(api_key=together_key, base_url=_TOGETHER_BASE_URL)
        else:
            self._together_client = None

    # ── Tier resolver ────────────────────────────────────────────────────────

    def get_model_for_tier(self, tier: str) -> tuple:
        """Return (client, model_name) for the given speed/quality tier.
        Full free chain: Cerebras → Groq → Together AI → primary (Anthropic last resort)."""
        if tier == "fast":
            if self._cerebras_client:
                return self._cerebras_client, _CEREBRAS_FAST_MODEL
            if self._gemini_client:
                return self._gemini_client, _GEMINI_FAST_MODEL
            if self._groq_client:
                return self._groq_client, _GROQ_FAST_MODEL
            if self._together_client:
                return self._together_client, _TOGETHER_MODEL
            return self.client, self.model
        if tier == "quality":
            if self._cerebras_client:
                return self._cerebras_client, _CEREBRAS_MODEL
            if self._gemini_client:
                return self._gemini_client, _GEMINI_MODEL
            if self._groq_client:
                return self._groq_client, _GROQ_MODEL
            if self._together_client:
                return self._together_client, _TOGETHER_MODEL
            return self.client, self.model
        # balanced (default)
        if self._cerebras_client:
            return self._cerebras_client, _CEREBRAS_MODEL
        if self._gemini_client:
            return self._gemini_client, _GEMINI_MODEL
        if self._groq_client:
            return self._groq_client, _GROQ_MODEL
        if self._together_client:
            return self._together_client, _TOGETHER_MODEL
        return self.client, self.model

    # ── Internal routing primitives ──────────────────────────────────────────

    def _chat(self, prompt: str, max_tokens: int = 1500, system: str = "") -> str:
        """Uses startup-selected client. Retained for career chat history endpoint."""
        if self.mode in ("cerebras", "gemini", "nvidia", "groq", "together"):
            msgs = []
            if system:
                msgs.append({"role": "system", "content": system})
            msgs.append({"role": "user", "content": prompt})
            r = self.client.chat.completions.create(
                model=self.model, max_tokens=max_tokens, messages=msgs, timeout=110,
            )
            return (r.choices[0].message.content or "").strip()
        else:
            kwargs = {"model": self.model, "max_tokens": max_tokens,
                      "messages": [{"role": "user", "content": prompt}]}
            if system:
                kwargs["system"] = system
            r = self.client.messages.create(**kwargs)
            return r.content[0].text.strip()

    def _fast_chat(self, prompt: str, max_tokens: int = 2500) -> str:
        """Cerebras 8B → Groq 8B → NVIDIA 8B → main client. For structured JSON extraction."""
        if self._cerebras_client:
            try:
                r = self._cerebras_client.chat.completions.create(
                    model=_CEREBRAS_FAST_MODEL, max_tokens=max_tokens,
                    messages=[{"role": "user", "content": prompt}], timeout=30,
                )
                logger.info("fast_chat: Cerebras (%s)", _CEREBRAS_FAST_MODEL)
                return (r.choices[0].message.content or "").strip()
            except Exception as exc:
                logger.warning("fast_chat: Cerebras failed (%s), trying Gemini", exc)

        if self._gemini_client:
            try:
                r = self._gemini_client.chat.completions.create(
                    model=_GEMINI_FAST_MODEL, max_tokens=max_tokens,
                    messages=[{"role": "user", "content": prompt}], timeout=30,
                )
                logger.info("fast_chat: Gemini (%s)", _GEMINI_FAST_MODEL)
                return (r.choices[0].message.content or "").strip()
            except Exception as exc:
                logger.warning("fast_chat: Gemini failed (%s), trying Groq", exc)

        if self._groq_client:
            try:
                r = self._groq_client.chat.completions.create(
                    model=_GROQ_FAST_MODEL, max_tokens=max_tokens,
                    messages=[{"role": "user", "content": prompt}], timeout=30,
                )
                logger.info("fast_chat: Groq (%s)", _GROQ_FAST_MODEL)
                return (r.choices[0].message.content or "").strip()
            except Exception as exc:
                logger.warning("fast_chat: Groq 8B failed (%s), trying Together AI", exc)

        if self._together_client:
            try:
                r = self._together_client.chat.completions.create(
                    model=_TOGETHER_MODEL, max_tokens=max_tokens,
                    messages=[{"role": "user", "content": prompt}], timeout=60,
                )
                logger.info("fast_chat: Together AI (%s)", _TOGETHER_MODEL)
                return (r.choices[0].message.content or "").strip()
            except Exception as exc:
                logger.warning("fast_chat: Together AI failed (%s), falling back", exc)

        if self.mode == "nvidia":
            from openai import OpenAI
            fast_model = (settings.nvidia_fast_model or "meta/llama-3.1-8b-instruct").strip()
            fast_client = OpenAI(
                api_key=(settings.nvidia_api_key or "").strip(), base_url=_NVIDIA_BASE_URL
            )
            r = fast_client.chat.completions.create(
                model=fast_model, max_tokens=max_tokens,
                messages=[{"role": "user", "content": prompt}], timeout=60,
            )
            logger.info("fast_chat: NVIDIA NIM (%s)", fast_model)
            return (r.choices[0].message.content or "").strip()

        return self._chat(prompt, max_tokens)

    def _quality_chat(self, prompt: str, max_tokens: int = 3000, system: str = "") -> str:
        """Cerebras 70B → Groq 70B → main client. For reasoning, rewrites, suggestions."""
        if self._cerebras_client:
            try:
                msgs = []
                if system:
                    msgs.append({"role": "system", "content": system})
                msgs.append({"role": "user", "content": prompt})
                r = self._cerebras_client.chat.completions.create(
                    model=_CEREBRAS_MODEL, max_tokens=max_tokens, messages=msgs, timeout=60,
                )
                logger.info("quality_chat: Cerebras (%s)", _CEREBRAS_MODEL)
                return (r.choices[0].message.content or "").strip()
            except Exception as exc:
                logger.warning("quality_chat: Cerebras failed (%s), trying Gemini", exc)

        if self._gemini_client:
            try:
                msgs = []
                if system:
                    msgs.append({"role": "system", "content": system})
                msgs.append({"role": "user", "content": prompt})
                r = self._gemini_client.chat.completions.create(
                    model=_GEMINI_MODEL, max_tokens=max_tokens, messages=msgs, timeout=60,
                )
                logger.info("quality_chat: Gemini (%s)", _GEMINI_MODEL)
                return (r.choices[0].message.content or "").strip()
            except Exception as exc:
                logger.warning("quality_chat: Gemini failed (%s), trying Groq", exc)

        if self._groq_client:
            try:
                msgs = []
                if system:
                    msgs.append({"role": "system", "content": system})
                msgs.append({"role": "user", "content": prompt})
                r = self._groq_client.chat.completions.create(
                    model=_GROQ_MODEL, max_tokens=max_tokens, messages=msgs, timeout=60,
                )
                logger.info("quality_chat: Groq (%s)", _GROQ_MODEL)
                return (r.choices[0].message.content or "").strip()
            except Exception as exc:
                logger.warning("quality_chat: Groq 70B failed (%s), trying Together AI", exc)

        if self._together_client:
            try:
                msgs = []
                if system:
                    msgs.append({"role": "system", "content": system})
                msgs.append({"role": "user", "content": prompt})
                r = self._together_client.chat.completions.create(
                    model=_TOGETHER_MODEL, max_tokens=max_tokens, messages=msgs, timeout=90,
                )
                logger.info("quality_chat: Together AI (%s)", _TOGETHER_MODEL)
                return (r.choices[0].message.content or "").strip()
            except Exception as exc:
                logger.warning("quality_chat: Together AI failed (%s), falling back to main client", exc)

        return self._chat(prompt, max_tokens, system)

    # ── JSON helper ──────────────────────────────────────────────────────────

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

    # ── Public methods — routed by task complexity ───────────────────────────

    def analyze_job_description(self, job_description: str) -> dict:
        """Simple JSON extraction → Cerebras/Groq 8B."""
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
        return self._parse_json(self._fast_chat(prompt, 1500))

    def get_resume_improvement_suggestions(self, resume_text: str, job_description: str, job_analysis: dict) -> dict:
        """Reasoning task → Cerebras/Groq 70B → fallback."""
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
        return self._parse_json(self._quality_chat(prompt, 2500))

    def rewrite_resume_for_job(self, resume_data: dict, job_description: str) -> dict:
        """Heavy reasoning → Cerebras/Groq 70B → fallback."""
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
3. If the candidate's bullet already contains a metric, preserve it. If no metric exists, omit it — do not invent numbers.
4. Use the JD's exact tech stack terms and keywords throughout
5. If the candidate's role/title does not match the JD role — reframe their actual experience to highlight transferable skills relevant to the JD; do not fabricate responsibilities they did not have
6. Write 4 strong bullets per experience entry
7. The summary_rewrite should open with the exact job title from the JD

JOB DESCRIPTION:
{job_description[:3000]}

CANDIDATE EXPERIENCE:
{chr(10).join(exp_lines) or "No experience provided — return empty rewritten_experience array"}

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
        return self._parse_json(self._quality_chat(prompt, 3000))

    def research_company_tech_stack(self, company_name: str, industry: str) -> dict:
        """Simple lookup → Cerebras/Groq 8B."""
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
        return self._parse_json(self._fast_chat(prompt, 800))
