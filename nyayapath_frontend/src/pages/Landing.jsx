import React from 'react';
import { useNavigate } from 'react-router-dom';
import { NeuButton } from '../components/ui/NeuButton';
import { NeuCard } from '../components/ui/NeuCard';
import { ArrowRight, Edit, CheckCircle, Folder, Gavel, Play, FileText } from 'lucide-react';

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="container flex-col items-center animate-fade-in" style={{ gap: '64px', marginTop: '24px' }}>
      
      {/* Hero Section */}
      <section className="flex flex-col items-center text-center gap-2" style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Stage Marker Pill */}
        <div className="neu-inset rounded-full flex items-center justify-center gap-2" style={{ padding: '8px 24px', marginBottom: '24px' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-understand)' }}>Understand</span>
          <ArrowRight size={14} style={{ color: 'var(--text-secondary)' }} />
          <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-prepare)' }}>Prepare</span>
          <ArrowRight size={14} style={{ color: 'var(--text-secondary)' }} />
          <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-act)' }}>Act</span>
        </div>

        <h1 className="text-display" style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>
          We don't replace the existing grievance system.<br/>
          <span style={{ color: 'var(--text-secondary)' }}>We make it easier to navigate.</span>
        </h1>
        
        <p className="text-body" style={{ color: 'var(--text-secondary)', maxWidth: '600px' }}>
          Transform your complex narrative into structured, actionable legal artifacts. Start by telling us what happened, and we'll guide you through understanding your rights and preparing for action.
        </p>
        
        <NeuButton variant="act" onClick={() => navigate('/intake')} style={{ marginTop: '32px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Describe what happened <ArrowRight size={18} />
        </NeuButton>
      </section>

      {/* Transformation Diagram (Bento Grid) */}
      <section style={{ width: '100%', marginTop: '48px' }}>
        <h2 className="text-heading text-center" style={{ marginBottom: '32px' }}>The Transformation Process</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 relative">
          
          {/* Story */}
          <NeuCard className="col-span-1 flex flex-col items-center text-center z-10">
            <div className="neu-inset rounded-full flex items-center justify-center" style={{ width: '48px', height: '48px', color: 'var(--color-understand)', marginBottom: '16px' }}>
              <Edit size={24} />
            </div>
            <h3 className="text-card-title">Story</h3>
            <p className="text-helper" style={{ marginTop: '4px' }}>Your raw narrative.</p>
          </NeuCard>

          {/* Facts */}
          <NeuCard className="col-span-1 flex flex-col items-center text-center z-10">
            <div className="neu-inset rounded-full flex items-center justify-center" style={{ width: '48px', height: '48px', color: 'var(--color-understand)', marginBottom: '16px' }}>
              <CheckCircle size={24} />
            </div>
            <h3 className="text-card-title">Facts</h3>
            <p className="text-helper" style={{ marginTop: '4px' }}>Extracted details.</p>
          </NeuCard>

          {/* Evidence */}
          <NeuCard className="col-span-1 flex flex-col items-center text-center z-10">
            <div className="neu-inset rounded-full flex items-center justify-center" style={{ width: '48px', height: '48px', color: 'var(--color-prepare)', marginBottom: '16px' }}>
              <Folder size={24} />
            </div>
            <h3 className="text-card-title">Evidence</h3>
            <p className="text-helper" style={{ marginTop: '4px' }}>Supporting docs.</p>
          </NeuCard>

          {/* Rights */}
          <NeuCard className="col-span-1 flex flex-col items-center text-center z-10">
            <div className="neu-inset rounded-full flex items-center justify-center" style={{ width: '48px', height: '48px', color: 'var(--color-prepare)', marginBottom: '16px' }}>
              <Gavel size={24} />
            </div>
            <h3 className="text-card-title">Rights</h3>
            <p className="text-helper" style={{ marginTop: '4px' }}>Legal standing.</p>
          </NeuCard>

          {/* Action */}
          <NeuCard className="col-span-1 flex flex-col items-center text-center z-10">
            <div className="neu-inset rounded-full flex items-center justify-center" style={{ width: '48px', height: '48px', color: 'var(--color-act)', marginBottom: '16px' }}>
              <Play size={24} />
            </div>
            <h3 className="text-card-title">Action</h3>
            <p className="text-helper" style={{ marginTop: '4px' }}>Strategic steps.</p>
          </NeuCard>

          {/* Complaint */}
          <div className="col-span-1 flex flex-col items-center text-center z-10 neu-document" style={{ padding: '24px', borderRadius: '16px' }}>
            <div className="rounded-full flex items-center justify-center" style={{ width: '48px', height: '48px', backgroundColor: 'var(--base-bg)', marginBottom: '16px' }}>
              <FileText size={24} />
            </div>
            <h3 className="text-card-title">Complaint</h3>
            <p className="text-helper" style={{ marginTop: '4px' }}>Formal document.</p>
          </div>

        </div>
      </section>

    </div>
  );
}
