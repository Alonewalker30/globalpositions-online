import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search, ExternalLink, Loader, Briefcase, Bookmark, BookmarkCheck,
  Building2, MapPin, X, SlidersHorizontal, ChevronDown, DollarSign,
  Clock, Globe, ArrowUpDown, Zap, Brain, RefreshCw,
} from 'lucide-react';
import { getCareerPageJobs, scrapeJobsBrowser, getApplyFields, researchCompanyBrowser, type BrowserJobSource } from '../services/api';
import { toast } from './Toast';

interface Job {
  title: string; company: string; location: string; salary: string;
  tags: string[]; url: string; posted_at: string; source?: string;
  ats?: string; match_score?: number; company_logo?: string;
}

interface JobsPanelProps { searchQuery: string; onNavigate?: (page: string) => void; }

const BOOKMARKS_KEY = 'saved_jobs';
export const getSavedJobs = (): Job[] => { try { return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]'); } catch { return []; } };
const persistSavedJobs = (jobs: Job[]) => localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(jobs));

const LOGO_COLORS = ['#16a34a','#15803d','#059669','#DC2626','#D97706','#0F766E','#047857','#166534'];
const logoColor = (n: string) => LOGO_COLORS[(n.charCodeAt(0) || 0) % LOGO_COLORS.length];

function CompanyLogo({ company, directLogoUrl, size = 40 }: { company: string; directLogoUrl?: string; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const domain = `${company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
  const src = directLogoUrl && !imgError ? directLogoUrl : (imgError ? null : `https://logo.clearbit.com/${domain}`);
  const style = { width: size, height: size, borderRadius: 8, flexShrink: 0 };
  if (!src) {
    return (
      <div className="jb-logo-fallback" style={{ ...style, background: logoColor(company), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.4 }}>
        {company?.[0]?.toUpperCase()}
      </div>
    );
  }
  return <img src={src} alt={company} style={style} onError={() => setImgError(true)} />;
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
  try {
    const ms = /^\d{10,}$/.test(dateStr.trim())
      ? parseInt(dateStr) * (dateStr.trim().length === 10 ? 1000 : 1)
      : new Date(dateStr).getTime();
    if (isNaN(ms)) return null;
    return Math.floor((Date.now() - ms) / 86400000);
  } catch { return null; }
}

function formatAgo(days: number | null): string {
  if (days === null) return '';
  if (days === 0) return 'Today';
  if (days === 1) return '1d ago';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const SOURCE_COLORS: Record<string, string> = {
  Greenhouse: '#16a34a',
  Lever:      '#15803d',
  Remotive:   '#059669',
  Himalayas:  '#f59e0b',
  Ashby:      '#047857',
  Jobicy:     '#10b981',
  Adzuna:     '#f97316',
  RemoteOK:   '#166534',
};

/* ─── Compact Job Card (list view) ─── */
function JobCard({ job, selected, onClick }: { job: Job; selected: boolean; onClick: () => void }) {
  const [saved, setSaved] = useState(() => getSavedJobs().some(j => j.url === job.url));
  const workType = inferWorkType(job);
  const exp = inferExpLevel(job.title);
  const days = daysAgo(job.posted_at);
  const sourceColor = SOURCE_COLORS[job.source || ''] || '#6b7280';

  const toggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cur = getSavedJobs();
    if (saved) { persistSavedJobs(cur.filter(j => j.url !== job.url)); setSaved(false); toast('Removed from saved', 'info'); }
    else { persistSavedJobs([...cur, job]); setSaved(true); toast(`Saved — ${job.title}`, 'success'); }
  };

  return (
    <div className={`jb-card ${selected ? 'jb-card--selected' : ''}`} onClick={onClick}>
      <div className="jb-card-inner">
        <CompanyLogo company={job.company} directLogoUrl={job.company_logo} size={38} />
        <div className="jb-card-body">
          <div className="jb-card-title">{job.title}</div>
          <div className="jb-card-company">
            <Building2 size={11} style={{ flexShrink: 0 }} />
            {job.company}
          </div>
          <div className="jb-card-meta">
            {job.location && <span className="jb-meta-chip"><MapPin size={10} />{job.location}</span>}
            <span className={`jb-work-chip wt-${workType.toLowerCase().replace('-','')}`} title="Estimated from job title and location">{workType} *</span>
            <span className="jb-exp-chip" title="Estimated from job title">{exp} *</span>
            {job.salary && <span className="jb-salary-chip"><DollarSign size={10}/>{job.salary}</span>}
          </div>
          <div className="jb-card-footer">
            <span className="jb-source-dot" style={{ background: sourceColor }} />
            <span className="jb-source-label">{job.source}</span>
            {days !== null && <span className="jb-date-label"><Clock size={10}/>{formatAgo(days)}</span>}
          </div>
        </div>
        <button className={`bookmark-btn ${saved ? 'saved' : ''}`} onClick={toggleSave} aria-label={saved ? 'Remove from saved jobs' : 'Save job'}>
          {saved ? <BookmarkCheck size={14}/> : <Bookmark size={14}/>}
        </button>
      </div>
    </div>
  );
}

/* ─── Job Detail Panel ─── */
function JobDetailPanel({ job, onClose, onNavigate }: { job: Job; onClose: () => void; onNavigate?: (page: string) => void }) {
  const [saved, setSaved] = useState(() => getSavedJobs().some(j => j.url === job.url));
  const [applyFields, setApplyFields]   = useState<any[] | null>(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const [companyInfo, setCompanyInfo]   = useState<any | null>(null);
  const [companyLoading, setCompanyLoading] = useState(false);
  const workType = inferWorkType(job);
  const exp = inferExpLevel(job.title);
  const days = daysAgo(job.posted_at);
  const sourceColor = SOURCE_COLORS[job.source || ''] || '#6b7280';

  const toggleSave = () => {
    const cur = getSavedJobs();
    if (saved) { persistSavedJobs(cur.filter(j => j.url !== job.url)); setSaved(false); toast('Removed', 'info'); }
    else { persistSavedJobs([...cur, job]); setSaved(true); toast('Saved!', 'success'); }
  };

  const handleSmartApply = async () => {
    setApplyLoading(true); setApplyFields(null);
    try {
      const resumeData = JSON.parse(localStorage.getItem('resume_data') || '{}');
      const res = await getApplyFields(job.url, resumeData);
      setApplyFields(res.fields || []);
      if (res.error) toast('Partial result — some fields may be missing', 'info');
      else toast(`Found ${res.field_count} form fields`, 'success');
    } catch { toast('Smart Apply failed — check TINYFISH_API_KEY', 'error'); }
    finally { setApplyLoading(false); }
  };

  const handleCompanyResearch = async () => {
    setCompanyLoading(true); setCompanyInfo(null);
    try {
      const res = await researchCompanyBrowser(job.company);
      setCompanyInfo(res);
    } catch { toast('Company research failed', 'error'); }
    finally { setCompanyLoading(false); }
  };

  return (
    <div className="jb-detail">
      <div className="jb-detail-header">
        <button className="jb-detail-close" onClick={onClose}><X size={16}/></button>
        <div className="jb-detail-logo">
          <CompanyLogo company={job.company} directLogoUrl={job.company_logo} size={52} />
        </div>
        <div className="jb-detail-title">{job.title}</div>
        <div className="jb-detail-company">
          <Building2 size={13}/> {job.company}
        </div>
        <div className="jb-detail-meta">
          {job.location && <span className="jb-meta-chip"><MapPin size={11}/>{job.location}</span>}
          <span className={`jb-work-chip wt-${workType.toLowerCase().replace('-','')}`} title="Estimated from job title and location">{workType} *</span>
          <span className="jb-exp-chip" title="Estimated from job title">{exp} *</span>
          {job.salary && <span className="jb-salary-chip"><DollarSign size={11}/>{job.salary}</span>}
        </div>
        <div className="jb-detail-source">
          <span className="jb-source-dot" style={{ background: sourceColor }}/>
          <span>{job.source}</span>
          {days !== null && <span style={{ color: 'var(--text-3)' }}> · {formatAgo(days)}</span>}
        </div>

        {job.tags?.filter(Boolean).length > 0 && (
          <div className="jb-detail-tags">
            {job.tags.filter(Boolean).map((t, i) => <span key={i} className="tag">{t}</span>)}
          </div>
        )}

        <div className="jb-detail-actions">
          <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn-primary jb-apply-btn">
            Apply Now <ExternalLink size={13}/>
          </a>
          <button className={`jb-save-btn ${saved ? 'saved' : ''}`} onClick={toggleSave}>
            {saved ? <><BookmarkCheck size={14}/> Saved</> : <><Bookmark size={14}/> Save</>}
          </button>
          {onNavigate && (
            <button className="btn-ghost jb-optimize-btn" onClick={() => {
              const desc = [job.title, job.company && `at ${job.company}`, job.tags?.filter(Boolean).join(', ')].filter(Boolean).join('\n');
              localStorage.setItem('pending_job_description', desc);
              onNavigate('resume');
            }}>
              <Briefcase size={13}/> Optimize resume →
            </button>
          )}
        </div>
      </div>

      <div className="jb-detail-body">
        <div className="jb-detail-section">
          <div className="jb-detail-section-title">About this role</div>
          <p className="jb-detail-desc">
            This is a <strong>{job.title}</strong> position at <strong>{job.company}</strong>.
            {job.location && <> Located in <strong>{job.location}</strong>.</>}
            {' '}Work type: <strong>{workType}</strong>. Experience level: <strong>{exp}</strong>.
            {job.salary && <> Compensation: <strong>{job.salary}</strong>.</>}
          </p>
          <p className="jb-detail-note">
            Click "Apply Now" to view the full job description and apply directly on the company's career page.
          </p>
        </div>

        {job.tags?.filter(Boolean).length > 0 && (
          <div className="jb-detail-section">
            <div className="jb-detail-section-title">Skills & Keywords</div>
            <div className="jb-detail-tags">
              {job.tags.filter(Boolean).map((t, i) => <span key={i} className="tag">{t}</span>)}
            </div>
          </div>
        )}

        <div className="jb-detail-section">
          <div className="jb-detail-section-title">How to Apply</div>
          <p className="jb-detail-note">This listing links directly to <strong>{job.company}'s</strong> career page via {job.source}. You'll apply through their official portal — no middleman.</p>
          <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn-primary jb-apply-btn" style={{ display: 'inline-flex', marginTop: 8 }}>
            View Full Job & Apply <ExternalLink size={13}/>
          </a>
        </div>

        {/* Smart Apply */}
        <div className="jb-detail-section">
          <div className="jb-detail-section-title"><Zap size={13} style={{ display:'inline', marginRight:5 }}/>Smart Apply</div>
          <p className="jb-detail-note">Opens the apply page in a real browser and detects form fields — pre-filled with your resume data.</p>
          <button className="btn-ghost btn-sm" onClick={handleSmartApply} disabled={applyLoading} style={{ marginTop: 8 }}>
            {applyLoading ? <><Loader size={12} className="spin"/> Launching browser…</> : <><Zap size={12}/> Detect Apply Fields</>}
          </button>
          {applyFields !== null && (
            <div className="apply-fields-list">
              {applyFields.length === 0
                ? <p className="jb-detail-note">No fillable fields detected on this page.</p>
                : applyFields.map((f, i) => (
                  <div key={i} className="apply-field-row">
                    <span className="apply-field-label">{f.label || f.name}</span>
                    <span className="apply-field-value">{f.suggested_value || <em style={{ color: 'var(--text-3)' }}>—</em>}</span>
                  </div>
                ))
              }
            </div>
          )}
        </div>

        {/* Company Research */}
        <div className="jb-detail-section">
          <div className="jb-detail-section-title"><Brain size={13} style={{ display:'inline', marginRight:5 }}/>Company Intel</div>
          <p className="jb-detail-note">Browse {job.company}'s career page and get an AI-structured summary of culture, benefits, and tech stack.</p>
          <button className="btn-ghost btn-sm" onClick={handleCompanyResearch} disabled={companyLoading} style={{ marginTop: 8 }}>
            {companyLoading ? <><Loader size={12} className="spin"/> Researching…</> : <><Brain size={12}/> Research {job.company}</>}
          </button>
          {companyInfo && !companyInfo.error && (
            <div className="company-intel-card">
              {companyInfo.summary && <p className="company-intel-summary">{companyInfo.summary}</p>}
              {companyInfo.remote_policy && companyInfo.remote_policy !== 'unknown' && (
                <div className="company-intel-badge">{companyInfo.remote_policy}</div>
              )}
              {companyInfo.tech_stack?.length > 0 && (
                <div className="company-intel-section">
                  <strong>Tech Stack</strong>
                  <div className="company-intel-tags">{companyInfo.tech_stack.map((t: string, i: number) => <span key={i} className="tag">{t}</span>)}</div>
                </div>
              )}
              {companyInfo.benefits?.length > 0 && (
                <div className="company-intel-section">
                  <strong>Benefits</strong>
                  <ul className="company-intel-list">{companyInfo.benefits.map((b: string, i: number) => <li key={i}>{b}</li>)}</ul>
                </div>
              )}
              {companyInfo.culture?.length > 0 && (
                <div className="company-intel-section">
                  <strong>Culture</strong>
                  <ul className="company-intel-list">{companyInfo.culture.map((c: string, i: number) => <li key={i}>{c}</li>)}</ul>
                </div>
              )}
              {companyInfo.source_url && (
                <a href={companyInfo.source_url} target="_blank" rel="noopener noreferrer" className="company-intel-source">
                  Source: {companyInfo.source_url} <ExternalLink size={10}/>
                </a>
              )}
            </div>
          )}
          {companyInfo?.error && <p className="jb-detail-note" style={{ color: 'var(--red)' }}>Failed: {companyInfo.error}</p>}
        </div>
      </div>
    </div>
  );
}

/* ─── Filter Sidebar ─── */
interface Filters {
  workType: Set<string>;
  expLevel: Set<string>;
  jobType: Set<string>;
  datePosted: string;
  location: string;
  source: Set<string>;
}

const WORK_TYPES   = ['Remote', 'Hybrid', 'On-site'];
const EXP_LEVELS   = ['Internship', 'Entry', 'Mid', 'Senior', 'Staff', 'Principal', 'Manager+'];
const JOB_TYPES    = ['Full-time', 'Contract', 'C2C', '1099', 'Part-time', 'Internship'];
const DATE_OPTIONS = [
  { label: 'Any time', value: 'any' },
  { label: 'Past 24 hours', value: '1' },
  { label: 'Past week', value: '7' },
  { label: 'Past month', value: '30' },
];
const SOURCES = ['Greenhouse', 'Lever', 'Ashby', 'Remotive', 'Himalayas', 'Jobicy', 'Adzuna', 'RemoteOK'];

function toggleSet(s: Set<string>, val: string): Set<string> {
  const n = new Set(s); n.has(val) ? n.delete(val) : n.add(val); return n;
}

function FilterSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="jb-filter-section">
      <button className="jb-filter-section-title" onClick={() => setOpen(o => !o)}>
        {title} <ChevronDown size={13} style={{ transform: open ? 'rotate(180deg)' : '', transition: '.2s' }}/>
      </button>
      {open && <div className="jb-filter-options">{children}</div>}
    </div>
  );
}

function FilterSidebar({ filters, onChange, activeCount }: {
  filters: Filters; onChange: (f: Filters) => void; activeCount: number;
}) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const clear = () => onChange({ workType: new Set(), expLevel: new Set(), jobType: new Set(), datePosted: 'any', location: '', source: new Set() });

  return (
    <aside className="jb-sidebar">
      <div className="jb-sidebar-header">
        <span><SlidersHorizontal size={13}/> Filters</span>
        {activeCount > 0 && <button className="jb-clear-btn" onClick={clear}>Clear ({activeCount})</button>}
      </div>

      <FilterSection title="Work Type">
        {WORK_TYPES.map(t => (
          <label key={t} className="jb-filter-option">
            <input type="checkbox" checked={filters.workType.has(t)} onChange={() => set({ workType: toggleSet(filters.workType, t) })}/>
            <span>{t}</span>
          </label>
        ))}
      </FilterSection>

      <FilterSection title="Experience Level">
        {EXP_LEVELS.map(l => (
          <label key={l} className="jb-filter-option">
            <input type="checkbox" checked={filters.expLevel.has(l)} onChange={() => set({ expLevel: toggleSet(filters.expLevel, l) })}/>
            <span>{l}</span>
          </label>
        ))}
      </FilterSection>

      <FilterSection title="Job Type">
        {JOB_TYPES.map(t => (
          <label key={t} className="jb-filter-option">
            <input type="checkbox" checked={filters.jobType.has(t)} onChange={() => set({ jobType: toggleSet(filters.jobType, t) })}/>
            <span>
              {t}
              {t === 'C2C' && <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 4 }}>Corp-to-Corp</span>}
              {t === '1099' && <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 4 }}>Independent</span>}
            </span>
          </label>
        ))}
      </FilterSection>

      <FilterSection title="Date Posted">
        {DATE_OPTIONS.map(o => (
          <label key={o.value} className="jb-filter-option">
            <input type="radio" name="date" checked={filters.datePosted === o.value} onChange={() => set({ datePosted: o.value })}/>
            <span>{o.label}</span>
          </label>
        ))}
      </FilterSection>

      <FilterSection title="Location">
        <input
          className="jb-location-input"
          placeholder="City, state, or country…"
          value={filters.location}
          onChange={e => set({ location: e.target.value })}
        />
      </FilterSection>

      <FilterSection title="Source" defaultOpen={false}>
        {SOURCES.map(s => (
          <label key={s} className="jb-filter-option">
            <input type="checkbox" checked={filters.source.has(s)} onChange={() => set({ source: toggleSet(filters.source, s) })}/>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="jb-source-dot" style={{ background: SOURCE_COLORS[s] }}/>
              {s}
            </span>
          </label>
        ))}
      </FilterSection>
    </aside>
  );
}

/* ─── Active Filter Pills ─── */
function ActiveFilters({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  const pills: { label: string; remove: () => void }[] = [];
  filters.workType.forEach(v => pills.push({ label: v, remove: () => onChange({ ...filters, workType: toggleSet(filters.workType, v) }) }));
  filters.expLevel.forEach(v => pills.push({ label: v, remove: () => onChange({ ...filters, expLevel: toggleSet(filters.expLevel, v) }) }));
  filters.jobType.forEach(v => pills.push({ label: v, remove: () => onChange({ ...filters, jobType: toggleSet(filters.jobType, v) }) }));
  filters.source.forEach(v => pills.push({ label: v, remove: () => onChange({ ...filters, source: toggleSet(filters.source, v) }) }));
  if (filters.datePosted !== 'any') {
    const label = DATE_OPTIONS.find(o => o.value === filters.datePosted)?.label || '';
    pills.push({ label, remove: () => onChange({ ...filters, datePosted: 'any' }) });
  }
  if (filters.location) pills.push({ label: `📍 ${filters.location}`, remove: () => onChange({ ...filters, location: '' }) });
  if (!pills.length) return null;
  return (
    <div className="jb-active-filters">
      {pills.map((p, i) => (
        <span key={i} className="jb-active-pill">{p.label}<button onClick={p.remove}><X size={10}/></button></span>
      ))}
    </div>
  );
}

const PAGE_SIZE = 25;

/* ─── Main Panel ─── */
const BROWSER_SOURCES: { id: BrowserJobSource; label: string }[] = [
  { id: 'linkedin',  label: 'LinkedIn'  },
  { id: 'indeed',    label: 'Indeed'    },
  { id: 'glassdoor', label: 'Glassdoor' },
];

export default function JobsPanel({ searchQuery, onNavigate }: JobsPanelProps) {
  const [query, setQuery]         = useState(searchQuery || 'software engineer');
  const [jobs, setJobs]           = useState<Job[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [tab, setTab]             = useState<'live' | 'saved'>('live');
  const [savedJobs, setSavedJobs] = useState<Job[]>(getSavedJobs);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedJob, setSelectedJob]   = useState<Job | null>(null);
  const [sort, setSort]           = useState<'relevance' | 'date'>('date');
  const [filters, setFilters]     = useState<Filters>({
    workType: new Set(), expLevel: new Set(), jobType: new Set(),
    datePosted: 'any', location: '', source: new Set(),
  });
  const [browserSource, setBrowserSource] = useState<BrowserJobSource | null>(null);
  const [browserLoading, setBrowserLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetch_ = useCallback(async (q: string) => {
    setLoading(true); setError(''); setVisibleCount(PAGE_SIZE); setSelectedJob(null);
    setBrowserSource(null);
    try {
      const d = await getCareerPageJobs(q, 300);
      setJobs(d.jobs || []);
    } catch { setError('Failed to load jobs. Check your connection.'); }
    finally { setLoading(false); }
  }, []);

  const fetchBrowser = useCallback(async (source: BrowserJobSource) => {
    setBrowserLoading(true); setBrowserSource(source); setError(''); setVisibleCount(PAGE_SIZE); setSelectedJob(null);
    try {
      const d = await scrapeJobsBrowser(query, source, '', 40);
      setJobs(d.jobs || []);
      if (!d.jobs?.length) setError(`No jobs found on ${source} for "${query}"`);
    } catch { setError(`Failed to scrape ${source}. Check TINYFISH_API_KEY.`); }
    finally { setBrowserLoading(false); }
  }, [query]);

  useEffect(() => { fetch_(query); }, []);
  useEffect(() => { if (searchQuery && searchQuery !== query) { setQuery(searchQuery); fetch_(searchQuery); } }, [searchQuery]);
  useEffect(() => { if (tab === 'saved') setSavedJobs(getSavedJobs()); }, [tab]);

  const activeFilterCount = filters.workType.size + filters.expLevel.size + filters.jobType.size
    + filters.source.size + (filters.datePosted !== 'any' ? 1 : 0) + (filters.location ? 1 : 0);

  const filtered = useMemo(() => {
    let list = jobs.filter(j => {
      if (filters.workType.size && !filters.workType.has(inferWorkType(j))) return false;
      if (filters.expLevel.size && !filters.expLevel.has(inferExpLevel(j.title))) return false;
      if (filters.source.size && !filters.source.has(j.source || '')) return false;
      if (filters.jobType.has('Contract') && !`${j.title} ${j.tags?.join(' ')}`.toLowerCase().includes('contract')) return false;
      if (filters.jobType.has('C2C') && !`${j.title} ${j.tags?.join(' ')}`.toLowerCase().match(/c2c|corp.to.corp|corp2corp/)) return false;
      if (filters.jobType.has('1099') && !`${j.title} ${j.tags?.join(' ')}`.includes('1099')) return false;
      if (filters.jobType.has('Internship') && !j.title.toLowerCase().includes('intern')) return false;
      if (filters.datePosted !== 'any') {
        const d = daysAgo(j.posted_at);
        if (d !== null && d > parseInt(filters.datePosted)) return false;
      }
      if (filters.location) {
        const loc = `${j.location} ${j.tags?.join(' ')}`.toLowerCase();
        if (!loc.includes(filters.location.toLowerCase())) return false;
      }
      return true;
    });
    if (sort === 'date') {
      list = [...list].sort((a, b) => {
        const da = daysAgo(a.posted_at) ?? 999;
        const db = daysAgo(b.posted_at) ?? 999;
        return da - db;
      });
    }
    return list;
  }, [jobs, filters, sort]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [filters, sort]);

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

  const displayJobs  = tab === 'saved' ? savedJobs : filtered.slice(0, visibleCount);
  const hasMore      = tab === 'live' && visibleCount < filtered.length;
  const totalLabel   = tab === 'live' ? filtered.length : savedJobs.length;

  const QUICK_CHIPS   = ['Remote', 'Senior', 'Entry', 'Contract', 'AI / ML', 'Frontend', 'Backend', 'Data'];
  const CONTRACT_CHIPS = ['C2C', '1099'];

  return (
    <div className="jb-shell">
      {/* ── Top Bar ── */}
      <div className="jb-topbar">
        <div className="jb-tabs">
          <button className={`jobs-tab ${tab === 'live' ? 'active' : ''}`} onClick={() => { setTab('live'); setSelectedJob(null); }}>
            <Briefcase size={13}/> Live Jobs
            {jobs.length > 0 && <span className="jobs-tab-count">{filtered.length}</span>}
          </button>
          <button className={`jobs-tab ${tab === 'saved' ? 'active' : ''}`} onClick={() => { setTab('saved'); setSelectedJob(null); setSavedJobs(getSavedJobs()); }}>
            <BookmarkCheck size={13}/> Saved
            {getSavedJobs().length > 0 && <span className="jobs-tab-count">{getSavedJobs().length}</span>}
          </button>
        </div>

        {tab === 'live' && (
          <div className="jb-search-bar">
            <Search size={14} className="jb-search-icon"/>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetch_(query)}
              placeholder="Job title, skill, keyword, or company…"
            />
            <button className="btn-primary btn-sm" onClick={() => fetch_(query)} disabled={loading}>
              {loading ? <Loader size={13} className="spin"/> : 'Search'}
            </button>
          </div>
        )}
      </div>

      {/* ── Quick Filter Chips ── */}
      {tab === 'live' && (
        <div className="jb-quick-chips">
          {QUICK_CHIPS.map(chip => {
            const active = query.toLowerCase().includes(chip.toLowerCase());
            return (
              <button key={chip} className={`jb-quick-chip ${active ? 'active' : ''}`}
                onClick={() => { const q = active ? 'software engineer' : chip; setQuery(q); fetch_(q); }}>
                {chip}
              </button>
            );
          })}
          {/* Contract type chips — toggle jobType filter, not search query */}
          {CONTRACT_CHIPS.map(chip => {
            const active = filters.jobType.has(chip);
            return (
              <button key={chip} className={`jb-quick-chip contract-chip ${active ? 'active' : ''}`}
                title={chip === 'C2C' ? 'Corp-to-Corp contract roles' : '1099 independent contractor roles'}
                onClick={() => setFilters(f => ({ ...f, jobType: toggleSet(f.jobType, chip) }))}>
                {chip}
              </button>
            );
          })}
          <div className="jb-browser-sources">
            <Zap size={11} style={{ color: 'var(--accent)' }}/>
            {BROWSER_SOURCES.map(s => (
              <button
                key={s.id}
                className={`jb-browser-chip ${browserSource === s.id ? 'active' : ''}`}
                onClick={() => fetchBrowser(s.id)}
                disabled={browserLoading}
                title={`Scrape live jobs from ${s.label} using real browser`}
              >
                {browserLoading && browserSource === s.id ? <Loader size={10} className="spin"/> : null}
                {s.label}
              </button>
            ))}
            {browserSource && (
              <button className="jb-browser-chip-reset" onClick={() => fetch_(query)} title="Back to ATS sources">
                <RefreshCw size={10}/> ATS boards
              </button>
            )}
          </div>
          <div className="jb-sort-control">
            <ArrowUpDown size={12}/>
            <select value={sort} onChange={e => setSort(e.target.value as any)} className="jb-sort-select">
              <option value="relevance">Relevance</option>
              <option value="date">Newest first</option>
            </select>
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <div className="jb-body">
        {tab === 'live' && (
          <FilterSidebar filters={filters} onChange={f => { setFilters(f); setVisibleCount(PAGE_SIZE); }} activeCount={activeFilterCount}/>
        )}

        {/* ── Center: list + detail ── */}
        <div className={`jb-center ${selectedJob ? 'jb-center--split' : ''}`}>
          {/* Job list */}
          <div className="jb-list-col">
            {tab === 'live' && (
              <div className="jb-results-bar">
                <span className="jb-results-count">
                  <Globe size={12}/> {totalLabel.toLocaleString()} jobs · 8 sources · USA
                </span>
                <ActiveFilters filters={filters} onChange={setFilters}/>
              </div>
            )}

            {error && <div className="error-banner">{error}</div>}

            {loading && (
              <div className="jb-list">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="jb-card">
                    <div className="jb-card-inner">
                      <div className="sk-box" style={{ width: 38, height: 38, borderRadius: 8, flexShrink: 0 }}/>
                      <div className="jb-card-body" style={{ gap: 6 }}>
                        <div className="sk-box" style={{ width: '60%', height: 14 }}/>
                        <div className="sk-box" style={{ width: '40%', height: 11 }}/>
                        <div className="sk-box" style={{ width: '80%', height: 11 }}/>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && displayJobs.length === 0 && (
              <div className="empty-state">
                {tab === 'saved' ? <><Bookmark size={36}/><p>No saved jobs yet.</p></> : <><Briefcase size={36}/><p>No jobs match your filters.</p></>}
              </div>
            )}

            <div className="jb-list">
              {displayJobs.map((job, i) => (
                <JobCard
                  key={i}
                  job={job}
                  selected={selectedJob?.url === job.url}
                  onClick={() => setSelectedJob(prev => prev?.url === job.url ? null : job)}
                />
              ))}
            </div>

            {hasMore && (
              <div ref={sentinelRef} className="jb-load-more-sentinel">
                <Loader size={16} className="spin" style={{ color: 'var(--text-3)' }}/>
                <span>{visibleCount} of {filtered.length}</span>
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selectedJob && (
            <div className="jb-detail-col">
              <JobDetailPanel job={selectedJob} onClose={() => setSelectedJob(null)} onNavigate={onNavigate}/>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
