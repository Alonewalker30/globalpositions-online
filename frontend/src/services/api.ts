import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_URL ?? '') + '/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
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
