"""
TinyFish Browser API — three capabilities:
  1. scrape_jobs()              — LinkedIn / Indeed / Glassdoor live listings
  2. get_apply_fields()         — Detect form fields on an apply page for auto-fill
  3. research_company_browser() — Browse career page → AI-structured summary

Requires TINYFISH_API_KEY env var. Sessions spin up in 10-30s.
"""
import logging
from urllib.parse import quote_plus

import httpx
from app.config import settings

logger = logging.getLogger(__name__)

_TINYFISH_API = "https://api.browser.tinyfish.ai"
_SESSION_TIMEOUT = 70  # TinyFish startup takes up to 30s


# ── Session factory ──────────────────────────────────────────────────────────

async def _start_session(url: str) -> dict:
    key = (settings.tinyfish_api_key or "").strip()
    if not key:
        raise ValueError("TINYFISH_API_KEY is not configured — add it at agent.tinyfish.ai/api-keys")
    async with httpx.AsyncClient(timeout=_SESSION_TIMEOUT) as client:
        r = await client.post(
            _TINYFISH_API,
            headers={"X-API-Key": key},
            json={"url": url},
        )
        r.raise_for_status()
        return r.json()  # {session_id, cdp_url, base_url}


async def _connect(cdp_url: str):
    """Connect Playwright to a TinyFish remote session. Returns (playwright, browser, page)."""
    from playwright.async_api import async_playwright
    p = await async_playwright().start()
    browser = await p.chromium.connect_over_cdp(cdp_url)
    contexts = browser.contexts
    if contexts and contexts[0].pages:
        page = contexts[0].pages[0]
    else:
        ctx = await browser.new_context()
        page = await ctx.new_page()
    return p, browser, page


# ── 1. Job scraping ──────────────────────────────────────────────────────────

_SCRAPERS: dict = {
    "linkedin": {
        "url_tpl": "https://www.linkedin.com/jobs/search/?keywords={q}&location={loc}&f_TPR=r604800",
        "wait_for": ".job-search-card",
        "extractor": """
            () => Array.from(document.querySelectorAll('.job-search-card')).map(el => ({
                title:    el.querySelector('.base-search-card__title')?.textContent?.trim() ?? '',
                company:  el.querySelector('.base-search-card__subtitle')?.textContent?.trim() ?? '',
                location: el.querySelector('.job-search-card__location')?.textContent?.trim() ?? '',
                url:      el.querySelector('a.base-card__full-link')?.href ?? '',
                posted_at:el.querySelector('time')?.getAttribute('datetime') ?? '',
                salary:   '',
                source:   'LinkedIn',
                tags:     [],
            }))
        """,
    },
    "indeed": {
        "url_tpl": "https://www.indeed.com/jobs?q={q}&l={loc}&fromage=7",
        "wait_for": ".job_seen_beacon",
        "extractor": """
            () => Array.from(document.querySelectorAll('.job_seen_beacon')).map(el => ({
                title:    el.querySelector('[data-testid="job-title"] span')?.textContent?.trim() ?? '',
                company:  el.querySelector('[data-testid="company-name"]')?.textContent?.trim() ?? '',
                location: el.querySelector('[data-testid="text-location"]')?.textContent?.trim() ?? '',
                salary:   el.querySelector('[data-testid="attribute_snippet_testid"]')?.textContent?.trim() ?? '',
                url:      (() => { const a = el.querySelector('a[data-jk]'); return a ? 'https://www.indeed.com' + a.getAttribute('href') : ''; })(),
                posted_at:'',
                source:   'Indeed',
                tags:     [],
            }))
        """,
    },
    "glassdoor": {
        "url_tpl": "https://www.glassdoor.com/Job/jobs.htm?sc.keyword={q}",
        "wait_for": "[data-test='jobListing']",
        "extractor": """
            () => Array.from(document.querySelectorAll('[data-test="jobListing"]')).map(el => ({
                title:    el.querySelector('[data-test="job-title"]')?.textContent?.trim() ?? '',
                company:  el.querySelector('[data-test="employer-name"]')?.textContent?.trim() ?? '',
                location: el.querySelector('[data-test="emp-location"]')?.textContent?.trim() ?? '',
                salary:   el.querySelector('[data-test="detailSalary"]')?.textContent?.trim() ?? '',
                url:      el.querySelector('a[href]')?.href ?? '',
                posted_at:'',
                source:   'Glassdoor',
                tags:     [],
            }))
        """,
    },
}


async def scrape_jobs(
    query: str,
    source: str = "linkedin",
    location: str = "",
    limit: int = 30,
) -> list[dict]:
    """
    Scrape jobs from LinkedIn, Indeed, or Glassdoor using a TinyFish browser session.
    Returns list of normalised Job dicts (same shape as job_aggregator_service).
    """
    cfg = _SCRAPERS.get(source.lower())
    if not cfg:
        raise ValueError(f"Unknown source '{source}'. Valid: {list(_SCRAPERS)}")

    start_url = cfg["url_tpl"].format(q=quote_plus(query), loc=quote_plus(location))
    logger.info("TinyFish scrape_jobs: source=%s query=%s", source, query)

    session = await _start_session(start_url)
    p, browser, page = await _connect(session["cdp_url"])

    try:
        await page.wait_for_selector(cfg["wait_for"], timeout=30_000)
        jobs: list[dict] = await page.evaluate(cfg["extractor"])
        result = [j for j in jobs if j.get("title")][:limit]
        logger.info("TinyFish scrape_jobs: got %d jobs from %s", len(result), source)
        return result
    except Exception as exc:
        logger.warning("TinyFish scrape_jobs error (%s): %s", source, exc)
        return []
    finally:
        await browser.close()
        await p.stop()


# ── 2. Apply-page field analysis ─────────────────────────────────────────────

async def get_apply_fields(job_url: str, resume_data: dict) -> dict:
    """
    Navigate to a job's apply page. Detect form fields and suggest
    values from the user's resume_data.

    Returns:
        {fields: [{label, type, name, suggested_value}], apply_url, field_count}
    """
    logger.info("TinyFish get_apply_fields: %s", job_url)
    session = await _start_session(job_url)
    p, browser, page = await _connect(session["cdp_url"])

    try:
        await page.wait_for_load_state("networkidle", timeout=30_000)
        apply_url = page.url

        # Try to find and follow an "Apply" button if not already on apply page
        if "apply" not in apply_url.lower():
            apply_btn = await page.query_selector(
                "a[href*='apply'], button:has-text('Apply'), a:has-text('Apply Now')"
            )
            if apply_btn:
                href = await apply_btn.get_attribute("href")
                if href:
                    apply_url = href if href.startswith("http") else job_url.rstrip("/") + "/" + href.lstrip("/")
                    await page.goto(apply_url, wait_until="networkidle", timeout=30_000)

        # Extract all visible form fields
        fields_raw: list[dict] = await page.evaluate("""
            () => Array.from(document.querySelectorAll('input, textarea, select'))
                .map(el => ({
                    label: (document.querySelector(`label[for="${el.id}"]`)?.textContent?.trim()
                         || el.getAttribute('aria-label')
                         || el.getAttribute('placeholder')
                         || el.name || ''),
                    type:  el.tagName.toLowerCase() === 'select' ? 'select'
                           : (el.getAttribute('type') || 'text'),
                    name:  el.name || el.id || '',
                    value: el.value || '',
                }))
                .filter(f => f.label || f.name)
        """)

        # Build resume field lookup
        contact = resume_data.get("contact", {})
        name_parts = (contact.get("name") or "").split()
        field_map = {
            "first":    name_parts[0] if name_parts else "",
            "last":     name_parts[-1] if len(name_parts) > 1 else "",
            "name":     contact.get("name", ""),
            "email":    contact.get("email", ""),
            "phone":    contact.get("phone", ""),
            "linkedin": contact.get("linkedin", ""),
            "github":   contact.get("github", ""),
            "location": contact.get("location", ""),
            "city":     (contact.get("location") or "").split(",")[0].strip(),
            "website":  contact.get("github") or contact.get("linkedin", ""),
        }

        skip_types = {"hidden", "submit", "button", "image", "reset"}
        fields = []
        for f in fields_raw:
            if f["type"] in skip_types:
                continue
            label_key = (f["label"] + " " + f["name"]).lower()
            suggested = ""
            for key, val in field_map.items():
                if key in label_key and val:
                    suggested = val
                    break
            fields.append({**f, "suggested_value": suggested})

        return {"fields": fields, "apply_url": apply_url, "field_count": len(fields)}

    except Exception as exc:
        logger.warning("TinyFish get_apply_fields error: %s", exc)
        return {"fields": [], "apply_url": job_url, "field_count": 0, "error": str(exc)}
    finally:
        await browser.close()
        await p.stop()


# ── 3. Company career page research ─────────────────────────────────────────

_CAREER_PATHS = ["/careers", "/jobs", "/about/careers", "/work-with-us", "/join-us", "/team"]


async def research_company_browser(company_name: str, career_url: str = "") -> dict:
    """
    Navigate to the company's career page, extract visible text, and use
    AI to return a structured summary (culture, benefits, tech stack, etc.)
    """
    from app.modules.claude_service import ClaudeService
    ai = ClaudeService()

    if not career_url:
        slug = company_name.lower().replace(" ", "").replace(",", "").replace(".", "")
        career_url = f"https://www.{slug}.com/careers"

    logger.info("TinyFish research_company_browser: %s → %s", company_name, career_url)
    session = await _start_session(career_url)
    p, browser, page = await _connect(session["cdp_url"])

    try:
        await page.wait_for_load_state("networkidle", timeout=30_000)
        final_url = page.url
        title = await page.title()

        # If the initial URL 404'd, try alternate career paths
        if "404" in title or "not found" in title.lower():
            base = career_url.split("/careers")[0].split("/jobs")[0]
            for path in _CAREER_PATHS[1:]:
                try:
                    await page.goto(base + path, wait_until="networkidle", timeout=15_000)
                    t = await page.title()
                    if "404" not in t and "not found" not in t.lower():
                        final_url = page.url
                        break
                except Exception:
                    continue

        # Grab visible text (skip nav/footer noise)
        page_text: str = await page.evaluate("""
            () => {
                const skip = new Set(['SCRIPT','STYLE','NAV','HEADER','FOOTER','META','LINK']);
                return Array.from(document.body.querySelectorAll('*'))
                    .filter(el => !skip.has(el.tagName)
                               && el.children.length === 0
                               && el.textContent.trim().length > 15)
                    .map(el => el.textContent.trim())
                    .join(' ')
                    .slice(0, 8000);
            }
        """)

        prompt = f"""Analyze this company career page for {company_name}. Return ONLY valid JSON:
{{
  "culture": ["culture trait 1", "culture trait 2"],
  "benefits": ["benefit 1", "benefit 2"],
  "tech_stack": ["tech 1", "tech 2"],
  "open_roles_count": 0,
  "hiring_locations": ["city 1"],
  "remote_policy": "remote/hybrid/on-site/unknown",
  "unique_highlights": ["highlight 1"],
  "summary": "2-3 sentence summary of what it's like to work here"
}}

PAGE TEXT:
{page_text[:5000]}

Return ONLY the JSON object."""

        result = ai._parse_json(ai._fast_chat(prompt, 1200))
        result["source_url"] = final_url
        result["company"] = company_name
        return result

    except Exception as exc:
        logger.warning("TinyFish research_company_browser error: %s", exc)
        return {"company": company_name, "source_url": career_url, "error": str(exc)}
    finally:
        await browser.close()
        await p.stop()
