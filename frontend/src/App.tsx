import { useState } from 'react';
import Sidebar, { NavPage } from './components/Sidebar';
import TopBar from './components/TopBar';
import DashboardPanel from './components/DashboardPanel';
import JobsPanel from './components/JobsPanel';
import ResumePanel from './components/ResumePanel';
import CareerIntelPanel from './components/CareerIntelPanel';
import AIChatPanel from './components/AIChatPanel';
import ToastContainer from './components/Toast';
import './styles/App.css';

export default function App() {
  const [page,        setPage]        = useState<NavPage>('dashboard');
  const [collapsed,   setCollapsed]   = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navigate = (p: string) => setPage(p as NavPage);

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar active={page} onChange={setPage} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />

      <div className="app-main">
        <TopBar page={page} searchQuery={searchQuery} onSearch={setSearchQuery} />

        <main className="app-content">
          {page === 'dashboard' && <DashboardPanel onNavigate={navigate} />}
          {page === 'jobs'      && <JobsPanel      searchQuery={searchQuery} />}
          {page === 'resume'    && <ResumePanel    />}
          {page === 'career'    && <CareerIntelPanel />}
          {page === 'copilot'   && <AIChatPanel    />}
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
