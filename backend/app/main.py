from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import logging
from typing import Optional
import json
import io

from app.config import settings
from app.modules.resume_parser import ResumeParser
from app.modules.keyword_extractor import KeywordExtractor
from app.modules.ats_optimizer import ATSOptimizer
from app.modules.claude_service import ClaudeService
from app.modules.career_intelligence import CareerIntelligenceService
from app.modules.job_market_service import JobMarketService
from app.modules.skills_advisor_service import SkillsAdvisorService
from app.modules.industry_news_service import IndustryNewsService
from app.modules.job_aggregator_service import JobAggregatorService
from app.modules.trending_skills_service import TrendingSkillsService
from pydantic import BaseModel as PydanticBaseModel
from app.schemas import ResumeAnalysisRequest, AnalysisResponse, CareerIntelligenceRequest

# Initialize FastAPI
app = FastAPI(
    title="Resume AI Builder",
    description="Advanced AI-powered resume builder for ATS optimization",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
resume_parser = ResumeParser()
keyword_extractor = KeywordExtractor()
ats_optimizer = ATSOptimizer()
claude_service = ClaudeService()
career_intelligence_svc = CareerIntelligenceService()
job_market_svc = JobMarketService()
skills_advisor_svc = SkillsAdvisorService()
industry_news_svc = IndustryNewsService()
job_aggregator_svc = JobAggregatorService()
trending_skills_svc = TrendingSkillsService()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== HEALTH CHECK ====================
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Resume AI Builder"}

# ==================== ANALYSIS ENDPOINTS ====================
@app.post("/api/analyze")
async def analyze_resume(request: ResumeAnalysisRequest):
    """
    Main endpoint: Analyze resume against job description
    
    Returns:
    - Job analysis (title, responsibilities, skills, tech stack, etc.)
    - Keyword matching results
    - ATS compatibility score
    - Specific recommendations
    """
    try:
        logger.info("Starting resume analysis...")
        
        # Parse resume
        resume_data = resume_parser.parse_resume_text(request.resume_text)
        logger.info(f"Resume parsed. Current role: {resume_data.get('current_role')}")
        
        # Analyze job description with Claude
        job_analysis = claude_service.analyze_job_description(request.job_description)
        logger.info(f"Job analyzed: {job_analysis.get('job_title', 'Unknown')}")
        
        # Extract keywords
        job_keywords = keyword_extractor.extract_keywords_from_job(request.job_description)
        
        # Calculate keyword match
        keyword_match = keyword_extractor.calculate_keyword_match_score(
            job_keywords,
            request.resume_text
        )
        logger.info(f"Keyword match score: {keyword_match['match_percentage']:.1f}%")
        
        # ATS optimization analysis
        ats_analysis = ats_optimizer.analyze_ats_compatibility(
            request.resume_text,
            job_keywords
        )
        
        # Get Claude suggestions for improvement
        improvements = claude_service.get_resume_improvement_suggestions(
            request.resume_text,
            request.job_description,
            job_analysis
        )
        
        # Generate full optimization report
        optimization_report = ats_optimizer.generate_optimization_report(
            resume_data,
            request.job_description,
            job_keywords,
            job_analysis
        )
        
        # Research company if provided
        company_techstack = {}
        if request.company_name:
            industry = job_analysis.get("company_industry", "Technology")
            company_techstack = claude_service.research_company_tech_stack(
                request.company_name,
                industry
            )
            logger.info(f"Company research completed for {request.company_name}")
        
        response = {
            "success": True,
            "job_analysis": job_analysis,
            "resume_data": {
                "current_role": resume_data.get("current_role"),
                "years_of_experience": resume_data.get("years_of_experience"),
                "contact_info": resume_data.get("contact_info")
            },
            "keyword_match": {
                "matched_count": len(keyword_match["matched_keywords"]),
                "total_keywords": len(keyword_match["matched_keywords"]) + len(keyword_match["missing_keywords"]),
                "match_percentage": keyword_match["match_percentage"],
                "matched_keywords": keyword_match["matched_keywords"][:20],  # Top 20
                "missing_keywords": keyword_match["missing_keywords"]
            },
            "ats_compatibility": ats_analysis,
            "improvements": improvements,
            "company_techstack": company_techstack,
            "optimization_report": optimization_report
        }
        
        return response
        
    except Exception as e:
        logger.error(f"Error analyzing resume: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== FILE UPLOAD ENDPOINTS ====================
@app.post("/api/upload/resume")
async def upload_resume(file: UploadFile = File(...)):
    """Upload and parse resume file (PDF or DOCX)"""
    try:
        content = await file.read()
        return {
            "success": True,
            "filename": file.filename,
            "size": len(content),
            "message": "File uploaded successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


def _extract_text_from_file(content: bytes, filename: str) -> str:
    """Extract plain text from PDF, DOCX, or TXT bytes."""
    fname = (filename or "").lower()
    if fname.endswith(".pdf"):
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(content))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as e:
            raise ValueError(f"Could not read PDF: {e}")
    elif fname.endswith(".docx"):
        try:
            from docx import Document
            doc = Document(io.BytesIO(content))
            return "\n".join(p.text for p in doc.paragraphs)
        except Exception as e:
            raise ValueError(f"Could not read DOCX: {e}")
    else:
        # TXT or plain text
        return content.decode("utf-8", errors="replace")


_PARSE_PROMPT = """You are a resume parser. Extract every detail from the resume below and return ONLY valid JSON — no markdown fences, no explanation.

Return this exact schema (use empty string "" or [] for missing fields, never null):
{{
  "contact": {{
    "name": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "github": ""
  }},
  "summary": "",
  "experience": [
    {{
      "company": "",
      "title": "",
      "location": "",
      "start": "",
      "end": "",
      "current": false,
      "bullets": ["", ""]
    }}
  ],
  "education": [
    {{
      "school": "",
      "degree": "",
      "field": "",
      "start": "",
      "end": "",
      "gpa": ""
    }}
  ],
  "skills": [],
  "projects": [
    {{
      "name": "",
      "description": "",
      "url": "",
      "tech": []
    }}
  ],
  "certifications": []
}}

Rules:
- Extract ALL work experiences with their bullet points verbatim
- For dates use format like "Jan 2020" or "2020"; if currently employed set current=true and end=""
- Put each individual skill as a separate string in the skills array
- Extract project tech stack into the tech array
- For linkedin/github include the full URL if present, otherwise extract the username and form the URL
- Return ONLY the JSON object, starting with {{ and ending with }}

RESUME TEXT:
{resume_text}"""


@app.post("/api/resume/parse-ai")
async def parse_resume_ai(
    file: Optional[UploadFile] = File(None),
    resume_text: Optional[str] = Form(None),
):
    """
    AI-powered resume parser. Accepts a file upload (PDF/DOCX/TXT) OR raw text.
    Uses Claude to extract structured data into every resume builder field.
    """
    try:
        # Get text
        if file and file.filename:
            content = await file.read()
            text = _extract_text_from_file(content, file.filename)
        elif resume_text:
            text = resume_text
        else:
            raise HTTPException(status_code=400, detail="Provide a file or resume_text")

        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from file")

        # Call AI (Groq or Anthropic)
        prompt = _PARSE_PROMPT.format(resume_text=text[:8000])
        raw = claude_service._chat(prompt, max_tokens=2000)

        # Strip any accidental markdown fences
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        parsed = json.loads(raw)

        # Ensure every experience/education/project has a unique id (frontend needs it)
        import uuid
        for item in parsed.get("experience", []):
            item.setdefault("id", str(uuid.uuid4())[:8])
        for item in parsed.get("education", []):
            item.setdefault("id", str(uuid.uuid4())[:8])
        for item in parsed.get("projects", []):
            item.setdefault("id", str(uuid.uuid4())[:8])

        return {"success": True, "parsed": parsed, "raw_text_length": len(text)}

    except json.JSONDecodeError as e:
        logger.error("Claude returned non-JSON: %s", raw[:200] if 'raw' in dir() else '')
        raise HTTPException(status_code=500, detail=f"AI parsing failed: {e}")
    except Exception as e:
        logger.error("Resume AI parse error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

# ==================== OPTIMIZATION ENDPOINTS ====================
@app.post("/api/optimize")
async def optimize_resume(request: ResumeAnalysisRequest):
    """
    Get AI-powered optimization suggestions
    """
    try:
        # First analyze
        job_analysis = claude_service.analyze_job_description(request.job_description)
        
        # Get improvement suggestions
        suggestions = claude_service.get_resume_improvement_suggestions(
            request.resume_text,
            request.job_description,
            job_analysis
        )
        
        return {
            "success": True,
            "job_title": job_analysis.get("job_title"),
            "suggestions": suggestions
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== KEYWORD ENDPOINTS ====================
@app.post("/api/keywords/extract")
async def extract_keywords(job_description: str = Form(...)):
    """Extract keywords from job description"""
    try:
        keywords = keyword_extractor.extract_keywords_from_job(job_description)
        
        all_keywords = []
        for category, kws in keywords.items():
            all_keywords.extend(kws)
        
        return {
            "success": True,
            "keywords_by_category": keywords,
            "total_keywords": len(set(all_keywords)),
            "all_keywords": list(set(all_keywords))
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/keywords/match")
async def match_keywords(
    resume_text: str = Form(...),
    job_keywords_json: str = Form(...)
):
    """Match resume against specific keywords"""
    try:
        job_keywords = json.loads(job_keywords_json)
        match = keyword_extractor.calculate_keyword_match_score(job_keywords, resume_text)
        
        return {
            "success": True,
            "match_score": match
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== RESUME PARSING ENDPOINTS ====================
@app.post("/api/parse")
async def parse_resume(resume_text: str = Form(...)):
    """Parse resume and extract structured information"""
    try:
        resume_data = resume_parser.parse_resume_text(resume_text)
        
        return {
            "success": True,
            "current_role": resume_data.get("current_role"),
            "years_of_experience": resume_data.get("years_of_experience"),
            "contact_info": resume_data.get("contact_info"),
            "sections": list(resume_data.get("sections", {}).keys())
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== COMPANY RESEARCH ENDPOINTS ====================
@app.post("/api/company/research")
async def research_company(company_name: str = Form(...), industry: str = Form(...)):
    """Research company tech stack and environment"""
    try:
        techstack = claude_service.research_company_tech_stack(company_name, industry)
        
        return {
            "success": True,
            "company": company_name,
            "industry": industry,
            "techstack": techstack
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== HEALTH & INFO ====================
@app.get("/api/info")
async def get_info():
    """Get API information"""
    return {
        "name": "Resume AI Builder API",
        "version": "1.0.0",
        "environment": settings.environment,
        "endpoints": {
            "analyze": "POST /api/analyze - Full resume analysis",
            "optimize": "POST /api/optimize - Get optimization suggestions",
            "parse": "POST /api/parse - Parse resume structure",
            "keywords": {
                "extract": "POST /api/keywords/extract - Extract keywords from job description",
                "match": "POST /api/keywords/match - Match keywords in resume"
            },
            "company": "POST /api/company/research - Research company tech stack"
        }
    }

# ==================== CAREER INTELLIGENCE ENDPOINTS ====================

@app.post("/api/career/intelligence")
async def get_career_intelligence(request: CareerIntelligenceRequest):
    """
    Full career intelligence report.

    Fetches live data from Remotive, HackerNews, arXiv, and GitHub,
    then uses Claude to synthesize actionable career insights.
    """
    try:
        logger.info(f"Career intelligence request for: {request.job_title}")

        # Fetch all live data in parallel-friendly sequence
        market_data = job_market_svc.get_market_data(request.job_title, request.skills)
        skill_resources = skills_advisor_svc.get_skill_resources(request.skills)
        news_data = industry_news_svc.get_industry_news(request.skills, request.job_title)

        live_jobs = market_data.get("live_jobs", [])
        hn_news = news_data.get("hn_stories", [])
        github_repos = skill_resources.get("github_repos", [])
        arxiv_papers = skill_resources.get("arxiv_papers", [])

        # Claude synthesizes everything
        intelligence_report = career_intelligence_svc.generate_intelligence_report(
            skills=request.skills,
            job_title=request.job_title,
            years_experience=request.years_experience or 0,
            target_role=request.target_role,
            industry=request.industry or "Technology",
            live_jobs=live_jobs,
            hn_news=hn_news,
            github_repos=github_repos,
            arxiv_papers=arxiv_papers,
        )

        # Score job matches
        job_match_scores = career_intelligence_svc.analyze_job_match_score(
            request.skills, live_jobs[:10]
        )

        # Annotate jobs with match scores
        for i, job in enumerate(live_jobs[:10]):
            score_data = next((s for s in job_match_scores if s.get("job_index") == i), {})
            job["match_score"] = score_data.get("match_score", 0)
            job["match_reason"] = score_data.get("match_reason", "")
            job["apply_recommendation"] = score_data.get("apply_recommendation", "")

        return {
            "success": True,
            "intelligence_report": intelligence_report,
            "live_jobs": live_jobs,
            "news": news_data,
            "learning_resources": skill_resources,
            "job_match_scores": job_match_scores,
        }

    except Exception as e:
        logger.error(f"Career intelligence error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/jobs/career")
async def get_career_jobs(query: str = "software engineer", limit: int = 80):
    """
    Fetch jobs with direct career-page links from Greenhouse ATS boards.
    All results are full long-form applications — no easy-apply / job-board links.
    Sources: Anthropic, Stripe, Databricks, Cloudflare, Datadog, Okta, MongoDB,
             Elastic, Coinbase, Brex, Figma, GitLab, Discord, Lyft, Pinterest,
             Twilio, Robinhood, Dropbox, Instacart, Gusto, Mercury, Vercel,
             Amplitude, Mixpanel, PagerDuty, Fastly, Carta, Checkr, Lattice,
             Neo4j, Twitch and more.
    """
    try:
        jobs = job_aggregator_svc.get_career_jobs(query=query, limit=min(limit, 120))
        return {"success": True, "total": len(jobs), "jobs": jobs}
    except Exception as e:
        logger.error("Career jobs error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/career/jobs")
async def get_live_jobs(title: str, skills: Optional[str] = None):
    """Fetch live remote job listings for a role."""
    try:
        skill_list = [s.strip() for s in skills.split(",")] if skills else []
        data = job_market_svc.get_market_data(title, skill_list)
        return {"success": True, **data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/career/news")
async def get_industry_news(skills: str, job_title: str = "software engineer"):
    """Fetch trending industry news for a skill set."""
    try:
        skill_list = [s.strip() for s in skills.split(",")]
        data = industry_news_svc.get_industry_news(skill_list, job_title)
        return {"success": True, **data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/career/resources")
async def get_learning_resources(skills: str):
    """Fetch GitHub repos and arXiv papers for learning."""
    try:
        skill_list = [s.strip() for s in skills.split(",")]
        data = skills_advisor_svc.get_skill_resources(skill_list)
        return {"success": True, **data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/skills/trending")
async def get_trending_skills():
    """Real-time skill demand scores from StackOverflow (question counts, cached 24h)."""
    try:
        skills = trending_skills_svc.get_trending_skills()
        return {"success": True, "skills": skills}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ChatRequest(PydanticBaseModel):
    message: str
    history: Optional[list] = []


@app.post("/api/career/chat")
async def career_chat(req: ChatRequest):
    """AI Copilot — full conversation history, large context window."""
    try:
        system = (
            "You are an expert AI Career Copilot for GlobalPositions.online. "
            "You help professionals with job searching, resume writing, ATS optimization, "
            "salary negotiation, career transitions, interview prep, skill development, "
            "and career strategy. "
            "Be thorough, direct, and actionable. Use markdown formatting (bold, bullet points, "
            "numbered lists, headers) to structure your answers clearly. "
            "When the user pastes a resume or job description, analyze it in full — never truncate or summarize prematurely. "
            "You can handle long inputs. Always give complete, production-ready advice."
        )

        # Keep up to 30 history messages for full conversation context
        history = (req.history or [])[-30:]

        if claude_service.mode == "groq":
            msgs = [{"role": "system", "content": system}]
            for h in history:
                role = h.get("role", "user")
                text = h.get("text", "")
                if role in ("user", "assistant") and text:
                    msgs.append({"role": role, "content": text})
            msgs.append({"role": "user", "content": req.message})
            r = claude_service.client.chat.completions.create(
                model=claude_service.model, max_tokens=4000, messages=msgs
            )
            reply = r.choices[0].message.content
        else:
            history_msgs = []
            for h in history:
                role = h.get("role", "user")
                text = h.get("text", "")
                if role in ("user", "assistant") and text:
                    history_msgs.append({"role": role, "content": text})
            history_msgs.append({"role": "user", "content": req.message})
            r = claude_service.client.messages.create(
                model=claude_service.model, max_tokens=4000,
                system=system, messages=history_msgs,
            )
            reply = r.content[0].text

        return {"success": True, "reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ResumeRewriteRequest(PydanticBaseModel):
    resume_data: dict
    job_description: str


@app.post("/api/resume/rewrite")
async def rewrite_resume(req: ResumeRewriteRequest):
    """Aggressively rewrite resume bullets to match the job description."""
    try:
        result = claude_service.rewrite_resume_for_job(req.resume_data, req.job_description)
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.port)
