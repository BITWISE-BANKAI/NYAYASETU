import React, { useState, useEffect } from 'react';
import { HelpCircle, Check, Edit2, HelpCircle as QuestionIcon, AlertTriangle } from 'lucide-react';
import { NeuButton } from '../ui/NeuButton';
import { NeuInput, NeuTextArea } from '../ui/NeuInput';

export function FieldWithProvenance({ field, onConfirm, onSaveValue, onMarkUnknown, onOpenHelp }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(field.value !== null && field.value !== undefined ? String(field.value) : '');

  useEffect(() => {
    setDraftValue(field.value !== null && field.value !== undefined ? String(field.value) : '');
  }, [field.value]);

  const handleSave = () => {
    onSaveValue(field.field_id, draftValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraftValue(field.value !== null && field.value !== undefined ? String(field.value) : '');
    setIsEditing(false);
  };

  const getStatusBadge = () => {
    switch (field.status) {
      case 'confirmed':
        return <span className="badge-pill badge-confirmed"><Check size={12} /> Confirmed</span>;
      case 'suggested':
        return <span className="badge-pill badge-suggested">✦ Suggested</span>;
      case 'conflict':
        return <span className="badge-pill badge-conflict"><AlertTriangle size={12} /> Contradiction</span>;
      case 'unknown':
        return <span className="badge-pill badge-unknown"><QuestionIcon size={12} /> Marked Unknown</span>;
      default:
        return <span className="badge-pill badge-missing">⚠ Missing</span>;
    }
  };

  return (
    <div 
      className="neu-raised" 
      style={{ 
        padding: '20px', 
        borderRadius: '16px', 
        marginBottom: '20px',
        borderLeft: field.status === 'confirmed' ? '4px solid var(--color-act)' : (field.status === 'suggested' ? '4px solid var(--color-prepare)' : '4px solid transparent')
      }}
    >
      {/* Header: Label, Badges & Help Action */}
      <div className="flex justify-between items-start" style={{ marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <label className="text-card-title" style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {field.label}
            {field.is_required && <span style={{ color: 'var(--color-danger)' }}>*</span>}
          </label>
          {field.provenance && field.provenance.source_label && (
            <span className="text-helper" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Source: {field.provenance.source_label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <button 
            type="button"
            className="flex items-center gap-1"
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--color-understand)', 
              cursor: 'pointer', 
              fontSize: '12px', 
              fontWeight: '700' 
            }}
            onClick={() => onOpenHelp(field)}
            title="Ask NyayaSetu assistant about this field and legal grounding"
          >
            <HelpCircle size={15} /> Ask NyayaSetu
          </button>
        </div>
      </div>

      {/* Field Value Display / Edit Input */}
      {isEditing ? (
        <div style={{ marginTop: '12px' }}>
          {field.value_type === 'text' ? (
            <NeuTextArea 
              value={draftValue} 
              onChange={(e) => setDraftValue(e.target.value)} 
              placeholder={field.placeholder || 'Enter details...'}
              style={{ marginBottom: '12px' }}
            />
          ) : (
            <NeuInput 
              type={field.value_type === 'money' ? 'number' : (field.value_type === 'date' ? 'date' : 'text')}
              value={draftValue} 
              onChange={(e) => setDraftValue(e.target.value)} 
              placeholder={field.placeholder || 'Enter value...'}
              style={{ marginBottom: '12px' }}
            />
          )}
          <div className="flex gap-2 justify-end">
            <NeuButton onClick={handleCancel} style={{ fontSize: '13px', padding: '8px 16px' }}>Cancel</NeuButton>
            <NeuButton variant="primary" onClick={handleSave} style={{ fontSize: '13px', padding: '8px 16px' }}>Save & Confirm</NeuButton>
          </div>
        </div>
      ) : (
        <div>
          {field.status === 'unknown' ? (
            <div className="neu-inset" style={{ padding: '12px 16px', borderRadius: '10px', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
              [Marked unknown by user — will not be fabricated in legal petition]
            </div>
          ) : field.value !== null && field.value !== undefined && String(field.value).trim() !== '' ? (
            <div className="neu-inset" style={{ padding: '12px 16px', borderRadius: '10px', fontWeight: '500' }}>
              {field.value_type === 'money' ? `₹ ${Number(field.value).toLocaleString('en-IN')}` : String(field.value)}
            </div>
          ) : (
            <div className="neu-inset" style={{ padding: '12px 16px', borderRadius: '10px', color: 'var(--color-danger)', fontStyle: 'italic' }}>
              No information provided yet
            </div>
          )}

          {/* Contextual Actions */}
          <div className="flex items-center justify-between" style={{ marginTop: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div className="text-helper" style={{ fontSize: '12px' }}>
              {field.user_confirmed 
                ? '✓ Verified by you' 
                : (field.status === 'suggested' ? 'Extracted suggestion — please verify' : '')}
            </div>
            <div className="flex gap-2">
              {!field.user_confirmed && field.status === 'suggested' && (
                <NeuButton 
                  onClick={() => onConfirm(field.field_id)} 
                  variant="act"
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                >
                  ✓ Confirm
                </NeuButton>
              )}
              <NeuButton 
                onClick={() => setIsEditing(true)} 
                style={{ fontSize: '12px', padding: '6px 14px' }}
              >
                <Edit2 size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> 
                {field.value ? 'Edit' : 'Add Value'}
              </NeuButton>
              {field.status !== 'unknown' && !field.is_required && (
                <NeuButton 
                  onClick={() => onMarkUnknown(field.field_id)} 
                  style={{ fontSize: '12px', padding: '6px 12px', color: 'var(--text-secondary)' }}
                >
                  Mark Unknown
                </NeuButton>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
