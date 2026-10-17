import React, { useState } from 'react';
import { X, AlertTriangle, Scale } from 'lucide-react';
import { NeuButton } from '../ui/NeuButton';
import { NeuInput, NeuTextArea } from '../ui/NeuInput';

export function ConflictResolverModal({ conflict, onResolve, onClose }) {
  const [selectedChoice, setSelectedChoice] = useState('use_source_a');
  const [customValue, setCustomValue] = useState('');
  const [notes, setNotes] = useState('');

  if (!conflict) return null;

  const handleConfirm = () => {
    let resolvedVal = conflict.source_a.value;
    if (selectedChoice === 'use_source_b') {
      resolvedVal = conflict.source_b.value;
    } else if (selectedChoice === 'custom_value') {
      resolvedVal = customValue;
    } else if (selectedChoice === 'mark_disputed') {
      resolvedVal = `${conflict.source_a.value} (Note: Opposite party claimed '${conflict.source_b.value}', which is expressly disputed)`;
    }

    onResolve(conflict.conflict_id, conflict.field_id, selectedChoice, resolvedVal, notes);
    onClose();
  };

  return (
    <div className="modal-overlay animate-fade-in">
      <div 
        className="neu-raised" 
        style={{ 
          maxWidth: '650px', 
          width: '100%', 
          borderRadius: '20px', 
          padding: '28px',
          background: 'var(--base-bg)',
          boxShadow: 'var(--shadow-raised)'
        }}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--shadow-dark)', paddingBottom: '12px', marginBottom: '16px' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} style={{ color: 'var(--color-danger)' }} />
            <h3 className="text-card-title" style={{ fontSize: '18px', margin: 0 }}>
              Resolve Contradiction / Clarification
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        <p className="text-body" style={{ fontSize: '14px', marginBottom: '16px' }}>
          {conflict.description}
        </p>

        {/* Side-by-side comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2" style={{ marginBottom: '20px' }}>
          <div 
            className="neu-inset" 
            style={{ 
              padding: '16px', 
              borderRadius: '12px',
              border: selectedChoice === 'use_source_a' ? '2px solid var(--color-understand)' : '1px solid transparent',
              cursor: 'pointer'
            }}
            onClick={() => setSelectedChoice('use_source_a')}
          >
            <div className="flex items-center gap-1" style={{ fontWeight: '700', fontSize: '12px', color: 'var(--color-understand)', marginBottom: '6px' }}>
              <Scale size={14} /> {conflict.source_a.label}
            </div>
            <p className="text-body" style={{ margin: 0, fontSize: '13px' }}>
              {conflict.source_a.value}
            </p>
          </div>

          <div 
            className="neu-inset" 
            style={{ 
              padding: '16px', 
              borderRadius: '12px',
              border: selectedChoice === 'use_source_b' ? '2px solid var(--color-understand)' : '1px solid transparent',
              cursor: 'pointer'
            }}
            onClick={() => setSelectedChoice('use_source_b')}
          >
            <div className="flex items-center gap-1" style={{ fontWeight: '700', fontSize: '12px', color: 'var(--color-prepare)', marginBottom: '6px' }}>
              <Scale size={14} /> {conflict.source_b.label}
            </div>
            <p className="text-body" style={{ margin: 0, fontSize: '13px' }}>
              {conflict.source_b.value}
            </p>
          </div>
        </div>

        {/* Resolution Options */}
        <div style={{ marginBottom: '20px' }}>
          <label className="text-body" style={{ fontWeight: '700', display: 'block', marginBottom: '8px' }}>
            Choose how to present this in the complaint:
          </label>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2" style={{ cursor: 'pointer', fontSize: '14px' }}>
              <input 
                type="radio" 
                name="resolution" 
                checked={selectedChoice === 'use_source_a'} 
                onChange={() => setSelectedChoice('use_source_a')} 
              />
              Stand by my account ({conflict.source_a.label})
            </label>
            <label className="flex items-center gap-2" style={{ cursor: 'pointer', fontSize: '14px' }}>
              <input 
                type="radio" 
                name="resolution" 
                checked={selectedChoice === 'mark_disputed'} 
                onChange={() => setSelectedChoice('mark_disputed')} 
              />
              Formally record the opposite party's claim as an unfounded and disputed allegation
            </label>
            <label className="flex items-center gap-2" style={{ cursor: 'pointer', fontSize: '14px' }}>
              <input 
                type="radio" 
                name="resolution" 
                checked={selectedChoice === 'custom_value'} 
                onChange={() => setSelectedChoice('custom_value')} 
              />
              Provide my own refined clarification
            </label>
          </div>

          {selectedChoice === 'custom_value' && (
            <div style={{ marginTop: '12px' }}>
              <NeuTextArea 
                placeholder="Enter exact clarification..." 
                value={customValue} 
                onChange={(e) => setCustomValue(e.target.value)}
                style={{ fontSize: '13px' }}
              />
            </div>
          )}

          <div style={{ marginTop: '12px' }}>
            <label className="text-helper" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              Optional Note for Case File:
            </label>
            <NeuInput 
              placeholder="e.g. Discussed with technician on phone" 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
              style={{ fontSize: '13px' }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2" style={{ borderTop: '1px solid var(--shadow-dark)', paddingTop: '16px' }}>
          <NeuButton onClick={onClose}>Cancel</NeuButton>
          <NeuButton variant="act" onClick={handleConfirm}>
            ✓ Save & Resolve Contradiction
          </NeuButton>
        </div>
      </div>
    </div>
  );
}
