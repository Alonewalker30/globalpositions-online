import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Search, ExternalLink, Loader, Briefcase, Bookmark, BookmarkCheck, Building2, MapPin, X, SlidersHorizontal } from 'lucide-react';
import { getCareerPageJobs } from '../services/api';
import { toast } from './Toast';

interface Job {
  title: string; company: string; location: string; salary: string;
  tags: string[]; url: string; posted_at: string; source?: string;
  ats?: string; match_score?: number; company_logo?: string;
}

interface JobsPanelProps { searchQuery: string; }

const BOOKMARKS_KEY = 'saved_jobs';
export const getSavedJobs = (): Job[] => { try { return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]'); } catch { return []; } };
const persistSavedJobs = (jobs: Job[]) => localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(jobs));

const LOGO_COLORS = ['#2563EB','#7C3AED','#059669','#DC2626','#D97706','#0891B2','#BE185D','#0F766E'];
const logoColor = (n: string) => LOGO_COLORS[n.charCodeAt(0) % LOGO_COLORS.length];

// Map known company names → their domain for Clearbit logos
const COMPANY_DOMAINS: Record<string, string> = {
  'Anthropic':'anthropic.com','Stripe':'stripe.com','Databricks':'databricks.com',
  'Cloudflare':'cloudflare.com','Datadog':'datadoghq.com','Okta':'okta.com',
  'MongoDB':'mongodb.com','Elastic':'elastic.co','Coinbase':'coinbase.com',
  'Brex':'brex.com','Figma':'figma.com','GitLab':'gitlab.com','Discord':'discord.com',
  'Lyft':'lyft.com','Pinterest':'pinterest.com','Twilio':'twilio.com',
  'Robinhood':'robinhood.com','Dropbox':'dropbox.com','Instacart':'instacart.com',
  'Gusto':'gusto.com','Mercury':'mercury.com','Vercel':'vercel.com',
  'Amplitude':'amplitude.com','Mixpanel':'mixpanel.com','PagerDuty':'pagerduty.com',
  'Fastly':'fastly.com','Carta':'carta.com','Checkr':'checkr.com',
  'Lattice':'lattice.com','Neo4j':'neo4j.com','Twitch':'twitch.tv',
};

function CompanyLogo({ company, directLogoUrl }: { company: string; directLogoUrl?: string }) {
  const [imgError, setImgError] = useState(false);
  const domain = COMPANY_DOMAINS[company] || `${company.toLowerCase().replace(/[^a-z0-9]/g,'')}.com`;
  const src = directLogoUrl && !imgError ? directLogoUrl : (imgError ? null : `https://logo.clearbit.com/${domain}`);
  if (!src) {
    return <div className="jb-logo" style={{ background: logoColor(company) }}>{company?.[0]?.toUpperCase()}</div>;
  }
  return (
    <div className="jb-logo-wrap">
      <img src={src} alt={company} className="jb-logo-img" onError={() => setImgError(true)} />
    </div>
  );
}

function JobSkeleton() {
  return (
    <div className="jb-card">
      <div className="jb-card-top">
        <div className="sk-box sk-logo-size" />
        <div className="jb-info" style={{ gap: 8 }}>
          <div className="sk-box" style={{ width: '60%', height: 16 }} />
          <div className="sk-box" style={{ width: '35%', height: 12 }} />
          <div className="sk-box" style={{ width: '80%', height: 12 }} />
        </div>
      </div>
    </div>
  );
}

function inferWorkType(job: Job): 'Remote' | 'Hybrid' | 'On-site' {
  const s = `${job.title} ${job.location} ${job.tags?.join(' ')}`.toLowerCase();
  if (s.includes('remote')) return 'Remote';
  if (s.includes('hybrid')) return 'Hybrid';
  return 'On-site';
}

function inferExpLevel(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('intern')) return 'Internship';
  if (/\bjunior\b|\bassociate\b|\bentry\b|\bjr\.?\b/.test(t)) return 'Entry';
  if (/\bsenior\b|\bsr\.?\b/.test(t)) return 'Senior';
  if (/\bstaff\b/.test(t)) return 'Staff';
  if (/\bprincipal\b|\blead\b/.test(t)) return 'Principal';
  if (/\bdirector\b|\bmanager\b|\bvp\b|\bhead of\b/.test(t)) return 'Manager+';
  return 'Mid';
}

function daysAgo(dateStr: string): number | null {
  if (!dateStr) return null;
  try { return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000); } catch { return null; }
}

function formatAgo(days: number | null): string {
  if (days === null) return '';
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/* ─── Job Card ─── */
function JobCard({ job }: { job: Job }) {
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(() => getSavedJobs().some(j => j.url === job.url));
  const workType = inferWorkType(job);
  const exp = inferExpLevel(job.title);
  const days = daysAgo(job.posted_at);
  const workColor: Record<string, string> = { Remote: 'green', Hybrid: 'blue', 'On-site': 'slate' };

  const toggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cur = getSavedJobs();
    if (saved) { persistSavedJobs(cur.filter(j => j.url !== job.url)); setSaved(false); toast('Removed from saved', 'info'); }
    else { persistSavedJobs([...cur, job]); setSaved(true); toast(`Saved — ${job.title}`, 'success'); }
  };

  return (
    <div className={`jb-card ${expanded ? 'expanded' : ''}`} onClick={() => setExpanded(e => !e)}>
      <div className="jb-card-top">
        <CompanyLogo company={job.company} directLogoUrl={job.company_logo} />
        <div className="jb-info">
          <div className="jb-title">{job.title}</div>
          <div className="jb-company"><Building2 size={12} />{job.company}</div>
          <div className="jb-meta-row">
            {job.location && <span className="jb-meta-item"><MapPin size={11} />{job.location}</span>}
            <span className={`jb-work-badge wt-${workColor[workType]}`}>{workType}</span>
            <span className="jb-exp-badge">{exp}</span>
            {job.salary && <span className="job-salary-badge">{job.salary}</span>}
            {days !== null && <span className="jb-date">{formatAgo(days)}</span>}
          </div>
          {job.tags?.filter(Boolean).length > 0 && (
            <div className="jb-tags">{job.tags.filter(Boolean).slice(0, 3).map((t, i) => <span key={i} className="tag">{t}</span>)}</div>
          )}
        </div>
        <button className={`bookmark-btn ${saved ? 'saved' : ''}`} onClick={toggleSave}>{saved ? <BookmarkCheck size={15}/> : <Bookmark size={15}/>}</button>
      </div>

      {expanded && (
        <div className="jb-expand" onClick={e => e.stopPropagation()}>
          <p className="jb-expand-note">Full career-page application at {job.company} — no easy apply.</p>
          <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm">
            Apply at {job.company} <ExternalLink size={12}/>
          </a>
        </div>
      )}
    </div>
  );
}

/* ─── Filter Sidebar ─── */
interface Filters {
  workType: Set<string>;
  expLevel: Set<string>;
  jobType: Set<string>;
  datePosted: string;
  company: string;
}

const WORK_TYPES  = ['Remote', 'Hybrid', 'On-site'];
const EXP_LEVELS  = ['Internship', 'Entry', 'Mid', 'Senior', 'Staff', 'Principal', 'Manager+'];
const JOB_TYPES   = ['Full-time', 'Part-time', 'Contract', 'Internship'];
const DATE_OPTIONS = [
  { label: 'Any time', value: 'any' },
  { label: 'Past 24 hours', value: '1' },
  { label: 'Past week', value: '7' },
  { label: 'Past month', value: '30' },
];

function toggleSet(s: Set<string>, val: string): Set<string> {
  const n = new Set(s);
  n.has(val) ? n.delete(val) : n.add(val);
  return n;
}

function FilterSidebar({ filters, onChange, companies, activeCount }: {
  filters: Filters; onChange: (f: Filters) => void; companies: string[]; activeCount: number;
}) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  return (
    <aside className="jb-sidebar">
      <div className="jb-sidebar-header">
        <span><SlidersHorizontal size={14}/> Filters</span>
        {activeCount > 0 && <button className="jb-clear-btn" onClick={() => onChange({ workType: new Set(), expLevel: new Set(), jobType: new Set(), datePosted: 'any', company: '' })}>Clear all ({activeCount})</button>}
      </div>

      <div className="jb-filter-section">
        <div className="jb-filter-title">Work Type</div>
        {WORK_TYPES.map(t => (
          <label key={t} className="jb-filter-option">
            <input type="checkbox" checked={filters.workType.has(t)} onChange={() => set({ workType: toggleSet(filters.workType, t) })} />
            <span>{t}</span>
          </label>
        ))}
      </div>

      <div className="jb-filter-section">
        <div className="jb-filter-title">Experience Level</div>
        {EXP_LEVELS.map(l => (
          <label key={l} className="jb-filter-option">
            <input type="checkbox" checked={filters.expLevel.has(l)} onChange={() => set({ expLevel: toggleSet(filters.expLevel, l) })} />
            <span>{l}</span>
          </label>
        ))}
      </div>

      <div className="jb-filter-section">
        <div className="jb-filter-title">Job Type</div>
        {JOB_TYPES.map(t => (
          <label key={t} className="jb-filter-option">
            <input type="checkbox" checked={filters.jobType.has(t)} onChange={() => set({ jobType: toggleSet(filters.jobType, t) })} />
            <span>{t}</span>
          </label>
        ))}
      </div>

      <div className="jb-filter-section">
        <div className="jb-filter-title">Date Posted</div>
        {DATE_OPTIONS.map(o => (
          <label key={o.value} className="jb-filter-option">
            <input type="radio" name="date" checked={filters.datePosted === o.value} onChange={() => set({ datePosted: o.value })} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>

      <div className="jb-filter-section">
        <div className="jb-filter-title">Company</div>
        <input className="jb-company-search" placeholder="Search company…" value={filters.company} onChange={e => set({ company: e.target.value })} />
        {companies.slice(0, 10).map(c => (
          <label key={c} className="jb-filter-option">
            <input type="checkbox" checked={filters.company === c} onChange={() => set({ company: filters.company === c ? '' : c })} />
            <span>{c}</span>
          </label>
        ))}
      </div>
    </aside>
  );
}

/* ─── Active Filter Pills ─── */
function ActiveFilters({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  const pills: { label: string; remove: () => void }[] = [];
  filters.workType.forEach(v => pills.push({ label: v, remove: () => onChange({ ...filters, workType: toggleSet(filters.workType, v) }) }));
  filters.expLevel.forEach(v => pills.push({ label: v, remove: () => onChange({ ...filters, expLevel: toggleSet(filters.expLevel, v) }) }));
  filters.jobType.forEach(v => pills.push({ label: v, remove: () => onChange({ ...filters, jobType: toggleSet(filters.jobType, v) }) }));
  if (filters.datePosted !== 'any') {
    const label = DATE_OPTIONS.find(o => o.value === filters.datePosted)?.label || '';
    pills.push({ label, remove: () => onChange({ ...filters, datePosted: 'any' }) });
  }
  if (filters.company) pills.push({ label: filters.company, remove: () => onChange({ ...filters, company: '' }) });
  if (!pills.length) return null;
  return (
    <div className="jb-active-filters">
      {pills.map((p, i) => (
        <span key={i} className="jb-active-pill">{p.label}<button onClick={p.remove}><X size={11}/></button></span>
      ))}
    </div>
  );
}

const PAGE_SIZE = 20;

/* ─── Main Panel ─── */
export default function JobsPanel({ searchQuery }: JobsPanelProps) {
  const [query, setQuery]     = useState(searchQuery || 'software engineer');
  const [jobs, setJobs]       = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [tab, setTab]         = useState<'live' | 'saved'>('live');
  const [savedJobs, setSavedJobs] = useState<Job[]>(getSavedJobs);
  const [total, setTotal]     = useState(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filters, setFilters] = useState<Filters>({
    workType: new Set(), expLevel: new Set(), jobType: new Set(), datePosted: '30', company: ''
  });
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetch_ = useCallback(async (q: string) => {
    setLoading(true); setError(''); setVisibleCount(PAGE_SIZE);
    try { const d = await getCareerPageJobs(q, 200); setJobs(d.jobs || []); setTotal(d.total || 0); }
    catch { setError('Failed to fetch jobs.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(query); }, []);
  useEffect(() => { if (searchQuery && searchQuery !== query) { setQuery(searchQuery); fetch_(searchQuery); } }, [searchQuery]);
  useEffect(() => { if (tab === 'saved') setSavedJobs(getSavedJobs()); }, [tab]);

  const uniqueCompanies = useMemo(() => [...new Set(jobs.map(j => j.company))].sort(), [jobs]);

  const activeFilterCount = filters.workType.size + filters.expLevel.size + filters.jobType.size
    + (filters.datePosted !== 'any' ? 1 : 0) + (filters.company ? 1 : 0);

  const filtered = useMemo(() => jobs.filter(j => {
    if (filters.workType.size && !filters.workType.has(inferWorkType(j))) return false;
    if (filters.expLevel.size && !filters.expLevel.has(inferExpLevel(j.title))) return false;
    if (filters.jobType.has('Internship') && !j.title.toLowerCase().includes('intern')) return false;
    if (filters.jobType.has('Contract') && !`${j.title} ${j.tags?.join(' ')}`.toLowerCase().includes('contract')) return false;
    if (filters.datePosted !== 'any') {
      const d = daysAgo(j.posted_at);
      if (d === null || d > parseInt(filters.datePosted)) return false;
    }
    if (filters.company && !j.company.toLowerCase().includes(filters.company.toLowerCase())) return false;
    return true;
  }), [jobs, filters]);

  // Reset visible count when filters change
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [filters]);

  // Infinite scroll — load more when sentinel enters viewport
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleCount(c => c + PAGE_SIZE); },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [filtered]);

  const displayJobs = tab === 'saved' ? savedJobs : filtered.slice(0, visibleCount);
  const hasMore = tab === 'live' && visibleCount < filtered.length;

  return (
    <div className="jb-shell">
      {/* Top bar */}
      <div className="jb-topbar">
        <div className="jb-tabs">
          <button className={`jobs-tab ${tab === 'live' ? 'active' : ''}`} onClick={() => setTab('live')}>
            <Briefcase size={14}/> Live Jobs
            {total > 0 && <span className="jobs-tab-count">{total}</span>}
          </button>
          <button className={`jobs-tab ${tab === 'saved' ? 'active' : ''}`} onClick={() => setTab('saved')}>
            <BookmarkCheck size={14}/> Saved
            {getSavedJobs().length > 0 && <span className="jobs-tab-count">{getSavedJobs().length}</span>}
          </button>
        </div>

        {tab === 'live' && (
          <div className="jb-search-bar">
            <Search size={15} className="jb-search-icon"/>
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetch_(query)} placeholder="Job title, skill, or keyword…"/>
            <button className="btn-primary btn-sm" onClick={() => fetch_(query)} disabled={loading}>
              {loading ? <Loader size={14} className="spin"/> : 'Search'}
            </button>
          </div>
        )}
      </div>

      <div className="jb-body">
        {tab === 'live' && (
          <FilterSidebar filters={filters} onChange={f => { setFilters(f); setVisibleCount(PAGE_SIZE); }} companies={uniqueCompanies} activeCount={activeFilterCount} />
        )}

        <div className="jb-main">
          {tab === 'live' && (
            <>
              <div className="jb-results-header">
                <span className="jb-results-count">{filtered.length} jobs found · last 30 days</span>
                <span className="jb-results-note">All links → company career pages · Manual apply only</span>
              </div>
              <ActiveFilters filters={filters} onChange={setFilters} />
            </>
          )}

          {error && <div className="error-banner">{error}</div>}
          {loading && <div className="jb-list">{Array.from({length:6}).map((_,i) => <JobSkeleton key={i}/>)}</div>}

          {!loading && tab === 'live' && filtered.length === 0 && !error && (
            <div className="empty-state"><Briefcase size={40}/><p>No jobs match your filters.</p></div>
          )}
          {tab === 'saved' && savedJobs.length === 0 && (
            <div className="empty-state"><Bookmark size={40}/><p>No saved jobs yet.</p></div>
          )}

          <div className="jb-list">
            {displayJobs.map((job, i) => <JobCard key={i} job={job}/>)}
          </div>

          {/* Infinite scroll sentinel */}
          {hasMore && <div ref={sentinelRef} className="jb-load-more-sentinel">
            <Loader size={18} className="spin" style={{ color: 'var(--text-muted)' }}/>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Showing {visibleCount} of {filtered.length}
            </span>
          </div>}
        </div>
      </div>
    </div>
  );
}
