import { useEffect, useState } from 'react';
import { Briefcase, TrendingUp, FileText, Bot, ArrowRight, Zap, Target, BookOpen, Bookmark, BarChart2 } from 'lucide-react';
import { getCareerPageJobs, getTrendingSkills } from '../services/api';
import { getSavedJobs } from './JobsPanel';

interface DashboardPanelProps {
  onNavigate: (p: string) => void;
}

interface SkillTrend {
  skill: string;
  count: number;
  score: number;
}

const QUICK_ACTIONS = [
  { label: 'Find My Job Matches',   sub: 'AI-ranked live openings',     page: 'jobs',    icon: <Briefcase size={22} />,  color: 'blue'   },
  { label: 'Analyze My Resume',     sub: 'ATS score & keyword gaps',    page: 'resume',  icon: <FileText size={22} />,   color: 'green'  },
  { label: 'Explore Career Intel',  sub: 'Market trends & salary data', page: 'career',  icon: <TrendingUp size={22} />, color: 'purple' },
  { label: 'Chat with AI Copilot',  sub: 'Instant career guidance',     page: 'copilot', icon: <Bot size={22} />,        color: 'orange' },
];

const TIPS = [
  { icon: <Zap size={16} />,      text: 'Add 3–5 measurable achievements to your resume to boost ATS score by ~30%.' },
  { icon: <Target size={16} />,   text: 'Tailor your resume keywords to each job description — generic resumes get filtered out.' },
  { icon: <BookOpen size={16} />, text: 'Upskilling in cloud (AWS/GCP) increases salary offers by an average of 18%.' },
];

const SKILL_COLORS = [
  '#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626',
  '#0891B2', '#4F46E5', '#16A34A', '#EA580C', '#9333EA',
];

export default function DashboardPanel({ onNavigate }: DashboardPanelProps) {
  const [liveJobCount, setLiveJobCount] = useState<number | null>(null);
  const [trendingSkills, setTrendingSkills] = useState<SkillTrend[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const savedCount = getSavedJobs().length;

  useEffect(() => {
    getCareerPageJobs('software engineer', 120)
      .then(d => setLiveJobCount(d.total ?? d.jobs?.length ?? 0))
      .catch(() => setLiveJobCount(null));

    getTrendingSkills()
      .then(d => { setTrendingSkills(d.skills?.slice(0, 12) ?? []); setSkillsLoading(false); })
      .catch(() => setSkillsLoading(false));
  }, []);

  const STATS = [
    { label: 'Live Job Listings',   value: liveJobCount != null ? `${liveJobCount}+` : '…', icon: <Briefcase size={20} />,  color: 'blue'   },
    { label: 'Saved Jobs',          value: String(savedCount),                                icon: <Bookmark size={20} />,   color: 'green'  },
    { label: 'Skills Tracked',      value: trendingSkills.length > 0 ? `${trendingSkills.length}` : '25', icon: <TrendingUp size={20} />, color: 'purple' },
    { label: 'AI Features Active',  value: '6',                                               icon: <Zap size={20} />,        color: 'yellow' },
  ];

  return (
    <div className="panel">
      {/* Welcome */}
      <div className="welcome-banner">
        <div>
          <h2 className="welcome-title">Welcome back 👋</h2>
          <p className="welcome-sub">Your AI-powered career platform is ready. Here's your overview.</p>
        </div>
        <button className="btn-primary" onClick={() => onNavigate('jobs')}>
          Find Job Matches <ArrowRight size={15} />
        </button>
      </div>

      {/* Stats grid */}
      <div className="stats-grid">
        {STATS.map(s => (
          <div key={s.label} className={`stat-card stat-${s.color}`}>
            <div className={`stat-icon-wrap stat-icon-${s.color}`}>{s.icon}</div>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <h3 className="section-heading">Quick Actions</h3>
      <div className="quick-grid">
        {QUICK_ACTIONS.map(a => (
          <button key={a.label} className={`quick-card quick-${a.color}`} onClick={() => onNavigate(a.page)}>
            <div className={`quick-icon quick-icon-${a.color}`}>{a.icon}</div>
            <div className="quick-text">
              <span className="quick-label">{a.label}</span>
              <span className="quick-sub">{a.sub}</span>
            </div>
            <ArrowRight size={16} className="quick-arrow" />
          </button>
        ))}
      </div>

      {/* Tech Pulse — Trending Skills */}
      <div className="section-heading-row">
        <h3 className="section-heading" style={{ marginBottom: 0 }}>
          <BarChart2 size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
          Tech Pulse
        </h3>
        <span className="section-badge">Live from StackOverflow</span>
      </div>
      <div className="trending-skills-grid">
        {skillsLoading ? (
          Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="trending-skill-card skeleton-card" />
          ))
        ) : trendingSkills.length > 0 ? (
          trendingSkills.map((s, i) => (
            <div key={s.skill} className="trending-skill-card">
              <div className="trending-skill-name">{s.skill}</div>
              <div className="trending-skill-bar-wrap">
                <div
                  className="trending-skill-bar"
                  style={{ width: `${s.score}%`, background: SKILL_COLORS[i % SKILL_COLORS.length] }}
                />
              </div>
              <div className="trending-skill-count">
                {s.count >= 1_000_000
                  ? `${(s.count / 1_000_000).toFixed(1)}M`
                  : s.count >= 1_000
                  ? `${(s.count / 1_000).toFixed(0)}K`
                  : String(s.count)}{' '}
                questions
              </div>
            </div>
          ))
        ) : (
          <p className="no-data-msg">Skills data unavailable</p>
        )}
      </div>

      {/* Saved jobs preview */}
      {savedCount > 0 && (
        <>
          <h3 className="section-heading">Saved Jobs</h3>
          <div className="saved-preview">
            {getSavedJobs().slice(0, 3).map((j, i) => (
              <div key={i} className="saved-preview-row">
                <div className="job-logo">{j.company?.[0] ?? '?'}</div>
                <div className="saved-preview-info">
                  <span className="saved-preview-title">{j.title}</span>
                  <span className="saved-preview-company">{j.company}</span>
                </div>
                {j.url && <a href={j.url} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm"><ArrowRight size={13} />Apply</a>}
              </div>
            ))}
            {savedCount > 3 && (
              <button className="btn-ghost btn-sm" onClick={() => onNavigate('jobs')}>View all {savedCount} saved jobs →</button>
            )}
          </div>
        </>
      )}

      {/* Tips */}
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
