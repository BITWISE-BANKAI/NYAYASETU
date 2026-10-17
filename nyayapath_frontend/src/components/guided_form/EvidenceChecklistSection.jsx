import React from 'react';
import { CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';

export function EvidenceChecklistSection({ checklist, onUpdateStatus }) {
  const mandatoryItems = checklist.filter(item => item.requirement_level === 'mandatory_filing_instruction');
  const recommendedItems = checklist.filter(item => item.requirement_level !== 'mandatory_filing_instruction');

  const renderItem = (item) => {
    const isMandatory = item.requirement_level === 'mandatory_filing_instruction';

    return (
      <div 
        key={item.item_id}
        className="neu-card" 
        style={{ 
          padding: '16px', 
          borderRadius: '12px', 
          background: 'var(--base-bg)', 
          boxShadow: 'var(--shadow-raised)', 
          marginBottom: '16px',
          borderLeft: isMandatory ? '4px solid var(--color-danger)' : '4px solid var(--color-understand)'
        }}
      >
        <div className="flex justify-between items-start" style={{ marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div className="flex items-center gap-2">
              <span style={{ fontWeight: '700', fontSize: '15px' }}>{item.title}</span>
              {isMandatory ? (
                <span className="badge-pill" style={{ background: '#fce8e6', color: '#c5221f' }}>
                  <ShieldAlert size={12} /> Mandatory Filing Document
                </span>
              ) : (
                <span className="badge-pill" style={{ background: '#e8f0fe', color: '#1a73e8' }}>
                  Recommended Evidence
                </span>
              )}
            </div>
            <p className="text-helper" style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
              {item.description}
            </p>
          </div>

          {/* Current Status Pill */}
          <div>
            {item.status === 'provided' && (
              <span className="badge-pill badge-confirmed">
                <CheckCircle2 size={12} /> Available / Attached
              </span>
            )}
            {item.status === 'missing' && (
              <span className="badge-pill badge-missing">
                <AlertCircle size={12} /> Not Provided
              </span>
            )}
            {item.status === 'unreadable' && (
              <span className="badge-pill badge-conflict">
                Unreadable Scan
              </span>
            )}
            {item.status === 'not_applicable' && (
              <span className="badge-pill badge-unknown">
                Not Applicable
              </span>
            )}
          </div>
        </div>

        {item.statutory_basis && (
          <div className="text-helper" style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Statutory Basis: <strong>{item.statutory_basis}</strong>
          </div>
        )}

        {/* Status Toggle Actions */}
        <div className="flex gap-2" style={{ marginTop: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="neu-button"
            style={{ 
              fontSize: '11px', 
              padding: '6px 12px',
              color: item.status === 'provided' ? 'var(--color-act)' : 'var(--text-secondary)',
              boxShadow: item.status === 'provided' ? 'var(--shadow-pressed)' : 'var(--shadow-raised)'
            }}
            onClick={() => onUpdateStatus && onUpdateStatus(item.item_id, 'provided')}
          >
            ✓ I Have This
          </button>
          <button
            type="button"
            className="neu-button"
            style={{ 
              fontSize: '11px', 
              padding: '6px 12px',
              color: item.status === 'missing' ? 'var(--color-danger)' : 'var(--text-secondary)',
              boxShadow: item.status === 'missing' ? 'var(--shadow-pressed)' : 'var(--shadow-raised)'
            }}
            onClick={() => onUpdateStatus && onUpdateStatus(item.item_id, 'missing')}
          >
            Don't Have
          </button>
          <button
            type="button"
            className="neu-button"
            style={{ 
              fontSize: '11px', 
              padding: '6px 12px',
              color: item.status === 'not_applicable' ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: item.status === 'not_applicable' ? 'var(--shadow-pressed)' : 'var(--shadow-raised)'
            }}
            onClick={() => onUpdateStatus && onUpdateStatus(item.item_id, 'not_applicable')}
          >
            Not Applicable
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 className="text-card-title" style={{ fontSize: '18px', marginBottom: '6px' }}>
          Documentary Evidence Checklist
        </h3>
        <p className="text-helper" style={{ margin: 0 }}>
          NyayaSetu distinguishes documents explicitly required by official Commission filing rules from helpful corroborating evidence.
        </p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h4 className="text-body" style={{ color: 'var(--color-danger)', fontWeight: '700', marginBottom: '12px' }}>
          Mandatory Annexures (Required under CPA 2019 / e-Jagriti Rules)
        </h4>
        {mandatoryItems.map(renderItem)}
      </div>

      <div>
        <h4 className="text-body" style={{ color: 'var(--color-understand)', fontWeight: '700', marginBottom: '12px' }}>
          Corroborating Evidence (Strengthens Case against Opposite Party Allegations)
        </h4>
        {recommendedItems.map(renderItem)}
      </div>
    </div>
  );
}
