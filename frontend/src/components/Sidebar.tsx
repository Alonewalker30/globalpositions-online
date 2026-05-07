import { LayoutDashboard, Briefcase, FileText, TrendingUp, Bot, ChevronLeft, Globe } from 'lucide-react';

export type NavPage = 'dashboard' | 'jobs' | 'resume' | 'career' | 'copilot';

interface SidebarProps {
  active: NavPage;
  onChange: (p: NavPage) => void;
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
}

const NAV: { id: NavPage; icon: React.ReactNode; label: string; badge?: string }[] = [
  { id: 'dashboard', icon: <LayoutDashboard size={19} />, label: 'Dashboard' },
  { id: 'jobs',      icon: <Briefcase size={19} />,       label: 'Jobs',        badge: 'Live' },
  { id: 'resume',    icon: <FileText size={19} />,        label: 'Resume'       },
  { id: 'career',    icon: <TrendingUp size={19} />,      label: 'Career Intel' },
  { id: 'copilot',   icon: <Bot size={19} />,             label: 'AI Copilot',  badge: 'AI' },
];

export default function Sidebar({ active, onChange, collapsed, onToggle, mobileOpen }: SidebarProps) {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon"><Globe size={20} /></div>
        {!collapsed && (
          <div className="sidebar-logo-text-wrap">
            <span className="sidebar-logo-text">GlobalPositions</span>
            <span className="sidebar-logo-dot">.online</span>
          </div>
        )}
      </div>

      <div className="sidebar-divider" />

      {/* Nav */}
      <nav className="sidebar-nav">
        {!collapsed && <span className="sidebar-section-label">MAIN MENU</span>}
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
                {item.badge && (
                  <span className={`sidebar-badge ${item.id === 'copilot' ? 'ai' : ''}`}>
                    {item.badge}
                  </span>
                )}
              </>
            )}
            {active === item.id && <span className="sidebar-active-bar" />}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottom">
        <div className="sidebar-divider" />
        <button className="sidebar-collapse-btn" onClick={onToggle} title="Toggle sidebar" aria-label="Toggle sidebar">
          <ChevronLeft
            size={15}
            style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform .3s' }}
          />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
