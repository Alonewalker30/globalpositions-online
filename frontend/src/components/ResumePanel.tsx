import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Plus, Trash2, ChevronDown, ChevronUp, Download, Loader,
  Sparkles, FileText, CheckCircle, XCircle, User, Briefcase,
  GraduationCap, Code2, FolderGit2, Award, AlignLeft, Mail, RotateCcw, Palette
} from 'lucide-react';
import { analyzeResume, apiClient, parseResumeAI, rewriteResumeBullets } from '../services/api';

type Template = 'classic' | 'modern' | 'minimal';
const TEMPLATES: { id: Template; label: string }[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'modern',  label: 'Modern'  },
  { id: 'minimal', label: 'Minimal' },
];

/* ════════════════════════════ TYPES ════════════════════════════ */
interface Contact { name: string; email: string; phone: string; location: string; linkedin: string; github: string; }
interface ExpItem  { id: string; company: string; title: string; location: string; start: string; end: string; current: boolean; bullets: string[]; }
interface EduItem  { id: string; school: string; degree: string; field: string; start: string; end: string; gpa: string; }
interface ProjItem { id: string; name: string; description: string; url: string; tech: string[]; }
interface ResumeData {
  contact: Contact; summary: string;
  experience: ExpItem[]; education: EduItem[];
  skills: string[]; projects: ProjItem[]; certifications: string[];
}

const uid = () => Math.random().toString(36).slice(2, 9);

const DEFAULT: ResumeData = {
  contact: { name: '', email: '', phone: '', location: '', linkedin: '', github: '' },
  summary: '',
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
};

const RESUME_KEY = 'resume_builder_data';
const load = (): ResumeData => { try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(RESUME_KEY) || '{}') }; } catch { return DEFAULT; } };
const save = (d: ResumeData) => localStorage.setItem(RESUME_KEY, JSON.stringify(d));

/* ════════════════════════════ GAUGE ════════════════════════════ */
function ScoreGauge({ score }: { score: number }) {
  const color = score >= 75 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444';
  const r = 40, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ * 0.75;
  return (
    <div className="rb-gauge">
      <svg viewBox="0 0 100 70" width="110">
        <path d="M 10 68 A 40 40 0 0 1 90 68" fill="none" stroke="#E2E8F0" strokeWidth="9" strokeLinecap="round"/>
        <path d="M 10 68 A 40 40 0 0 1 90 68" fill="none" stroke={color} strokeWidth="9"
          strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} style={{ transition: 'stroke-dasharray .8s ease' }}/>
        <text x="50" y="62" textAnchor="middle" fontSize="18" fontWeight="800" fill={color}>{score}</text>
      </svg>
      <span className="rb-gauge-label">ATS Score</span>
    </div>
  );
}

/* ════════════════════════════ PREVIEW ════════════════════════════ */
function ResumePreview({ data, template }: { data: ResumeData; template: Template }) {
  const c = data.contact;
  return (
    <div className={`rb-paper template-${template}`} id="resume-preview">
      {/* Header */}
      {c.name && <h1 className="rp-name">{c.name}</h1>}
      <div className="rp-contact-row">
        {c.email    && <span>{c.email}</span>}
        {c.phone    && <span>{c.phone}</span>}
        {c.location && <span>{c.location}</span>}
        {c.linkedin && <a href={c.linkedin} target="_blank" rel="noreferrer">{c.linkedin.replace(/https?:\/\/(www\.)?/,'')}</a>}
        {c.github   && <a href={c.github}   target="_blank" rel="noreferrer">{c.github.replace(/https?:\/\/(www\.)?/,'')}</a>}
      </div>

      {/* Summary */}
      {data.summary && <>
        <div className="rp-section-title">Summary</div>
        <p className="rp-summary">{data.summary}</p>
      </>}

      {/* Experience */}
      {data.experience.length > 0 && <>
        <div className="rp-section-title">Experience</div>
        {data.experience.map(e => (
          <div key={e.id} className="rp-exp-item">
            <div className="rp-exp-header">
              <div><span className="rp-exp-title">{e.title}</span>{e.company && <span className="rp-exp-company"> · {e.company}</span>}</div>
              <span className="rp-exp-date">{e.start}{e.start && (e.end || e.current) ? ' – ' : ''}{e.current ? 'Present' : e.end}</span>
            </div>
            {e.location && <div className="rp-exp-location">{e.location}</div>}
            {e.bullets.filter(Boolean).length > 0 && (
              <ul className="rp-bullets">{e.bullets.filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}</ul>
            )}
          </div>
        ))}
      </>}

      {/* Education */}
      {data.education.length > 0 && <>
        <div className="rp-section-title">Education</div>
        {data.education.map(e => (
          <div key={e.id} className="rp-edu-item">
            <div className="rp-exp-header">
              <div><span className="rp-exp-title">{e.school}</span>{e.degree && <span className="rp-exp-company"> · {e.degree}{e.field ? `, ${e.field}` : ''}</span>}</div>
              <span className="rp-exp-date">{e.start}{e.start && e.end ? ' – ' : ''}{e.end}</span>
            </div>
            {e.gpa && <div className="rp-exp-location">GPA: {e.gpa}</div>}
          </div>
        ))}
      </>}

      {/* Skills */}
      {data.skills.filter(Boolean).length > 0 && <>
        <div className="rp-section-title">Skills</div>
        <div className="rp-skills-wrap">{data.skills.filter(Boolean).map((s, i) => <span key={i} className="rp-skill">{s}</span>)}</div>
      </>}

      {/* Projects */}
      {data.projects.length > 0 && <>
        <div className="rp-section-title">Projects</div>
        {data.projects.map(p => (
          <div key={p.id} className="rp-proj-item">
            <div className="rp-exp-header">
              <span className="rp-exp-title">{p.name}</span>
              {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="rp-proj-link">{p.url}</a>}
            </div>
            {p.description && <p className="rp-proj-desc">{p.description}</p>}
            {p.tech.filter(Boolean).length > 0 && <div className="rp-skills-wrap">{p.tech.filter(Boolean).map((t, i) => <span key={i} className="rp-skill">{t}</span>)}</div>}
          </div>
        ))}
      </>}

      {/* Certifications */}
      {data.certifications.filter(Boolean).length > 0 && <>
        <div className="rp-section-title">Certifications</div>
        <ul className="rp-bullets">{data.certifications.filter(Boolean).map((c, i) => <li key={i}>{c}</li>)}</ul>
      </>}
    </div>
  );
}

/* ════════════════════════════ SECTION ACCORDION ════════════════════════════ */
function Section({ title, icon, children, defaultOpen = false }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rb-section">
      <button className="rb-section-header" onClick={() => setOpen(o => !o)}>
        <span className="rb-section-icon">{icon}</span>
        <span className="rb-section-title">{title}</span>
        {open ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
      </button>
      {open && <div className="rb-section-body">{children}</div>}
    </div>
  );
}

/* ════════════════════════════ MAIN COMPONENT ════════════════════════════ */
export default function ResumePanel() {
  const [data, setData_]  = useState<ResumeData>(load);
  const [jobDesc, setJobDesc]   = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [atsScore, setAtsScore]   = useState<number | null>(null);
  const [kwMatch, setKwMatch]     = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [matchedKw, setMatchedKw]     = useState<string[]>([]);
  const [missingKw, setMissingKw]     = useState<string[]>([]);
  const [analyzeOpen, setAnalyzeOpen]   = useState(false);
  const [coverOpen, setCoverOpen]       = useState(false);
  const [coverLetter, setCoverLetter]   = useState('');
  const [coverLoading, setCoverLoading] = useState(false);
  const [template, setTemplate]         = useState<Template>('classic');
  const [showTemplates, setShowTemplates] = useState(false);
  const [skillInput, setSkillInput]   = useState('');
  const [certInput, setCertInput]     = useState('');
  // AI import state
  const [importOpen, setImportOpen]     = useState(false);
  const [importText, setImportText]     = useState('');
  const [importing, setImporting]       = useState(false);
  const [importError, setImportError]   = useState('');
  const [rewriting, setRewriting]       = useState(false);
  const [rewriteMsg, setRewriteMsg]     = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const setData = useCallback((d: ResumeData) => { setData_(d); save(d); }, []);
  const upd = (patch: Partial<ResumeData>) => setData({ ...data, ...patch });
  const updContact = (patch: Partial<Contact>) => upd({ contact: { ...data.contact, ...patch } });

  useEffect(() => {
    const pending = localStorage.getItem('pending_job_description');
    if (pending) { setJobDesc(pending); localStorage.removeItem('pending_job_description'); setAnalyzeOpen(true); }
  }, []);

  /* Analyze */
  const analyze = async () => {
    const resumeText = buildResumeText(data);
    if (!resumeText.trim() || !jobDesc.trim()) return;
    setAnalyzing(true);
    try {
      const res = await analyzeResume(resumeText, jobDesc);
      const score = res.ats_compatibility?.compatibility_score ?? 0;
      setAtsScore(score);
      localStorage.setItem('last_ats_score', String(score));
      setKwMatch(Math.round(res.keyword_match?.match_percentage ?? 0));
      setSuggestions(res.improvements?.key_improvements?.slice(0, 8) || []);
      setMatchedKw(res.keyword_match?.matched_keywords?.slice(0, 16) || []);
      setMissingKw(res.keyword_match?.missing_keywords?.slice(0, 16) || []);
    } catch { /* silent */ }
    finally { setAnalyzing(false); }
  };

  /* Smart Rewrite — rewrites bullets to match JD */
  const smartRewrite = async () => {
    if (!jobDesc.trim()) { setAnalyzeOpen(true); return; }
    if (data.experience.length === 0) return;
    setRewriting(true);
    setRewriteMsg('');
    try {
      const res = await rewriteResumeBullets(data, jobDesc);
      const rewrites: Array<{ experience_index: number; bullets: string[]; title_suggestion?: string }> = res.rewrites ?? [];
      const newExp = data.experience.map((exp, i) => {
        const rw = rewrites.find(r => r.experience_index === i);
        if (!rw) return exp;
        return {
          ...exp,
          title: rw.title_suggestion || exp.title,
          bullets: rw.bullets ?? exp.bullets,
        };
      });
      const patch: Partial<typeof data> = { experience: newExp };
      if (res.summary_rewrite) patch.summary = res.summary_rewrite;
      if (res.skills_to_add?.length) {
        const merged = [...new Set([...data.skills, ...res.skills_to_add])];
        patch.skills = merged;
      }
      upd(patch);
      setRewriteMsg(`Rewrite complete — ${rewrites.length} experience section${rewrites.length !== 1 ? 's' : ''} updated`);
    } catch (e: any) {
      const detail = e?.response?.data?.detail || e?.message || '';
      setRewriteMsg(detail.includes('502') || detail.includes('Network') || !detail
        ? 'Backend is starting up — wait 30 seconds and try again (Render free tier spins down).'
        : `Rewrite failed: ${detail}`);
    }
    finally { setRewriting(false); }
  };

  /* Cover letter generator */
  const generateCoverLetter = async () => {
    if (!jobDesc.trim() || !data.contact.name) return;
    setCoverLoading(true); setCoverOpen(true);
    const resumeText = buildResumeText(data);
    try {
      const res = await apiClient.post('/career/chat', {
        message: `Write a professional cover letter for this candidate applying to this job.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDesc}

Write a 3-paragraph cover letter. Opening: express enthusiasm and highlight the strongest match. Middle: connect 2-3 specific achievements from the resume to the job requirements. Closing: call to action. Keep it under 300 words. Do NOT include placeholders like [Company Name] — use the actual details from the job description if available.`,
        history: [],
      });
      setCoverLetter(res.data.reply || '');
    } catch (e: any) {
      setCoverLetter(
        e?.response?.status === 502 || e?.response?.status === 503
          ? 'Backend is starting up — wait ~30 seconds then try again.'
          : 'Unable to generate. Check the AI key is set in Render environment variables.'
      );
    }
    finally { setCoverLoading(false); }
  };

  /* PDF export */
  const exportPDF = () => window.print();

  /* AI-powered file/text import */
  const runAIParse = async (source: File | string) => {
    setImporting(true); setImportError('');
    try {
      const res = await parseResumeAI(source);
      const p = res.parsed;
      // Merge parsed data — assign IDs if missing
      const withIds = (arr: any[]) => arr.map(x => ({ ...x, id: x.id || Math.random().toString(36).slice(2,9) }));
      setData({
        contact:        { ...DEFAULT.contact, ...(p.contact || {}) },
        summary:         p.summary        || '',
        experience:      withIds(p.experience     || []),
        education:       withIds(p.education      || []),
        skills:          p.skills         || [],
        projects:        withIds(p.projects       || []),
        certifications:  p.certifications  || [],
      });
      setImportOpen(false);
      setImportText('');
    } catch (e: any) {
      const detail = e?.response?.data?.detail || e?.message || '';
      setImportError(
        e?.response?.status === 502 || e?.response?.status === 503 || !detail
          ? 'Backend is starting up — Render free tier takes ~30s to wake. Wait and try again.'
          : detail
      );
    } finally { setImporting(false); }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    await runAIParse(f);
    e.target.value = '';
  };

  /* Skill input */
  const addSkill = (val: string) => {
    const s = val.trim();
    if (s && !data.skills.includes(s)) upd({ skills: [...data.skills, s] });
  };

  /* Bullet helpers */
  const updBullet = (expId: string, idx: number, val: string) =>
    upd({ experience: data.experience.map(e => e.id === expId ? { ...e, bullets: e.bullets.map((b, i) => i === idx ? val : b) } : e) });
  const addBullet = (expId: string) =>
    upd({ experience: data.experience.map(e => e.id === expId ? { ...e, bullets: [...e.bullets, ''] } : e) });
  const removeBullet = (expId: string, idx: number) =>
    upd({ experience: data.experience.map(e => e.id === expId ? { ...e, bullets: e.bullets.filter((_, i) => i !== idx) } : e) });

  return (
    <div className="rb-shell">
      {/* ── Top toolbar ── */}
      <div className="rb-toolbar">
        <div className="rb-toolbar-left">
          <button className="btn-ghost btn-sm" onClick={() => { setImportOpen(o => !o); setAnalyzeOpen(false); setCoverOpen(false); }}>
            <FileText size={14}/> {importOpen ? 'Close Import' : 'Import Resume'}
          </button>
          <input ref={fileRef} type="file" accept=".txt,.pdf,.docx" style={{ display: 'none' }} onChange={handleFile}/>
          <button className="btn-ghost btn-sm" onClick={() => { setAnalyzeOpen(o => !o); setCoverOpen(false); }}><Sparkles size={14}/> Analyze vs Job</button>
          <button
            className="btn-primary btn-sm"
            onClick={smartRewrite}
            disabled={rewriting}
            title="AI rewrites all bullets to match the job description"
          >
            {rewriting ? <><Loader size={13} className="spin"/>Rewriting…</> : <><Sparkles size={13}/>Smart Rewrite</>}
          </button>
          <button className="btn-ghost btn-sm" onClick={() => { setCoverOpen(o => !o); setAnalyzeOpen(false); }}><Mail size={14}/> Cover Letter</button>
          <div className="rb-template-picker">
            <button className="btn-ghost btn-sm" onClick={() => setShowTemplates(o => !o)}><Palette size={14}/> {TEMPLATES.find(t=>t.id===template)?.label}</button>
            {showTemplates && (
              <div className="rb-template-dropdown">
                {TEMPLATES.map(t => (
                  <button key={t.id} className={`rb-template-opt ${template === t.id ? 'active' : ''}`} onClick={() => { setTemplate(t.id); setShowTemplates(false); }}>{t.label}</button>
                ))}
              </div>
            )}
          </div>
          <button className="btn-ghost btn-sm" title="Reset resume" onClick={() => { if (confirm('Clear all resume data?')) { setData_(DEFAULT); localStorage.removeItem(RESUME_KEY); } }}><RotateCcw size={13}/></button>
        </div>
        <div className="rb-toolbar-right">
          {atsScore !== null && <ScoreGauge score={atsScore}/>}
          {kwMatch !== null && <div className="rb-kw-badge"><span style={{ color: kwMatch >= 70 ? '#10B981' : kwMatch >= 50 ? '#F59E0B' : '#EF4444', fontWeight: 800 }}>{kwMatch}%</span><span className="muted" style={{ fontSize: 11 }}>kw match</span></div>}
          <button className="btn-primary btn-sm" onClick={exportPDF}><Download size={14}/> Export PDF</button>
        </div>
      </div>

      {/* ── Rewrite status banner ── */}
      {rewriteMsg && (
        <div className={`rb-rewrite-banner ${rewriteMsg.includes('failed') ? 'rb-rewrite-error' : 'rb-rewrite-ok'}`}>
          <Sparkles size={13} />{rewriteMsg}
          {!rewriteMsg.includes('failed') && (
            <span style={{ marginLeft: 8, opacity: .75, fontSize: 11 }}>
              — Review all suggestions carefully. Verify any metrics before submitting.
            </span>
          )}
          <button onClick={() => setRewriteMsg('')} style={{ marginLeft: 'auto', opacity: .6 }}><X_ /></button>
        </div>
      )}

      {/* ── AI Import panel ── */}
      {importOpen && (
        <div className="rb-import-panel">
          <div className="rb-import-header">
            <Sparkles size={16} className="rb-import-icon" />
            <div>
              <div className="rb-import-title">AI Resume Import</div>
              <div className="rb-import-sub">Paste your resume text or upload a file — Claude will extract every detail automatically</div>
            </div>
          </div>

          <div className="rb-import-actions">
            <button className="rb-upload-zone" onClick={() => fileRef.current?.click()}>
              <FileText size={28} />
              <span className="rb-upload-label">Upload PDF, DOCX, or TXT</span>
              <span className="rb-upload-sub">Click to browse</span>
            </button>
            <div className="rb-import-or">or paste below</div>
          </div>

          <textarea
            className="rb-analyze-textarea"
            rows={8}
            placeholder="Paste your full resume here — work experience, education, skills, projects, everything. Claude will parse it all."
            value={importText}
            onChange={e => setImportText(e.target.value)}
          />

          {importError && <div className="error-banner">{importError}</div>}

          <div className="rb-import-footer">
            <button
              className="btn-primary"
              onClick={() => runAIParse(importText)}
              disabled={importing || !importText.trim()}
            >
              {importing
                ? <><Loader size={15} className="spin" /> Parsing with AI…</>
                : <><Sparkles size={15} /> Parse & Fill All Fields</>}
            </button>
            <span className="rb-import-hint">Detects: name, contact, experience, education, skills, projects, certifications</span>
          </div>
        </div>
      )}

      {/* ── Analyze panel (collapsible) ── */}
      {analyzeOpen && (
        <div className="rb-analyze-bar">
          <textarea className="rb-analyze-textarea" placeholder="Paste the job description here to get ATS score and keyword analysis…" value={jobDesc} onChange={e => setJobDesc(e.target.value)} rows={4}/>
          <div className="rb-analyze-footer">
            <button className="btn-primary" onClick={analyze} disabled={analyzing || !jobDesc.trim() || !data.contact.name}>
              {analyzing ? <><Loader size={14} className="spin"/>Analyzing…</> : <><Sparkles size={14}/>Analyze Resume</>}
            </button>
            {suggestions.length > 0 && <span className="muted" style={{ fontSize: 12 }}>{suggestions.length} suggestions found</span>}
          </div>
          {/* Keyword results */}
          {(matchedKw.length > 0 || missingKw.length > 0) && (
            <div className="rb-kw-results">
              <div className="rb-kw-col">
                <p className="rb-kw-heading" style={{ color: '#10B981' }}>✓ Matched Keywords</p>
                <div className="rb-kw-cloud">{matchedKw.map((w, i) => <span key={i} className="kw-chip matched"><CheckCircle size={10}/>{w}</span>)}</div>
              </div>
              <div className="rb-kw-col">
                <p className="rb-kw-heading" style={{ color: '#EF4444' }}>✗ Missing Keywords</p>
                <div className="rb-kw-cloud">{missingKw.map((w, i) => <span key={i} className="kw-chip missing"><XCircle size={10}/>{w}</span>)}</div>
              </div>
            </div>
          )}
          {suggestions.length > 0 && (
            <div className="rb-suggestions">
              <p className="rb-suggestions-heading">AI Suggestions</p>
              {suggestions.map((s, i) => (
                <div key={i} className={`suggestion-item priority-${s.priority}`}>
                  <div className="suggestion-head">
                    <span className="suggestion-section">{s.section}</span>
                    <span className={`priority-pill p-${s.priority}`}>{s.priority}</span>
                  </div>
                  <p className="suggestion-new">✦ {s.suggested}</p>
                  {s.reason && <p className="suggestion-reason">{s.reason}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Cover Letter panel ── */}
      {coverOpen && (
        <div className="rb-analyze-bar">
          <div className="rb-cover-header"><Mail size={15}/><strong>AI Cover Letter Generator</strong></div>
          {!jobDesc.trim() && <textarea className="rb-analyze-textarea" placeholder="Paste the job description here first, then generate your cover letter…" value={jobDesc} onChange={e => setJobDesc(e.target.value)} rows={3}/>}
          <button className="btn-primary" onClick={generateCoverLetter} disabled={coverLoading || !data.contact.name}>
            {coverLoading ? <><Loader size={14} className="spin"/>Generating…</> : <><Sparkles size={14}/>Generate Cover Letter</>}
          </button>
          {coverLetter && (
            <div className="rb-cover-output">
              <div className="rb-cover-toolbar">
                <span className="rb-kw-heading">Your Cover Letter</span>
                <button className="btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(coverLetter); }}>Copy</button>
              </div>
              <pre className="rb-cover-text">{coverLetter}</pre>
            </div>
          )}
        </div>
      )}

      {/* ── Two-column body ── */}
      <div className="rb-body">
        {/* ── LEFT: Editor ── */}
        <div className="rb-editor">
          {/* Contact */}
          <Section title="Contact Information" icon={<User size={15}/>} defaultOpen>
            <div className="rb-form-grid">
              {([['Full Name','name'],['Email','email'],['Phone','phone'],['Location','location'],['LinkedIn URL','linkedin'],['GitHub URL','github']] as [string, keyof Contact][]).map(([label, key]) => (
                <div key={key} className={`rb-field ${key === 'name' ? 'span-2' : ''}`}>
                  <label>{label}</label>
                  <input value={data.contact[key]} onChange={e => updContact({ [key]: e.target.value })} placeholder={label}/>
                </div>
              ))}
            </div>
          </Section>

          {/* Summary */}
          <Section title="Professional Summary" icon={<AlignLeft size={15}/>}>
            <textarea className="rb-textarea" rows={4} placeholder="Write a 2–3 sentence summary highlighting your experience, key skills, and career goals…" value={data.summary} onChange={e => upd({ summary: e.target.value })}/>
            <span className="rb-char-hint">{data.summary.length} chars</span>
          </Section>

          {/* Experience */}
          <Section title="Work Experience" icon={<Briefcase size={15}/>} defaultOpen>
            {data.experience.map((exp, idx) => (
              <div key={exp.id} className="rb-list-card">
                <div className="rb-list-card-header">
                  <span className="rb-list-card-label">{exp.title || exp.company || `Position ${idx + 1}`}</span>
                  <button className="rb-remove-btn" onClick={() => upd({ experience: data.experience.filter(e => e.id !== exp.id) })}><Trash2 size={13}/></button>
                </div>
                <div className="rb-form-grid">
                  <div className="rb-field span-2"><label>Job Title</label><input value={exp.title} onChange={e => upd({ experience: data.experience.map(x => x.id === exp.id ? { ...x, title: e.target.value } : x) })} placeholder="Software Engineer"/></div>
                  <div className="rb-field span-2"><label>Company</label><input value={exp.company} onChange={e => upd({ experience: data.experience.map(x => x.id === exp.id ? { ...x, company: e.target.value } : x) })} placeholder="Acme Corp"/></div>
                  <div className="rb-field"><label>Location</label><input value={exp.location} onChange={e => upd({ experience: data.experience.map(x => x.id === exp.id ? { ...x, location: e.target.value } : x) })} placeholder="San Francisco, CA"/></div>
                  <div className="rb-field"><label>Start Date</label><input value={exp.start} onChange={e => upd({ experience: data.experience.map(x => x.id === exp.id ? { ...x, start: e.target.value } : x) })} placeholder="Jan 2022"/></div>
                  <div className="rb-field">
                    <label>End Date</label>
                    <input value={exp.current ? 'Present' : exp.end} disabled={exp.current} onChange={e => upd({ experience: data.experience.map(x => x.id === exp.id ? { ...x, end: e.target.value } : x) })} placeholder="Dec 2024"/>
                  </div>
                  <div className="rb-field rb-checkbox-field">
                    <label><input type="checkbox" checked={exp.current} onChange={e => upd({ experience: data.experience.map(x => x.id === exp.id ? { ...x, current: e.target.checked, end: '' } : x) })}/> Current role</label>
                  </div>
                </div>
                <div className="rb-bullets-section">
                  <label className="rb-bullets-label">Bullet Points (achievements / responsibilities)</label>
                  {exp.bullets.map((b, i) => (
                    <div key={i} className="rb-bullet-row">
                      <span className="rb-bullet-dot">•</span>
                      <input value={b} onChange={e => updBullet(exp.id, i, e.target.value)} placeholder="Increased system performance by 40% by…"/>
                      <button className="rb-remove-btn" onClick={() => removeBullet(exp.id, i)}><Trash2 size={12}/></button>
                    </div>
                  ))}
                  <button className="rb-add-inline" onClick={() => addBullet(exp.id)}><Plus size={13}/> Add bullet</button>
                </div>
              </div>
            ))}
            <button className="rb-add-btn" onClick={() => upd({ experience: [...data.experience, { id: uid(), company: '', title: '', location: '', start: '', end: '', current: false, bullets: [''] }] })}>
              <Plus size={14}/> Add Experience
            </button>
          </Section>

          {/* Education */}
          <Section title="Education" icon={<GraduationCap size={15}/>}>
            {data.education.map((edu, idx) => (
              <div key={edu.id} className="rb-list-card">
                <div className="rb-list-card-header">
                  <span className="rb-list-card-label">{edu.school || `School ${idx + 1}`}</span>
                  <button className="rb-remove-btn" onClick={() => upd({ education: data.education.filter(e => e.id !== edu.id) })}><Trash2 size={13}/></button>
                </div>
                <div className="rb-form-grid">
                  <div className="rb-field span-2"><label>School</label><input value={edu.school} onChange={e => upd({ education: data.education.map(x => x.id === edu.id ? { ...x, school: e.target.value } : x) })} placeholder="MIT"/></div>
                  <div className="rb-field"><label>Degree</label><input value={edu.degree} onChange={e => upd({ education: data.education.map(x => x.id === edu.id ? { ...x, degree: e.target.value } : x) })} placeholder="B.S."/></div>
                  <div className="rb-field"><label>Field</label><input value={edu.field} onChange={e => upd({ education: data.education.map(x => x.id === edu.id ? { ...x, field: e.target.value } : x) })} placeholder="Computer Science"/></div>
                  <div className="rb-field"><label>Start</label><input value={edu.start} onChange={e => upd({ education: data.education.map(x => x.id === edu.id ? { ...x, start: e.target.value } : x) })} placeholder="2018"/></div>
                  <div className="rb-field"><label>End</label><input value={edu.end} onChange={e => upd({ education: data.education.map(x => x.id === edu.id ? { ...x, end: e.target.value } : x) })} placeholder="2022"/></div>
                  <div className="rb-field"><label>GPA</label><input value={edu.gpa} onChange={e => upd({ education: data.education.map(x => x.id === edu.id ? { ...x, gpa: e.target.value } : x) })} placeholder="3.8"/></div>
                </div>
              </div>
            ))}
            <button className="rb-add-btn" onClick={() => upd({ education: [...data.education, { id: uid(), school: '', degree: '', field: '', start: '', end: '', gpa: '' }] })}>
              <Plus size={14}/> Add Education
            </button>
          </Section>

          {/* Skills */}
          <Section title="Skills" icon={<Code2 size={15}/>} defaultOpen>
            <div className="rb-skill-input-row">
              <input className="rb-skill-input" placeholder="Type a skill and press Enter or comma" value={skillInput} onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill(skillInput); setSkillInput(''); } }} />
              <button className="btn-ghost btn-sm" onClick={() => { addSkill(skillInput); setSkillInput(''); }}>Add</button>
            </div>
            <div className="rb-skill-tags">
              {data.skills.map((s, i) => (
                <span key={i} className="rb-skill-chip">{s}<button onClick={() => upd({ skills: data.skills.filter((_, j) => j !== i) })}><X_/></button></span>
              ))}
            </div>
          </Section>

          {/* Projects */}
          <Section title="Projects" icon={<FolderGit2 size={15}/>}>
            {data.projects.map((proj, idx) => (
              <div key={proj.id} className="rb-list-card">
                <div className="rb-list-card-header">
                  <span className="rb-list-card-label">{proj.name || `Project ${idx + 1}`}</span>
                  <button className="rb-remove-btn" onClick={() => upd({ projects: data.projects.filter(p => p.id !== proj.id) })}><Trash2 size={13}/></button>
                </div>
                <div className="rb-form-grid">
                  <div className="rb-field span-2"><label>Project Name</label><input value={proj.name} onChange={e => upd({ projects: data.projects.map(x => x.id === proj.id ? { ...x, name: e.target.value } : x) })} placeholder="My Project"/></div>
                  <div className="rb-field span-2"><label>URL</label><input value={proj.url} onChange={e => upd({ projects: data.projects.map(x => x.id === proj.id ? { ...x, url: e.target.value } : x) })} placeholder="https://github.com/…"/></div>
                  <div className="rb-field span-2"><label>Description</label><textarea className="rb-textarea-sm" value={proj.description} rows={2} onChange={e => upd({ projects: data.projects.map(x => x.id === proj.id ? { ...x, description: e.target.value } : x) })} placeholder="What did this project do?"/></div>
                  <div className="rb-field span-2"><label>Technologies (comma separated)</label><input value={proj.tech.join(', ')} onChange={e => upd({ projects: data.projects.map(x => x.id === proj.id ? { ...x, tech: e.target.value.split(',').map(t => t.trim()) } : x) })} placeholder="React, Node.js, PostgreSQL"/></div>
                </div>
              </div>
            ))}
            <button className="rb-add-btn" onClick={() => upd({ projects: [...data.projects, { id: uid(), name: '', description: '', url: '', tech: [] }] })}>
              <Plus size={14}/> Add Project
            </button>
          </Section>

          {/* Certifications */}
          <Section title="Certifications" icon={<Award size={15}/>}>
            {data.certifications.map((cert, i) => (
              <div key={i} className="rb-bullet-row">
                <span className="rb-bullet-dot">•</span>
                <input value={cert} onChange={e => upd({ certifications: data.certifications.map((c, j) => j === i ? e.target.value : c) })} placeholder="AWS Solutions Architect, 2024"/>
                <button className="rb-remove-btn" onClick={() => upd({ certifications: data.certifications.filter((_, j) => j !== i) })}><Trash2 size={12}/></button>
              </div>
            ))}
            <div className="rb-cert-input-row">
              <input className="rb-skill-input" placeholder="Add certification…" value={certInput} onChange={e => setCertInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { upd({ certifications: [...data.certifications, certInput.trim()] }); setCertInput(''); } }}/>
              <button className="btn-ghost btn-sm" onClick={() => { if (certInput.trim()) { upd({ certifications: [...data.certifications, certInput.trim()] }); setCertInput(''); } }}>Add</button>
            </div>
          </Section>
        </div>

        {/* ── RIGHT: Live Preview ── */}
        <div className="rb-preview-col">
          <div className="rb-preview-sticky">
            <div className="rb-preview-header"><FileText size={14}/> Live Preview</div>
            <ResumePreview data={data} template={template}/>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Tiny inline X icon to avoid import collision */
function X_() { return <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }

function buildResumeText(d: ResumeData): string {
  const lines: string[] = [];
  const c = d.contact;
  if (c.name) lines.push(c.name);
  if (c.email || c.phone || c.location) lines.push([c.email, c.phone, c.location].filter(Boolean).join(' | '));
  if (c.linkedin) lines.push(c.linkedin);
  if (c.github)   lines.push(c.github);
  if (d.summary)  { lines.push(''); lines.push('SUMMARY'); lines.push(d.summary); }
  if (d.experience.length) {
    lines.push(''); lines.push('EXPERIENCE');
    d.experience.forEach(e => {
      lines.push(`${e.title} at ${e.company} (${e.start} - ${e.current ? 'Present' : e.end})`);
      e.bullets.forEach(b => b && lines.push(`• ${b}`));
    });
  }
  if (d.education.length) {
    lines.push(''); lines.push('EDUCATION');
    d.education.forEach(e => lines.push(`${e.degree} ${e.field} — ${e.school} (${e.start}-${e.end})`));
  }
  if (d.skills.length) { lines.push(''); lines.push('SKILLS'); lines.push(d.skills.join(', ')); }
  if (d.projects.length) {
    lines.push(''); lines.push('PROJECTS');
    d.projects.forEach(p => { lines.push(`${p.name}: ${p.description}`); if (p.tech.length) lines.push(p.tech.join(', ')); });
  }
  if (d.certifications.length) { lines.push(''); lines.push('CERTIFICATIONS'); d.certifications.forEach(c => lines.push(`• ${c}`)); }
  return lines.join('\n');
}
