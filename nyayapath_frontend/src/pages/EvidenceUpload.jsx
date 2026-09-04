import React from 'react';
import { useNavigate } from 'react-router-dom';
import { NeuButton } from '../components/ui/NeuButton';
import { NeuCard } from '../components/ui/NeuCard';
import { UploadCloud, File, FileText, Image as ImageIcon } from 'lucide-react';

export function EvidenceUpload() {
  const navigate = useNavigate();

  return (
    <div className="container flex-col animate-fade-in" style={{ gap: '32px', maxWidth: '800px' }}>
      <div>
        <h2 className="text-heading">What evidence do you have?</h2>
        <p className="text-helper">Add whatever you have. We'll help identify what matters and what's missing.</p>
      </div>

      <NeuCard inset={true} className="flex flex-col items-center justify-center" style={{ padding: '64px', border: '2px dashed var(--shadow-dark)', cursor: 'pointer' }}>
        <UploadCloud size={64} style={{ color: 'var(--color-prepare)', marginBottom: '16px' }} />
        <h3 className="text-card-title">Drag & Drop files here</h3>
        <p className="text-helper" style={{ marginBottom: '24px' }}>or click to browse from your device</p>
        <NeuButton>Select Files</NeuButton>
      </NeuCard>

      <div>
        <h3 className="text-body" style={{ marginBottom: '16px' }}>Supported Evidence Types</h3>
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          <div className="neu-raised flex items-center gap-1" style={{ padding: '8px 16px', borderRadius: '24px', fontSize: '13px', fontWeight: 'bold' }}><FileText size={16}/> Invoice</div>
          <div className="neu-raised flex items-center gap-1" style={{ padding: '8px 16px', borderRadius: '24px', fontSize: '13px', fontWeight: 'bold' }}><File size={16}/> Warranty Card</div>
          <div className="neu-raised flex items-center gap-1" style={{ padding: '8px 16px', borderRadius: '24px', fontSize: '13px', fontWeight: 'bold' }}><ImageIcon size={16}/> Chat Screenshots</div>
          <div className="neu-raised flex items-center gap-1" style={{ padding: '8px 16px', borderRadius: '24px', fontSize: '13px', fontWeight: 'bold' }}><FileText size={16}/> Emails</div>
          <div className="neu-raised flex items-center gap-1" style={{ padding: '8px 16px', borderRadius: '24px', fontSize: '13px', fontWeight: 'bold' }}><ImageIcon size={16}/> Photos / Video</div>
        </div>
      </div>

      <div className="flex justify-between items-center" style={{ marginTop: '16px' }}>
        <NeuButton onClick={() => navigate('/intake')}>Back to Narrative</NeuButton>
        <NeuButton variant="primary" onClick={() => navigate('/intake')}>
          Continue
        </NeuButton>
      </div>
    </div>
  );
}
