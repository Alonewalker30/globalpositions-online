import { Search, Bell } from 'lucide-react';

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  dashboard: { title: 'Dashboard',      sub: 'Your career overview at a glance' },
  jobs:      { title: 'Job Matches',    sub: 'AI-ranked live job openings for your profile' },
  resume:    { title: 'Resume Analyzer',sub: 'ATS optimization & keyword matching' },
  career:    { title: 'Career Intel',   sub: 'Live market data, trends & learning resources' },
  copilot:   { title: 'AI Copilot',     sub: 'Your 24/7 career assistant powered by Claude' },
};

interface TopBarProps {
  page: string;
  searchQuery: string;
  onSearch: (q: string) => void;
}

export default function TopBar({ page, searchQuery, onSearch }: TopBarProps) {
  const meta = PAGE_TITLES[page] ?? PAGE_TITLES.dashboard;
  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="topbar-title">{meta.title}</h1>
        <p className="topbar-sub">{meta.sub}</p>
      </div>
      <div className="topbar-right">
        <div className="topbar-search">
          <Search size={15} className="topbar-search-icon" />
          <input
            placeholder="Search jobs, skills, companies…"
            value={searchQuery}
            onChange={e => onSearch(e.target.value)}
          />
        </div>
        <button className="topbar-icon-btn" title="Notifications">
          <Bell size={18} />
        </button>
        <div className="topbar-avatar">S</div>
      </div>
    </header>
  );
}
