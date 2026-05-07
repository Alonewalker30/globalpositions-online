import { useState } from 'react';
import Sidebar, { NavPage } from './components/Sidebar';
import TopBar from './components/TopBar';
import DashboardPanel from './components/DashboardPanel';
import JobsPanel from './components/JobsPanel';
import ResumePanel from './components/ResumePanel';
import CareerIntelPanel from './components/CareerIntelPanel';
import AIChatPanel from './components/AIChatPanel';
import ToastContainer from './components/Toast';
import PanelErrorBoundary from './components/PanelErrorBoundary';
import './styles/App.css';

export default function App() {
  const [page,        setPage]        = useState<NavPage>('dashboard');
  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navigate = (p: string) => setPage(p as NavPage);
  const closeMobile = () => setMobileOpen(false);

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Mobile backdrop */}
      <div className={`sidebar-backdrop ${mobileOpen ? 'visible' : ''}`} onClick={closeMobile} />

      <Sidebar
        active={page}
        onChange={(p) => { setPage(p); closeMobile(); }}
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        mobileOpen={mobileOpen}
      />

      <div className="app-main">
        <TopBar
          page={page}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          onMobileMenuToggle={() => setMobileOpen(o => !o)}
        />

        <main className="app-content">
          {page === 'dashboard' && <PanelErrorBoundary name="Dashboard"><DashboardPanel onNavigate={navigate} /></PanelErrorBoundary>}
          {page === 'jobs'      && <PanelErrorBoundary name="Jobs"><JobsPanel searchQuery={searchQuery} onNavigate={navigate} /></PanelErrorBoundary>}
          {page === 'resume'    && <PanelErrorBoundary name="Resume"><ResumePanel /></PanelErrorBoundary>}
          {page === 'career'    && <PanelErrorBoundary name="Career"><CareerIntelPanel /></PanelErrorBoundary>}
          {page === 'copilot'   && <PanelErrorBoundary name="AI Copilot"><AIChatPanel /></PanelErrorBoundary>}
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
