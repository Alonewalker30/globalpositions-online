import { LayoutDashboard, Briefcase, FileText, TrendingUp, Bot, ChevronLeft, Zap } from 'lucide-react';

export type NavPage = 'dashboard' | 'jobs' | 'resume' | 'career' | 'copilot';

interface SidebarProps {
  active: NavPage;
  onChange: (p: NavPage) => void;
  collapsed: boolean;
  onToggle: () => void;
}

const NAV: { id: NavPage; icon: React.ReactNode; label: string; badge?: string }[] = [
  { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
  { id: 'jobs',      icon: <Briefcase size={20} />,       label: 'Jobs',    badge: 'Live' },
  { id: 'resume',    icon: <FileText size={20} />,        label: 'Resume'   },
  { id: 'career',    icon: <TrendingUp size={20} />,      label: 'Career Intel' },
  { id: 'copilot',   icon: <Bot size={20} />,             label: 'AI Copilot', badge: 'AI' },
];

export default function Sidebar({ active, onChange, collapsed, onToggle }: SidebarProps) {
  return (
    <aside style={{ width: collapsed ? 64 : 240 }} className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon"><Zap size={18} /></div>
        {!collapsed && <span className="sidebar-logo-text">CareerAI</span>}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV.map(item => (
          <button
            key={item.id}
            className={`sidebar-item ${active === item.id ? 'active' : ''}`}
            onClick={() => onChange(item.id)}
            title={collapsed ? item.label : undefined}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            {!collapsed && (
              <>
                <span className="sidebar-item-label">{item.label}</span>
                {item.badge && <span className={`sidebar-badge ${item.id === 'copilot' ? 'ai' : ''}`}>{item.badge}</span>}
              </>
            )}
          </button>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button className="sidebar-collapse-btn" onClick={onToggle} title="Toggle sidebar">
        <ChevronLeft size={16} style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </button>
    </aside>
  );
}
