import React, { useState, useEffect } from 'react';
import { X, BookOpen, ExternalLink, Send, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { NeuButton } from '../ui/NeuButton';
import { NeuInput } from '../ui/NeuInput';

export function RAGHelpDrawer({ activeField, caseId, onClose }) {
  const [guidance, setGuidance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [error, setError] = useState(null);

  const fetchGuidance = async (query = '') => {
    if (!activeField) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/cases/${caseId}/guided-form/guidance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_id: activeField.field_id,
          section_id: activeField.section_id || 'general',
          user_query: query || undefined,
          current_value: activeField.value
        })
      });
      const json = await res.json();
      if (json.success) {
        setGuidance(json.data);
      } else {
        setError(json.detail || 'Failed to retrieve legal guidance.');
      }
    } catch (err) {
      console.error('Error fetching guidance:', err);
      setError('Could not connect to NyayaSetu guidance engine.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeField?.field_id) {
      fetchGuidance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeField?.field_id, caseId]);

  if (!activeField) return null;

  return (
    <div className="rag-drawer animate-fade-in" style={{ position: 'sticky', top: '90px', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
      {/* Header */}
      <div className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--shadow-dark)', paddingBottom: '12px', marginBottom: '16px' }}>
        <div className="flex items-center gap-2">
          <BookOpen size={20} style={{ color: 'var(--color-understand)' }} />
          <h3 className="text-card-title" style={{ fontSize: '16px', margin: 0 }}>
            Legal Grounding & Guidance
          </h3>
        </div>
        <button 
          onClick={onClose} 
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
        >
          <X size={18} />
        </button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <span className="text-helper" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Contextual Field
        </span>
        <h4 className="text-body" style={{ margin: '4px 0 0 0', fontWeight: '700' }}>
          {activeField.label}
        </h4>
      </div>

      {/* Query Bar */}
      <div className="flex gap-2" style={{ marginBottom: '16px' }}>
        <NeuInput 
          placeholder="Ask a specific question about this field..." 
          value={userQuery} 
          onChange={(e) => setUserQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchGuidance(userQuery)}
          style={{ fontSize: '13px', padding: '10px 14px' }}
        />
        <NeuButton 
          variant="primary" 
          onClick={() => fetchGuidance(userQuery)} 
          disabled={loading}
          style={{ padding: '10px 14px' }}
        >
          {loading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
        </NeuButton>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center" style={{ padding: '32px 0' }}>
          <RefreshCw size={24} style={{ color: 'var(--color-understand)', animation: 'spin 1s linear infinite' }} />
          <span className="text-helper" style={{ marginTop: '12px' }}>Searching indexed CPA 2019 & e-Jagriti guidelines...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="neu-inset" style={{ padding: '16px', borderRadius: '12px', color: 'var(--color-danger)', marginBottom: '16px' }}>
          <div className="flex items-center gap-2" style={{ fontWeight: '700' }}>
            <AlertCircle size={16} /> Error
          </div>
          <p className="text-helper" style={{ margin: '8px 0 0 0' }}>{error}</p>
        </div>
      )}

      {/* Content */}
      {!loading && guidance && (
        <div>
          {/* Explanation Card */}
          <div className="neu-inset" style={{ padding: '16px', borderRadius: '12px', marginBottom: '16px', background: 'rgba(63, 111, 224, 0.04)' }}>
            <div className="flex items-center gap-1" style={{ marginBottom: '8px', color: 'var(--color-understand)', fontWeight: '700', fontSize: '12px' }}>
              <ShieldCheck size={14} /> PLAIN-LANGUAGE EXPLANATION
            </div>
            <p className="text-body" style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
              {guidance.explanation}
            </p>
          </div>

          {/* Insufficient Sources Handling */}
          {guidance.grounding_status === 'insufficient_sources' ? (
            <div className="neu-inset" style={{ padding: '16px', borderRadius: '12px', marginBottom: '16px', background: '#fffbeb', border: '1px solid #fef3c7' }}>
              <span className="text-helper" style={{ color: '#92400e', fontWeight: '500' }}>
                For official instructions not covered in the local database, please refer directly to the verified e-Jagriti portal:
              </span>
              <div style={{ marginTop: '8px' }}>
                <a 
                  href="https://e-jagriti.gov.in/help-docs" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-1"
                  style={{ color: 'var(--color-understand)', fontWeight: '700', fontSize: '13px' }}
                >
                  Visit e-Jagriti Official Help Docs <ExternalLink size={13} />
                </a>
              </div>
            </div>
          ) : (
            <div>
              <h5 className="text-card-title" style={{ fontSize: '13px', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Official Citations & Sources ({guidance.sources.length})
              </h5>
              
              <div className="flex flex-col gap-2">
                {guidance.sources.map((src, idx) => (
                  <div key={idx} className="neu-card" style={{ padding: '14px', borderRadius: '10px', background: '#ffffff', border: '1px solid #e5e2e1' }}>
                    <div className="flex justify-between items-start" style={{ marginBottom: '4px' }}>
                      <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>
                        {src.title}
                      </span>
                      {src.url && (
                        <a 
                          href={src.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          title="Open official government source"
                          style={{ color: 'var(--color-understand)', marginLeft: '8px' }}
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                    
                    <div className="text-helper" style={{ fontSize: '12px', color: 'var(--color-act)', fontWeight: '600', marginBottom: '6px' }}>
                      {src.section}
                    </div>

                    <p className="text-body" style={{ margin: 0, fontSize: '12px', color: '#44474a', fontStyle: 'italic', lineHeight: '1.4' }}>
                      "{src.retrieved_excerpt}"
                    </p>

                    {src.published_or_effective_date && (
                      <div className="text-helper" style={{ fontSize: '11px', marginTop: '6px', color: 'var(--text-secondary)' }}>
                        Effective Date: {src.published_or_effective_date}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer Disclaimer */}
      <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid var(--shadow-dark)' }}>
        <p className="text-helper" style={{ fontSize: '11px', margin: 0, textAlign: 'center' }}>
          Legal guidance is RAG-retrieved from official government gazettes. NyayaSetu does not fabricate case precedents or statutory articles.
        </p>
      </div>
    </div>
  );
}
