import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_URL ?? '') + '/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const analyzeResume = async (resumeText: string, jobDescription: string, companyName?: string) => {
  const response = await apiClient.post('/analyze', {
    resume_text: resumeText,
    job_description: jobDescription,
    company_name: companyName || null,
  });
  return response.data;
};

export const optimizeResume = async (resumeText: string, jobDescription: string) => {
  const response = await apiClient.post('/optimize', {
    resume_text: resumeText,
    job_description: jobDescription,
  });
  return response.data;
};

export const extractKeywords = async (jobDescription: string) => {
  const formData = new FormData();
  formData.append('job_description', jobDescription);
  
  const response = await apiClient.post('/keywords/extract', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const parseResume = async (resumeText: string) => {
  const formData = new FormData();
  formData.append('resume_text', resumeText);
  
  const response = await apiClient.post('/parse', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const researchCompany = async (companyName: string, industry: string) => {
  const formData = new FormData();
  formData.append('company_name', companyName);
  formData.append('industry', industry);

  const response = await apiClient.post('/company/research', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export interface CareerIntelligenceInput {
  job_title: string;
  skills: string[];
  target_role?: string;
  years_experience?: number;
  industry?: string;
}

export const getCareerIntelligence = async (input: CareerIntelligenceInput) => {
  const response = await apiClient.post('/career/intelligence', input);
  return response.data;
};

export const getLiveJobs = async (title: string, skills?: string[]) => {
  const params: Record<string, string> = { title };
  if (skills?.length) params.skills = skills.join(',');
  const response = await apiClient.get('/career/jobs', { params });
  return response.data;
};

export const getCareerPageJobs = async (query: string, limit = 80) => {
  const response = await apiClient.get('/jobs/career', { params: { query, limit } });
  return response.data;
};

export const getIndustryNews = async (skills: string[], jobTitle?: string) => {
  const response = await apiClient.get('/career/news', {
    params: { skills: skills.join(','), job_title: jobTitle || 'software engineer' },
  });
  return response.data;
};

export const parseResumeAI = async (fileOrText: File | string) => {
  const form = new FormData();
  if (typeof fileOrText === 'string') {
    form.append('resume_text', fileOrText);
  } else {
    form.append('file', fileOrText);
  }
  const response = await apiClient.post('/resume/parse-ai', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });
  return response.data;
};

export const getLearningResources = async (skills: string[]) => {
  const response = await apiClient.get('/career/resources', {
    params: { skills: skills.join(',') },
  });
  return response.data;
};

export const getTrendingSkills = async () => {
  const response = await apiClient.get('/skills/trending');
  return response.data;
};

export const rewriteResumeBullets = async (resumeData: object, jobDescription: string) => {
  const response = await apiClient.post('/resume/rewrite', {
    resume_data: resumeData,
    job_description: jobDescription,
  });
  return response.data;
};

// ── TinyFish Browser API ────────────────────────────────────────────────────

export type BrowserJobSource = 'linkedin' | 'indeed' | 'glassdoor';

export const scrapeJobsBrowser = async (
  query: string,
  source: BrowserJobSource = 'linkedin',
  location = '',
  limit = 30,
) => {
  const response = await apiClient.post(
    '/browser/scrape-jobs',
    { query, source, location, limit },
    { timeout: 120_000 },  // TinyFish sessions take up to 30s to start
  );
  return response.data as { success: boolean; source: string; total: number; jobs: any[] };
};

export const getApplyFields = async (jobUrl: string, resumeData: object) => {
  const response = await apiClient.post(
    '/browser/apply-fields',
    { job_url: jobUrl, resume_data: resumeData },
    { timeout: 120_000 },
  );
  return response.data as {
    success: boolean;
    fields: Array<{ label: string; type: string; name: string; suggested_value: string }>;
    apply_url: string;
    field_count: number;
    error?: string;
  };
};

export const researchCompanyBrowser = async (companyName: string, careerUrl = '') => {
  const response = await apiClient.post(
    '/browser/company-research',
    { company_name: companyName, career_url: careerUrl },
    { timeout: 120_000 },
  );
  return response.data as {
    success: boolean;
    company: string;
    culture: string[];
    benefits: string[];
    tech_stack: string[];
    open_roles_count: number;
    hiring_locations: string[];
    remote_policy: string;
    unique_highlights: string[];
    summary: string;
    source_url: string;
    error?: string;
  };
};

/** SSE streaming chat — yields tokens as they arrive from the backend. */
export async function* streamChat(
  message: string,
  history: Array<{ role: string; text: string }>,
  modelTier = 'balanced',
): AsyncGenerator<string> {
  const base = (import.meta.env.VITE_API_URL ?? '') + '/api';
  const res = await fetch(`${base}/career/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, model_tier: modelTier }),
  });
  if (!res.ok) throw new Error(`Stream error ${res.status}`);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') return;
      try {
        const data = JSON.parse(payload);
        if (data.error) throw new Error(data.error);
        if (data.token) yield data.token;
      } catch (e) {
        if ((e as Error).message?.startsWith('Stream error') || (e as any)?.message?.includes('error')) throw e;
      }
    }
  }
}
