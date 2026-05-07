import React, { useState } from 'react';
import {
  TrendingUp, Briefcase, BookOpen, Newspaper, Zap, Target,
  ExternalLink, Star, AlertCircle, ChevronDown, ChevronUp, Loader
} from 'lucide-react';
import { getCareerIntelligence } from '../services/api';
import '../styles/CareerIntelligence.css';

interface CareerIntelligenceProps {
  prefillSkills?: string[];
  prefillJobTitle?: string;
}

const CareerIntelligence: React.FC<CareerIntelligenceProps> = ({
  prefillSkills = [],
  prefillJobTitle = '',
}) => {
  const [jobTitle, setJobTitle] = useState(prefillJobTitle);
  const [skillsInput, setSkillsInput] = useState(prefillSkills.join(', '));
  const [targetRole, setTargetRole] = useState('');
  const [yearsExp, setYearsExp] = useState('');
  const [industry, setIndustry] = useState('Technology');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('report');
  const [expandedJob, setExpandedJob] = useState<number | null>(null);

  const handleSubmit = async () => {
    if (!jobTitle.trim() || !skillsInput.trim()) {
      setError('Please enter your job title and skills.');
      return;
    }
    setLoading(true);
    setError('');
    setData(null);

    try {
      const skills = skillsInput.split(',').map((s) => s.trim()).filter(Boolean);
      const result = await getCareerIntelligence({
        job_title: jobTitle,
        skills,
        target_role: targetRole || undefined,
        years_experience: yearsExp ? parseInt(yearsExp) : 0,
        industry,
      });
      setData(result);
      setActiveTab('report');
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const report = data?.intelligence_report || {};
  const liveJobs: any[] = data?.live_jobs || [];
  const news = data?.news || {};
  const resources = data?.learning_resources || {};

  const demandColor = (score: number) =>
    score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  const urgencyColor = (u: string) =>
    u === 'high' ? '#ef4444' : u === 'medium' ? '#f59e0b' : '#10b981';

  const priorityColor = (p: string) =>
    p === 'high' ? '#ef4444' : p === 'medium' ? '#f59e0b' : '#10b981';

  const recommendationColor = (r: string) => {
    if (r === 'strong fit') return '#10b981';
    if (r === 'good fit') return '#16a34a';
    if (r === 'stretch role') return '#f59e0b';
    return '#6b7280';
  };

  return (
    <div className="ci-wrapper">
      <div className="ci-header">
        <div className="ci-header-icon"><TrendingUp size={28} /></div>
        <div>
          <h2>Career Intelligence</h2>
          <p>Live market data + AI synthesis from job boards, GitHub, arXiv & HackerNews</p>
        </div>
      </div>

      {/* Input Form */}
      <div className="ci-form">
        <div className="ci-form-row">
          <div className="ci-field">
            <label>Current Job Title *</label>
            <input
              type="text"
              placeholder="e.g. Software Engineer"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </div>
          <div className="ci-field">
            <label>Target Role (optional)</label>
            <input
              type="text"
              placeholder="e.g. Senior ML Engineer"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
            />
          </div>
        </div>

        <div className="ci-field">
          <label>Your Skills * <span className="ci-hint">(comma separated)</span></label>
          <input
            type="text"
            placeholder="e.g. Python, React, AWS, FastAPI, PostgreSQL"
            value={skillsInput}
            onChange={(e) => setSkillsInput(e.target.value)}
          />
        </div>

        <div className="ci-form-row">
          <div className="ci-field">
            <label>Years of Experience</label>
            <input
              type="number"
              min="0"
              max="40"
              placeholder="e.g. 3"
              value={yearsExp}
              onChange={(e) => setYearsExp(e.target.value)}
            />
          </div>
          <div className="ci-field">
            <label>Industry</label>
            <select value={industry} onChange={(e) => setIndustry(e.target.value)}>
              <option>Technology</option>
              <option>Finance</option>
              <option>Healthcare</option>
              <option>E-commerce</option>
              <option>Gaming</option>
              <option>Education</option>
              <option>Cybersecurity</option>
              <option>Data & AI</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="ci-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <button
          className="ci-submit-btn"
          onClick={handleSubmit}
          disabled={loading || !jobTitle.trim() || !skillsInput.trim()}
        >
          {loading ? (
            <>
              <Loader size={18} className="ci-spin" />
              Fetching live market data &amp; analyzing with AI...
            </>
          ) : (
            <>
              <Zap size={18} />
              Generate Career Intelligence Report
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {data && (
        <div className="ci-results">
          {/* Market Demand Banner */}
          {report.market_demand_score !== undefined && (
            <div className="ci-demand-banner">
              <div className="ci-demand-score" style={{ color: demandColor(report.market_demand_score) }}>
                <span className="ci-demand-number">{report.market_demand_score}</span>
                <span className="ci-demand-label">/ 100</span>
              </div>
              <div className="ci-demand-info">
                <strong>Market Demand Score</strong>
                <p>{report.market_summary}</p>
              </div>
              {report.salary_range && (
                <div className="ci-salary">
                  <span className="ci-salary-label">Salary Range</span>
                  <span className="ci-salary-range">
                    {report.salary_range.low} – {report.salary_range.high}
                  </span>
                  <span className="ci-salary-mid">Mid: {report.salary_range.mid}</span>
                </div>
              )}
            </div>
          )}

          {report.market_insight && (
            <div className="ci-insight-banner">
              <Zap size={16} />
              <span><strong>Market Insight:</strong> {report.market_insight}</span>
            </div>
          )}

          {/* Tabs */}
          <div className="ci-tabs">
            {[
              { id: 'report', label: 'AI Report', icon: <Target size={15} /> },
              { id: 'jobs', label: `Live Jobs (${liveJobs.length})`, icon: <Briefcase size={15} /> },
              { id: 'news', label: 'Industry News', icon: <Newspaper size={15} /> },
              { id: 'learn', label: 'Learning Resources', icon: <BookOpen size={15} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`ci-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* AI Report Tab */}
          {activeTab === 'report' && (
            <div className="ci-tab-content">
              <div className="ci-grid-2">
                {/* Skills in Demand */}
                {report.skills_in_demand?.length > 0 && (
                  <div className="ci-card">
                    <h4><TrendingUp size={16} /> Skills in Demand</h4>
                    <div className="ci-tags">
                      {report.skills_in_demand.map((s: string, i: number) => (
                        <span key={i} className="ci-tag ci-tag-green">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Hiring Companies */}
                {report.top_hiring_companies?.length > 0 && (
                  <div className="ci-card">
                    <h4><Briefcase size={16} /> Top Hiring Companies</h4>
                    <div className="ci-tags">
                      {report.top_hiring_companies.map((c: string, i: number) => (
                        <span key={i} className="ci-tag ci-tag-blue">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Skills Gap */}
              {report.skills_gap?.length > 0 && (
                <div className="ci-card ci-card-full">
                  <h4>Skills Gap Analysis</h4>
                  <div className="ci-skills-gap">
                    {report.skills_gap.map((g: any, i: number) => (
                      <div key={i} className="ci-gap-item">
                        <div className="ci-gap-header">
                          <span className="ci-gap-skill">{g.skill}</span>
                          <span
                            className="ci-gap-urgency"
                            style={{ background: urgencyColor(g.urgency) }}
                          >
                            {g.urgency}
                          </span>
                        </div>
                        <p className="ci-gap-reason">{g.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Career Path */}
              {report.career_path?.length > 0 && (
                <div className="ci-card ci-card-full">
                  <h4>Career Path Roadmap</h4>
                  <div className="ci-career-path">
                    {report.career_path.map((step: any, i: number) => (
                      <div key={i} className="ci-path-step">
                        <div className="ci-step-number">{step.step}</div>
                        <div className="ci-step-content">
                          <div className="ci-step-role">{step.role}</div>
                          <div className="ci-step-timeline">{step.timeline}</div>
                          <div className="ci-tags ci-tags-sm">
                            {step.key_skills_needed?.map((s: string, j: number) => (
                              <span key={j} className="ci-tag ci-tag-gray">{s}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Items */}
              {report.action_items?.length > 0 && (
                <div className="ci-card ci-card-full">
                  <h4>Action Items</h4>
                  <div className="ci-actions">
                    {report.action_items.map((a: any, i: number) => (
                      <div key={i} className="ci-action-item">
                        <div
                          className="ci-action-priority"
                          style={{ background: priorityColor(a.priority) }}
                        >
                          {a.priority}
                        </div>
                        <div className="ci-action-body">
                          <span className="ci-action-text">{a.action}</span>
                          <span className="ci-action-timeline">{a.timeline}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Industry Trends */}
              {report.industry_trends?.length > 0 && (
                <div className="ci-card ci-card-full">
                  <h4>Industry Trends</h4>
                  <ul className="ci-trend-list">
                    {report.industry_trends.map((t: string, i: number) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Live Jobs Tab */}
          {activeTab === 'jobs' && (
            <div className="ci-tab-content">
              {liveJobs.length === 0 ? (
                <div className="ci-empty">No live jobs found for this role right now.</div>
              ) : (
                <div className="ci-jobs-list">
                  {liveJobs.map((job: any, i: number) => (
                    <div key={i} className="ci-job-card">
                      <div
                        className="ci-job-header"
                        onClick={() => setExpandedJob(expandedJob === i ? null : i)}
                      >
                        <div className="ci-job-main">
                          <span className="ci-job-title">{job.title}</span>
                          <span className="ci-job-company">{job.company}</span>
                          <span className="ci-job-location">{job.location}</span>
                          {job.salary && <span className="ci-job-salary">{job.salary}</span>}
                        </div>
                        <div className="ci-job-right">
                          {job.match_score > 0 && (
                            <span
                              className="ci-job-match"
                              style={{ color: demandColor(job.match_score) }}
                            >
                              {job.match_score}% match
                            </span>
                          )}
                          {job.apply_recommendation && (
                            <span
                              className="ci-job-rec"
                              style={{ color: recommendationColor(job.apply_recommendation) }}
                            >
                              {job.apply_recommendation}
                            </span>
                          )}
                          {expandedJob === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>

                      {expandedJob === i && (
                        <div className="ci-job-detail">
                          {job.match_reason && <p className="ci-job-reason">{job.match_reason}</p>}
                          {job.tags?.length > 0 && (
                            <div className="ci-tags ci-tags-sm">
                              {job.tags.slice(0, 8).map((t: string, j: number) => (
                                <span key={j} className="ci-tag ci-tag-gray">{t}</span>
                              ))}
                            </div>
                          )}
                          {job.url && (
                            <a href={job.url} target="_blank" rel="noopener noreferrer" className="ci-job-link">
                              <ExternalLink size={14} /> View Job
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* News Tab */}
          {activeTab === 'news' && (
            <div className="ci-tab-content">
              <div className="ci-news-section">
                <h4><span className="ci-source-badge ci-hn">HN</span> HackerNews Top Stories</h4>
                {(news.hn_stories || []).length === 0 ? (
                  <div className="ci-empty">No stories found.</div>
                ) : (
                  <div className="ci-news-list">
                    {(news.hn_stories || []).map((s: any, i: number) => (
                      <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="ci-news-item">
                        <div className="ci-news-title">{s.title}</div>
                        <div className="ci-news-meta">
                          <span>↑ {s.points}</span>
                          <span>{s.num_comments} comments</span>
                          <span>{s.created_at}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div className="ci-news-section">
                <h4><span className="ci-source-badge ci-devto">DEV</span> DEV.to Articles</h4>
                {(news.devto_articles || []).length === 0 ? (
                  <div className="ci-empty">No articles found.</div>
                ) : (
                  <div className="ci-news-list">
                    {(news.devto_articles || []).map((a: any, i: number) => (
                      <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="ci-news-item">
                        <div className="ci-news-title">{a.title}</div>
                        <div className="ci-news-meta">
                          <span>❤ {a.reactions}</span>
                          <span>{a.reading_time} min read</span>
                          <span>{a.author}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Learning Resources Tab */}
          {activeTab === 'learn' && (
            <div className="ci-tab-content">
              <div className="ci-resources-section">
                <h4><Star size={15} /> Trending GitHub Repositories</h4>
                <div className="ci-repos-grid">
                  {(resources.github_repos || []).map((r: any, i: number) => (
                    <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="ci-repo-card">
                      <div className="ci-repo-name">{r.full_name}</div>
                      <div className="ci-repo-desc">{r.description}</div>
                      <div className="ci-repo-meta">
                        <span>⭐ {r.stargazers_count?.toLocaleString()}</span>
                        {r.language && <span>{r.language}</span>}
                      </div>
                      {r.topics?.length > 0 && (
                        <div className="ci-tags ci-tags-sm">
                          {r.topics.slice(0, 4).map((t: string, j: number) => (
                            <span key={j} className="ci-tag ci-tag-gray">{t}</span>
                          ))}
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              </div>

              <div className="ci-resources-section">
                <h4><BookOpen size={15} /> Latest arXiv Research Papers</h4>
                <div className="ci-papers-list">
                  {(resources.arxiv_papers || []).map((p: any, i: number) => (
                    <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" className="ci-paper-item">
                      <div className="ci-paper-title">{p.title}</div>
                      <div className="ci-paper-meta">
                        <span className="ci-source-badge ci-arxiv">arXiv</span>
                        <span>{p.published}</span>
                      </div>
                      {p.summary && <p className="ci-paper-summary">{p.summary}...</p>}
                    </a>
                  ))}
                </div>
              </div>

              {/* AI-suggested learning resources from the report */}
              {report.learning_resources?.length > 0 && (
                <div className="ci-resources-section">
                  <h4><Zap size={15} /> AI-Recommended Resources</h4>
                  <div className="ci-ai-resources">
                    {report.learning_resources.map((r: any, i: number) => (
                      <div key={i} className="ci-ai-resource">
                        <span className={`ci-source-badge ci-${r.type}`}>{r.type}</span>
                        <div>
                          <div className="ci-ai-res-title">{r.title}</div>
                          <div className="ci-ai-res-why">{r.relevance}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CareerIntelligence;
