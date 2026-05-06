import { useState } from 'react';
import { Search, Bell, X, Zap, BarChart2, Star } from 'lucide-react';

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  dashboard: { title: 'Dashboard',        sub: 'Your career overview at a glance' },
  jobs:      { title: 'Job Matches',      sub: 'Live job openings from 67+ top companies' },
  resume:    { title: 'Resume Analyzer',  sub: 'ATS optimization & keyword matching' },
  career:    { title: 'Career Intel',     sub: 'Live market data, trends & learning resources' },
  copilot:   { title: 'AI Copilot',       sub: 'Your 24/7 career assistant' },
};

const TIERS = [
  { id: 'fast',     label: 'Fast',     icon: <Zap size={11} />,      title: 'Cerebras/Groq 8B — fastest responses' },
  { id: 'balanced', label: 'Balanced', icon: <BarChart2 size={11} />, title: 'Cerebras/Groq 70B — speed + quality (default)' },
  { id: 'quality',  label: 'Quality',  icon: <Star size={11} />,      title: 'Best available model — slower but sharpest' },
];

interface TopBarProps {
  page: string;
  searchQuery: string;
  onSearch: (q: string) => void;
}

export default function TopBar({ page, searchQuery, onSearch }: TopBarProps) {
  const meta = PAGE_TITLES[page] ?? PAGE_TITLES.dashboard;
  const [searchOpen, setSearchOpen] = useState(false);
  const [modelTier, setModelTier] = useState(
    () => localStorage.getItem('model_tier') ?? 'balanced'
  );

  const selectTier = (id: string) => {
    localStorage.setItem('model_tier', id);
    setModelTier(id);
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="topbar-title">{meta.title}</h1>
        <p className="topbar-sub">{meta.sub}</p>
      </div>

      <div className="topbar-right">
        {/* Model tier selector — only on copilot page */}
        {page === 'copilot' && (
          <div className="model-tier-selector">
            {TIERS.map(t => (
              <button
                key={t.id}
                className={`tier-chip${modelTier === t.id ? ' active' : ''}`}
                onClick={() => selectTier(t.id)}
                title={t.title}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Animated search */}
        <div className={`topbar-search-wrap ${searchOpen ? 'open' : ''}`}>
          <input
            className="topbar-search-input"
            placeholder="Search jobs, skills, companies…"
            value={searchQuery}
            onChange={e => onSearch(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
          />
          {searchOpen && searchQuery ? (
            <button className="topbar-search-icon-btn" onClick={() => { onSearch(''); setSearchOpen(false); }}>
              <X size={14} />
            </button>
          ) : (
            <button className="topbar-search-icon-btn" onClick={() => setSearchOpen(true)}>
              <Search size={14} />
            </button>
          )}
        </div>

        <button className="topbar-icon-btn" title="Notifications">
          <Bell size={17} />
          <span className="topbar-notif-dot" />
        </button>

        <div className="topbar-avatar" title="Profile">
          <span>G</span>
        </div>
      </div>
    </header>
  );
}
