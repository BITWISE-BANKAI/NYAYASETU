import React from 'react';
import { Check } from 'lucide-react';

export function FormStepper({ sections, currentStep, onSelectStep }) {
  return (
    <div className="neu-card" style={{ padding: '20px', borderRadius: '16px', background: 'var(--base-bg)', boxShadow: 'var(--shadow-raised)', marginBottom: '24px' }}>
      <div className="flex items-center justify-between" style={{ overflowX: 'auto', gap: '12px', paddingBottom: '8px' }}>
        {sections.map((sec, idx) => {
          const stepNum = idx + 1;
          const isActive = currentStep === stepNum;
          const isCompleted = sec.is_completed || currentStep > stepNum;

          return (
            <div 
              key={sec.section_id} 
              className="flex items-center gap-2"
              style={{ cursor: 'pointer', flexShrink: 0 }}
              onClick={() => onSelectStep(stepNum)}
            >
              <div className={`step-node ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                {isCompleted ? <Check size={16} /> : stepNum}
              </div>
              <div className="flex flex-col">
                <span 
                  className="text-body" 
                  style={{ 
                    fontSize: '13px', 
                    fontWeight: isActive ? '700' : '500',
                    color: isActive ? 'var(--color-understand)' : 'var(--text-primary)'
                  }}
                >
                  {sec.title}
                </span>
                <span className="text-helper" style={{ fontSize: '11px' }}>
                  {sec.fields.filter(f => f.user_confirmed).length}/{sec.fields.length} confirmed
                </span>
              </div>
              {idx < sections.length - 1 && (
                <div style={{ width: '20px', height: '2px', background: isCompleted ? 'var(--color-act)' : 'var(--shadow-dark)', margin: '0 4px' }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
