import { useState } from 'react';
import { Search, Bell, X } from 'lucide-react';

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  dashboard: { title: 'Dashboard',        sub: 'Your career overview at a glance' },
  jobs:      { title: 'Job Matches',      sub: 'Live job openings from 67+ top companies' },
  resume:    { title: 'Resume Analyzer',  sub: 'ATS optimization & keyword matching' },
  career:    { title: 'Career Intel',     sub: 'Live market data, trends & learning resources' },
  copilot:   { title: 'AI Copilot',       sub: 'Your 24/7 career assistant' },
};

interface TopBarProps {
  page: string;
  searchQuery: string;
  onSearch: (q: string) => void;
}

export default function TopBar({ page, searchQuery, onSearch }: TopBarProps) {
  const meta = PAGE_TITLES[page] ?? PAGE_TITLES.dashboard;
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="topbar-title">{meta.title}</h1>
        <p className="topbar-sub">{meta.sub}</p>
      </div>

      <div className="topbar-right">
        {/* Animated search — inspired by Frontend-Projects/Search bar animation */}
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
