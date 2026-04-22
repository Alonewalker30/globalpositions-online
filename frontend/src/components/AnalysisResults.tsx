import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import '../styles/AnalysisResults.css';

interface AnalysisResultsProps {
  data: any;
  loading: boolean;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({ data, loading }) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (loading) {
    return (
      <div className="analysis-loading">
        <div className="spinner"></div>
        <p>Analyzing your resume against job description...</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const keywordMatch = data.keyword_match || {};
  const atsScore = data.ats_compatibility?.compatibility_score || 0;
  const jobAnalysis = data.job_analysis || {};

  return (
    <div className="analysis-results">
      <div className="results-header">
        <h2>Analysis Results</h2>
        <div className="score-badges">
          <div className="badge ats-badge">
            <span>ATS Score</span>
            <strong>{atsScore}%</strong>
          </div>
          <div className="badge keyword-badge">
            <span>Keyword Match</span>
            <strong>{keywordMatch.match_percentage?.toFixed(1) || 0}%</strong>
          </div>
        </div>
      </div>

      <div className="results-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'keywords' ? 'active' : ''}`}
          onClick={() => setActiveTab('keywords')}
        >
          Keywords
        </button>
        <button
          className={`tab ${activeTab === 'suggestions' ? 'active' : ''}`}
          onClick={() => setActiveTab('suggestions')}
        >
          Suggestions
        </button>
        <button
          className={`tab ${activeTab === 'company' ? 'active' : ''}`}
          onClick={() => setActiveTab('company')}
        >
          Company Info
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            <h3>Job Analysis</h3>
            <div className="info-grid">
              <div className="info-item">
                <strong>Position:</strong> {jobAnalysis.job_title || 'N/A'}
              </div>
              <div className="info-item">
                <strong>Level:</strong> {jobAnalysis.seniority_level || 'N/A'}
              </div>
              <div className="info-item">
                <strong>Experience:</strong> {jobAnalysis.years_of_experience || 'N/A'} years
              </div>
              <div className="info-item">
                <strong>Industry:</strong> {jobAnalysis.company_industry || 'N/A'}
              </div>
            </div>

            <h3 style={{ marginTop: '24px' }}>Key Responsibilities</h3>
            <ul>
              {jobAnalysis.key_responsibilities?.slice(0, 5).map((resp: string, i: number) => (
                <li key={i}>{resp}</li>
              ))}
            </ul>

            <h3 style={{ marginTop: '24px' }}>Required Skills</h3>
            <div className="skills-tags">
              {jobAnalysis.required_skills?.slice(0, 8).map((skill: string, i: number) => (
                <span key={i} className="skill-tag">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'keywords' && (
          <div className="keywords-section">
            <div className="keyword-stat">
              <TrendingUp size={20} />
              <div>
                <strong>Matched Keywords:</strong> {keywordMatch.matched_count || 0} /{' '}
                {keywordMatch.total_keywords || 0}
              </div>
            </div>

            <h3>✅ Keywords Found in Resume</h3>
            <div className="keywords-list">
              {keywordMatch.matched_keywords?.slice(0, 15).map((kw: string, i: number) => (
                <span key={i} className="keyword-badge matched">
                  {kw}
                </span>
              ))}
            </div>

            <h3>❌ Missing Keywords</h3>
            <div className="keywords-list">
              {keywordMatch.missing_keywords?.slice(0, 15).map((kw: string, i: number) => (
                <span key={i} className="keyword-badge missing">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div className="suggestions-section">
            {data.improvements?.key_improvements?.length > 0 ? (
              data.improvements.key_improvements.map((imp: any, i: number) => (
                <div key={i} className={`suggestion ${imp.priority}`}>
                  <div className="suggestion-header">
                    <strong>{imp.section}</strong>
                    <span className={`priority-badge ${imp.priority}`}>{imp.priority}</span>
                  </div>
                  <p>
                    <strong>Original:</strong> {imp.original}
                  </p>
                  <p>
                    <strong>Suggested:</strong> {imp.suggested}
                  </p>
                  <p>
                    <em>{imp.reason}</em>
                  </p>
                </div>
              ))
            ) : (
              <p>No specific suggestions available at this time.</p>
            )}
          </div>
        )}

        {activeTab === 'company' && (
          <div className="company-section">
            {data.company_techstack && Object.keys(data.company_techstack).length > 0 ? (
              <>
                <h3>Likely Tech Stack</h3>
                {Object.entries(data.company_techstack).map(([key, value]: [string, any]) => (
                  <div key={key} className="tech-category">
                    <h4>{key.replace(/_/g, ' ').toUpperCase()}</h4>
                    <div className="tech-items">
                      {Array.isArray(value) &&
                        value.map((tech: string, i: number) => (
                          <span key={i} className="tech-item">
                            {tech}
                          </span>
                        ))}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <p>Company research data not available</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisResults;
