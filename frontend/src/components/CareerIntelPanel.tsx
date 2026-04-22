import { useState } from 'react';
import { TrendingUp, Briefcase, Newspaper, BookOpen, Loader, Zap, ExternalLink, Star } from 'lucide-react';
import { getCareerIntelligence } from '../services/api';

const TABS = [
  { id: 'report', label: 'AI Report',       icon: <TrendingUp size={15} /> },
  { id: 'jobs',   label: 'Live Jobs',        icon: <Briefcase size={15} /> },
  { id: 'news',   label: 'Industry News',    icon: <Newspaper size={15} /> },
  { id: 'learn',  label: 'Learning',         icon: <BookOpen size={15} /> },
];

function ScoreBar({ score }: { score: number }) {
  const c = score >= 75 ? 'var(--green)' : score >= 50 ? 'var(--yellow)' : 'var(--red)';
  return (
    <div className="score-bar-wrap">
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${score}%`, background: c }} />
      </div>
      <span style={{ color: c, fontWeight: 700, fontSize: 13 }}>{score}</span>
    </div>
  );
}

export default function CareerIntelPanel() {
  const [jobTitle,   setJobTitle]   = useState('');
  const [skills,     setSkills]     = useState('');
  const [target,     setTarget]     = useState('');
  const [yoe,        setYoe]        = useState('');
  const [industry,   setIndustry]   = useState('Technology');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [data,       setData]       = useState<any>(null);
  const [tab,        setTab]        = useState('report');

  const run = async () => {
    if (!jobTitle.trim() || !skills.trim()) { setError('Job title and skills are required.'); return; }
    setLoading(true); setError(''); setData(null);
    try {
      const res = await getCareerIntelligence({
        job_title: jobTitle,
        skills: skills.split(',').map(s => s.trim()).filter(Boolean),
        target_role: target || undefined,
        years_experience: yoe ? +yoe : 0,
        industry,
      });
      setData(res);
      setTab('report');
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || 'Request failed.');
    } finally { setLoading(false); }
  };

  const report = data?.intelligence_report || {};
  const jobs:    any[] = data?.live_jobs     || [];
  const news            = data?.news          || {};
  const resources       = data?.learning_resources || {};
  const demandScore: number = report.market_demand_score ?? 0;

  return (
    <div className="panel">
      {/* Form */}
      <div className="intel-form">
        <div className="intel-form-grid">
          <div className="form-field">
            <label>Current Job Title *</label>
            <input placeholder="e.g. Software Engineer" value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Target Role</label>
            <input placeholder="e.g. Senior ML Engineer" value={target} onChange={e => setTarget(e.target.value)} />
          </div>
          <div className="form-field span-2">
            <label>Your Skills * <span className="optional">(comma separated)</span></label>
            <input placeholder="e.g. Python, React, AWS, FastAPI" value={skills} onChange={e => setSkills(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Years of Experience</label>
            <input type="number" min="0" max="40" placeholder="e.g. 3" value={yoe} onChange={e => setYoe(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Industry</label>
            <select value={industry} onChange={e => setIndustry(e.target.value)}>
              {['Technology','Finance','Healthcare','E-commerce','Gaming','Education','Cybersecurity','Data & AI'].map(i => <option key={i}>{i}</option>)}
            </select>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <button className="btn-primary" onClick={run} disabled={loading || !jobTitle.trim() || !skills.trim()}>
          {loading ? <><Loader size={16} className="spin" />Generating Report…</> : <><Zap size={16} />Generate Career Intelligence</>}
        </button>
      </div>

      {/* Results */}
      {data && (
        <>
          {/* Demand banner */}
          <div className="demand-banner">
            <div>
              <div className="demand-score-label">Market Demand Score</div>
              <ScoreBar score={demandScore} />
            </div>
            <div className="demand-summary">{report.market_summary}</div>
            {report.salary_range && (
              <div className="salary-pill">
                <span className="salary-lbl">Salary Range</span>
                <span className="salary-val">{report.salary_range.low} – {report.salary_range.high}</span>
                <span className="salary-mid">Mid: {report.salary_range.mid}</span>
              </div>
            )}
          </div>

          {report.market_insight && (
            <div className="insight-strip"><Zap size={14} /><span><strong>Insight:</strong> {report.market_insight}</span></div>
          )}

          {/* Tabs */}
          <div className="tab-bar">
            {TABS.map(t => (
              <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
                {t.icon}{t.label}
                {t.id === 'jobs' && jobs.length > 0 && <span className="tab-count">{jobs.length}</span>}
              </button>
            ))}
          </div>

          {/* AI Report */}
          {tab === 'report' && (
            <div className="intel-content">
              <div className="two-col">
                {report.skills_in_demand?.length > 0 && (
                  <div className="info-card">
                    <h4 className="info-card-title"><TrendingUp size={15} /> Skills in Demand</h4>
                    <div className="tag-cloud">{report.skills_in_demand.map((s: string, i: number) => <span key={i} className="tag tag-green">{s}</span>)}</div>
                  </div>
                )}
                {report.top_hiring_companies?.length > 0 && (
                  <div className="info-card">
                    <h4 className="info-card-title"><Briefcase size={15} /> Top Hiring Companies</h4>
                    <div className="tag-cloud">{report.top_hiring_companies.map((c: string, i: number) => <span key={i} className="tag tag-blue">{c}</span>)}</div>
                  </div>
                )}
              </div>

              {report.skills_gap?.length > 0 && (
                <div className="info-card full-width">
                  <h4 className="info-card-title">Skills Gap</h4>
                  {report.skills_gap.map((g: any, i: number) => (
                    <div key={i} className="gap-row">
                      <span className="gap-skill">{g.skill}</span>
                      <span className={`urgency-pill u-${g.urgency}`}>{g.urgency}</span>
                      <span className="gap-reason">{g.reason}</span>
                    </div>
                  ))}
                </div>
              )}

              {report.action_items?.length > 0 && (
                <div className="info-card full-width">
                  <h4 className="info-card-title">Action Items</h4>
                  {report.action_items.map((a: any, i: number) => (
                    <div key={i} className="action-row">
                      <span className={`priority-pill p-${a.priority}`}>{a.priority}</span>
                      <span className="action-text">{a.action}</span>
                      <span className="action-timeline">{a.timeline}</span>
                    </div>
                  ))}
                </div>
              )}

              {report.career_path?.length > 0 && (
                <div className="info-card full-width">
                  <h4 className="info-card-title">Career Path</h4>
                  <div className="career-path">
                    {report.career_path.map((step: any, i: number) => (
                      <div key={i} className="path-step">
                        <div className="path-num">{step.step}</div>
                        <div className="path-body">
                          <span className="path-role">{step.role}</span>
                          <span className="path-time">{step.timeline}</span>
                          <div className="tag-cloud">{step.key_skills_needed?.map((s: string, j: number) => <span key={j} className="tag">{s}</span>)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Live Jobs */}
          {tab === 'jobs' && (
            <div className="intel-content">
              {jobs.length === 0
                ? <div className="empty-state"><Briefcase size={36} /><p>No jobs fetched.</p></div>
                : jobs.map((j: any, i: number) => (
                  <div key={i} className="intel-job-card">
                    <div className="intel-job-main">
                      <div className="job-logo">{j.company?.[0] ?? '?'}</div>
                      <div className="intel-job-info">
                        <span className="job-title">{j.title}</span>
                        <span className="job-company">{j.company}</span>
                        {j.salary && <span className="job-salary">{j.salary}</span>}
                      </div>
                    </div>
                    {j.match_score > 0 && (
                      <div className="intel-match">
                        <span style={{ color: j.match_score >= 75 ? 'var(--green)' : j.match_score >= 50 ? 'var(--yellow)' : 'var(--slate-400)', fontWeight: 700 }}>{j.match_score}%</span>
                        <span className="muted" style={{ fontSize: 11 }}>match</span>
                      </div>
                    )}
                    {j.url && <a href={j.url} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm"><ExternalLink size={13} />Apply</a>}
                  </div>
                ))}
            </div>
          )}

          {/* News */}
          {tab === 'news' && (
            <div className="intel-content">
              <h4 className="section-subheading">HackerNews Top Stories</h4>
              {(news.hn_stories || []).map((s: any, i: number) => (
                <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="news-row">
                  <div className="news-title">{s.title}</div>
                  <div className="news-meta"><span>↑ {s.points}</span><span>{s.created_at}</span></div>
                </a>
              ))}
              <h4 className="section-subheading" style={{ marginTop: 20 }}>DEV.to Articles</h4>
              {(news.devto_articles || []).map((a: any, i: number) => (
                <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="news-row">
                  <div className="news-title">{a.title}</div>
                  <div className="news-meta"><span>❤ {a.reactions}</span><span>{a.reading_time} min</span><span>{a.author}</span></div>
                </a>
              ))}
            </div>
          )}

          {/* Learning */}
          {tab === 'learn' && (
            <div className="intel-content">
              <h4 className="section-subheading"><Star size={14} /> Top GitHub Repositories</h4>
              <div className="repos-grid">
                {(resources.github_repos || []).map((r: any, i: number) => (
                  <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="repo-card">
                    <div className="repo-name">{r.full_name}</div>
                    <div className="repo-desc">{r.description}</div>
                    <div className="repo-meta"><span>⭐ {r.stargazers_count?.toLocaleString()}</span>{r.language && <span>{r.language}</span>}</div>
                  </a>
                ))}
              </div>
              {resources.arxiv_papers?.length > 0 && (
                <>
                  <h4 className="section-subheading" style={{ marginTop: 20 }}>arXiv Research Papers</h4>
                  {resources.arxiv_papers.map((p: any, i: number) => (
                    <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" className="news-row">
                      <div className="news-title">{p.title}</div>
                      <div className="news-meta"><span className="source-badge arxiv">arXiv</span><span>{p.published}</span></div>
                    </a>
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
