import { useEffect, useState, Suspense, useMemo, useCallback } from 'react';
import {
  Briefcase, TrendingUp, FileText, Bot, ArrowRight, Zap, Target,
  BookOpen, Bookmark, BarChart2, MapPin, X, ExternalLink, ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { getCareerPageJobs, getTrendingSkills } from '../services/api';
import { getSavedJobs } from './JobsPanel';
import { useTilt } from '../hooks/useTilt';
import Globe3D, { type CityHub } from './Globe3D';

interface DashboardPanelProps {
  onNavigate: (p: string) => void;
}

interface SkillTrend {
  skill: string;
  count: number;
  score: number;
}

interface Job {
  title: string;
  company: string;
  location?: string;
  url?: string;
  type?: string;
}

const QUICK_ACTIONS = [
  { label: 'Find Job Matches',    sub: 'AI-ranked live openings',     page: 'jobs',    icon: <Briefcase size={18} /> },
  { label: 'Optimize Resume',     sub: 'ATS score & AI rewriting',    page: 'resume',  icon: <FileText size={18} />  },
  { label: 'Career Intelligence', sub: 'Market trends & salary data', page: 'career',  icon: <TrendingUp size={18} />},
  { label: 'AI Career Copilot',   sub: 'Instant career guidance',     page: 'copilot', icon: <Bot size={18} />       },
];

const TIPS = [
  { icon: <Zap size={15} />,      text: 'Add 3–5 measurable achievements to your resume to boost ATS score by ~30%.' },
  { icon: <Target size={15} />,   text: 'Tailor keywords to each job description — generic resumes get filtered out.' },
  { icon: <BookOpen size={15} />, text: 'Upskilling in cloud (AWS/GCP) increases salary offers by an average of 18%.' },
];

const SKILL_COLORS = [
  '#6366F1','#8B5CF6','#06B6D4','#10B981','#F59E0B',
  '#EC4899','#3B82F6','#14B8A6','#F97316','#A855F7',
];

function TiltCard({ className, children, onClick }: { className: string; children: React.ReactNode; onClick?: () => void }) {
  const { ref, onMouseMove, onMouseLeave } = useTilt(7);
  const Tag = onClick ? 'button' : 'div';
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag
      ref={ref as React.RefObject<any>}
      className={className}
      onMouseMove={onMouseMove as React.MouseEventHandler<any>}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      <div className="tilt-shine" />
      {children}
    </Tag>
  );
}

export default function DashboardPanel({ onNavigate }: DashboardPanelProps) {
  const [liveJobCount, setLiveJobCount]   = useState<number | null>(null);
  const [liveJobError, setLiveJobError]   = useState(false);
  const [allJobs, setAllJobs]             = useState<Job[]>([]);
  const [trendingSkills, setTrendingSkills] = useState<SkillTrend[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [skillsError, setSkillsError]     = useState(false);
  const [selectedHub, setSelectedHub]     = useState<CityHub | null>(null);
  const savedJobs = useMemo(() => getSavedJobs(), []);
  const savedCount = savedJobs.length;
  const atsScore = useMemo(() => {
    const raw = localStorage.getItem('last_ats_score');
    return raw ? parseInt(raw, 10) : null;
  }, []);

  const fetchJobs = useCallback(() => {
    setLiveJobError(false);
    getCareerPageJobs('software engineer', 200)
      .then(d => {
        const jobs = d.jobs ?? [];
        setLiveJobCount(d.total ?? jobs.length ?? 0);
        setAllJobs(jobs);
      })
      .catch(() => { setLiveJobCount(null); setLiveJobError(true); });
  }, []);

  const fetchSkills = useCallback(() => {
    setSkillsError(false);
    setSkillsLoading(true);
    getTrendingSkills()
      .then(d => { setTrendingSkills(d.skills?.slice(0, 12) ?? []); setSkillsLoading(false); })
      .catch(() => { setSkillsLoading(false); setSkillsError(true); });
  }, []);

  useEffect(() => { fetchJobs(); fetchSkills(); }, []);

  const cityJobs = useMemo(() => {
    if (!selectedHub) return [];
    const city = selectedHub.name.toLowerCase();
    const firstWord = city.split(' ')[0];
    return allJobs.filter(j =>
      j.location?.toLowerCase().includes(city) ||
      j.location?.toLowerCase().includes(firstWord)
    ).slice(0, 20);
  }, [selectedHub, allJobs]);

  const STATS = [
    {
      label: 'Live Listings',
      value: liveJobError ? 'Error' : liveJobCount != null ? `${liveJobCount}+` : '…',
      icon: <Briefcase size={18} />, color: 'blue',
      error: liveJobError, onRetry: fetchJobs,
    },
    { label: 'Saved Jobs',     value: String(savedCount), icon: <Bookmark size={18} />,  color: 'green'  },
    { label: 'Skills Tracked', value: trendingSkills.length > 0 ? String(trendingSkills.length) : (skillsError ? 'Error' : '…'), icon: <TrendingUp size={18} />, color: 'purple' },
    {
      label: atsScore != null ? 'Resume ATS Score' : 'ATS Score',
      value: atsScore != null ? `${atsScore}%` : '—',
      icon: <Target size={18} />, color: 'yellow',
      hint: atsScore == null ? 'Scan your resume →' : undefined,
      onClick: atsScore == null ? () => onNavigate('resume') : undefined,
    },
  ];

  const MARQUEE_COMPANIES = [
    'Stripe','Anthropic','Databricks','Cloudflare','Datadog','Airbnb','Coinbase',
    'Spotify','GitLab','Figma','Braze','Affirm','Klaviyo','Discord','Lyft',
    'Twilio','Plaid','Dropbox','Instacart','Vercel','Amplitude','Fivetran',
    'Robinhood','Pinterest','Toast','SoFi','Webflow','LaunchDarkly','Duolingo',
  ];

  return (
    <div className="panel dash-panel">

      {/* ── Compact hero ── */}
      <div className="dash-hero">
        <div>
          <div className="dash-eyebrow">AI-Powered Career Platform</div>
          <h2 className="dash-title">Find your next global position</h2>
          <p className="dash-sub">Live jobs from 67+ companies · ATS optimization · AI coaching</p>
        </div>
        <button className="btn-primary btn-lg" onClick={() => onNavigate('jobs')}>
          Browse Live Jobs <ArrowRight size={14} />
        </button>
      </div>

      {/* ── Company marquee ── */}
      <div className="marquee-wrap">
        <span className="marquee-label">Hiring from</span>
        <div className="marquee-track-outer">
          <div className="marquee-track">
            {[...MARQUEE_COMPANIES, ...MARQUEE_COMPANIES].map((c, i) => (
              <span key={i} className="marquee-chip">{c}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="stats-grid">
        {STATS.map(s => (
          <TiltCard key={s.label} className={`stat-card stat-${s.color}`} onClick={s.onClick}>
            <div className={`stat-icon-wrap stat-icon-${s.color}`}>{s.icon}</div>
            <div style={{ flex: 1 }}>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
              {s.hint && <div className="stat-hint">{s.hint}</div>}
            </div>
            {s.error && s.onRetry && (
              <button className="stat-retry-btn" onClick={e => { e.stopPropagation(); s.onRetry!(); }} title="Retry">
                <RefreshCw size={13} />
              </button>
            )}
          </TiltCard>
        ))}
      </div>

      {/* ── Interactive Globe section ── */}
      <div className="globe-section">
        <div className="globe-section-header">
          <div>
            <h3 className="section-heading" style={{ marginBottom: 4 }}>Global Job Map</h3>
            <p className="globe-hint">
              {selectedHub
                ? `Showing openings near ${selectedHub.name} — double-click globe to reset`
                : 'Click any city pin to explore job openings · Double-click to resume rotation'}
            </p>
          </div>
          {selectedHub && (
            <button className="globe-reset-btn" onClick={() => setSelectedHub(null)}>
              <X size={14} /> Clear selection
            </button>
          )}
        </div>

        <div className="globe-layout">
          <div className="globe-canvas-wrap">
            <Suspense fallback={<div className="globe-fallback" />}>
              <Globe3D onCitySelect={hub => setSelectedHub(hub)} />
            </Suspense>
          </div>

          {/* City jobs panel */}
          <div className={`city-jobs-panel ${selectedHub ? 'city-jobs-panel--open' : ''}`}>
            {selectedHub && (
              <>
                <div className="city-jobs-header">
                  <MapPin size={15} className="city-pin-icon" />
                  <div>
                    <div className="city-jobs-title">{selectedHub.name}</div>
                    <div className="city-jobs-count">
                      {cityJobs.length > 0 ? `${cityJobs.length} openings found` : 'Fetching openings…'}
                    </div>
                  </div>
                </div>
                <div className="city-jobs-list">
                  {cityJobs.length > 0 ? (
                    cityJobs.map((j, i) => (
                      <div key={i} className="city-job-row">
                        <div className="city-job-logo">{j.company?.[0] ?? '?'}</div>
                        <div className="city-job-info">
                          <div className="city-job-title">{j.title}</div>
                          <div className="city-job-company">{j.company}</div>
                          {j.location && <div className="city-job-loc"><MapPin size={10} />{j.location}</div>}
                        </div>
                        {j.url && (
                          <a href={j.url} target="_blank" rel="noopener noreferrer" className="city-job-apply">
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    ))
                  ) : allJobs.length > 0 ? (
                    <div className="city-jobs-empty">
                      <MapPin size={22} className="city-jobs-empty-icon" />
                      <p>No exact matches in {selectedHub.name}.</p>
                      <button className="btn-ghost btn-sm" onClick={() => onNavigate('jobs')}>
                        Browse all jobs →
                      </button>
                    </div>
                  ) : (
                    <div className="city-jobs-loading">
                      {[...Array(4)].map((_, i) => <div key={i} className="city-job-skeleton" />)}
                    </div>
                  )}
                </div>
              </>
            )}
            {!selectedHub && (
              <div className="city-jobs-idle">
                <MapPin size={28} />
                <p>Click a city pin on the globe<br/>to see local openings</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick actions ── */}
      <h3 className="section-heading">Quick Actions</h3>
      <div className="quick-action-bar">
        {QUICK_ACTIONS.map((a, i) => (
          <button key={a.label} className="quick-action-item" onClick={() => onNavigate(a.page)}>
            <span className="quick-action-icon">{a.icon}</span>
            <span className="quick-action-text">
              <span className="quick-action-label">{a.label}</span>
              <span className="quick-action-sub">{a.sub}</span>
            </span>
            <ChevronRight size={15} className="quick-action-chevron" />
            {i < QUICK_ACTIONS.length - 1 && <span className="quick-action-sep" />}
          </button>
        ))}
      </div>

      {/* ── Tech Pulse ── */}
      <div className="section-heading-row">
        <h3 className="section-heading" style={{ marginBottom: 0 }}>
          <BarChart2 size={15} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
          Tech Pulse
        </h3>
        <span className="section-badge">Live from StackOverflow</span>
      </div>
      <div className="trending-skills-grid">
        {skillsLoading ? (
          Array.from({ length: 12 }).map((_, i) => <div key={i} className="trending-skill-card skeleton-card" />)
        ) : skillsError ? (
          <div className="inline-error-state">
            <span>Couldn't load skills data</span>
            <button className="inline-retry-btn" onClick={fetchSkills}><RefreshCw size={12} /> Retry</button>
          </div>
        ) : trendingSkills.length > 0 ? (
          trendingSkills.map((s, i) => (
            <div key={s.skill} className="trending-skill-card">
              <div className="trending-skill-name">{s.skill}</div>
              <div className="trending-skill-bar-wrap">
                <div className="trending-skill-bar" style={{ width: `${s.score}%`, background: SKILL_COLORS[i % SKILL_COLORS.length] }} />
              </div>
              <div className="trending-skill-count">
                {s.count >= 1_000_000 ? `${(s.count / 1_000_000).toFixed(1)}M`
                  : s.count >= 1_000 ? `${(s.count / 1_000).toFixed(0)}K`
                  : String(s.count)}{' '}questions
              </div>
            </div>
          ))
        ) : (
          <p className="no-data-msg">Skills data unavailable</p>
        )}
      </div>

      {/* ── Saved jobs preview ── */}
      {savedCount > 0 && (
        <>
          <h3 className="section-heading">Saved Jobs</h3>
          <div className="saved-preview">
            {savedJobs.slice(0, 3).map((j, i) => (
              <div key={i} className="saved-preview-row">
                <div className="job-logo">{j.company?.[0] ?? '?'}</div>
                <div className="saved-preview-info">
                  <span className="saved-preview-title">{j.title}</span>
                  <span className="saved-preview-company">{j.company}</span>
                </div>
                {j.url && <a href={j.url} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm"><ArrowRight size={12} />Apply</a>}
              </div>
            ))}
            {savedCount > 3 && (
              <button className="btn-ghost btn-sm" onClick={() => onNavigate('jobs')}>View all {savedCount} saved →</button>
            )}
          </div>
        </>
      )}

      {/* ── Tips ── */}
      <h3 className="section-heading">Career Tips</h3>
      <div className="tips-list">
        {TIPS.map((t, i) => (
          <div key={i} className="tip-item">
            <span className="tip-icon">{t.icon}</span>
            <p>{t.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
