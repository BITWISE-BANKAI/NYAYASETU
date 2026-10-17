import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NeuCard } from '../components/ui/NeuCard';
import { NeuButton } from '../components/ui/NeuButton';

export function Dashboard() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('stage2_extraction');
  const [complaintData, setComplaintData] = useState(null);

  useEffect(() => {
    let interval;
    if (status !== 'complete' && status !== 'error') {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`http://localhost:8000/api/v1/cases/${caseId}/status`);
          const data = await res.json();
          if (data.success) {
            setStatus(data.data.current_stage);
            if (data.data.current_stage === 'complete') {
              clearInterval(interval);
              // Fetch the final complaint
              const compRes = await fetch(`http://localhost:8000/api/v1/cases/${caseId}/complaint`);
              const compData = await compRes.json();
              setComplaintData(compData.data);
            }
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [caseId, status]);

  const stages = [
    { id: 'stage2_extraction', label: 'Extracting the facts' },
    { id: 'stage3_rag', label: 'Finding the relevant law' },
    { id: 'stage4_generation', label: 'Preparing your case' },
    { id: 'complete', label: 'Complete' }
  ];

  const getStageIndex = (s) => stages.findIndex(st => st.id === s);
  const currentIndex = getStageIndex(status);

  if (status !== 'complete' && status !== 'error') {
    return (
      <div className="container flex-col items-center justify-center animate-fade-in" style={{ gap: '32px', marginTop: '64px' }}>
        <h2 className="text-heading">Case Analysis in Progress...</h2>
        <NeuCard className="flex flex-col gap-3" style={{ width: '400px' }}>
          {stages.map((stage, idx) => (
            <div key={stage.id} className="flex items-center gap-2">
              <div className={`progress-node ${idx <= currentIndex ? 'active' : ''}`}>
                {idx < currentIndex ? '✓' : (idx === currentIndex ? '●' : '○')}
              </div>
              <span className={`text-body ${idx === currentIndex ? '' : 'text-helper'}`}>
                {stage.label}
              </span>
            </div>
          ))}
        </NeuCard>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="container animate-fade-in">
        <NeuCard>
          <h2 className="text-heading" style={{ color: 'var(--color-danger)' }}>Analysis Failed</h2>
          <p>We couldn't prepare the draft yet. Your case information is saved. Please try again.</p>
        </NeuCard>
      </div>
    );
  }

  const handleDownload = () => {
    if (!complaintData?.rendered_complaint) return;
    const blob = new Blob([complaintData.rendered_complaint], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NyayaSetu_Complaint_${caseId.slice(0, 8)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container flex-col animate-fade-in" style={{ gap: '32px' }}>
      
      {/* Consumer Bridge Banner */}
      <div className="neu-card flex justify-between items-center" style={{ padding: '20px 28px', borderRadius: '16px', background: '#eef1f6', boxShadow: 'var(--shadow-raised)', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--color-understand)' }}>
            ✦ NyayaSetu Consumer Bridge: Guided Form Experience
          </div>
          <p className="text-helper" style={{ margin: '4px 0 0 0' }}>
            Review extracted facts, confirm provenance, resolve conflicting claims, and ask AI for official legal explanations.
          </p>
        </div>
        <NeuButton variant="act" onClick={() => navigate(`/guided-form/${caseId}`)}>
          Open Guided Complaint Assistant →
        </NeuButton>
      </div>

      <div className="flex gap-4">
        
        {/* Left Column: Summary & Evidence */}
        <div className="flex-col gap-3" style={{ flex: 1 }}>
          <NeuCard>
            <h3 className="text-card-title">Evidence Strength</h3>
            <div style={{ textAlign: 'center', margin: '24px 0' }}>
              <div className="neu-inset" style={{ width: '120px', height: '120px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold', color: 'var(--color-act)' }}>
                {complaintData?.evidence_strength_score} / 100
              </div>
            </div>
            {complaintData?.missing_mandatory_fields?.length > 0 && (
              <div>
                <h4 className="text-body" style={{ color: 'var(--color-danger)' }}>What's Missing</h4>
                <ul className="text-helper">
                  {complaintData.missing_mandatory_fields.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}
          </NeuCard>

          <NeuCard>
            <h3 className="text-card-title">Action Roadmap</h3>
            <ol className="text-body" style={{ marginTop: '16px', paddingLeft: '20px' }}>
              <li>Contact the Seller</li>
              <li>National Consumer Helpline</li>
              <li style={{ color: 'var(--color-act)', fontWeight: 'bold' }}>Consumer Commission (Draft Ready)</li>
            </ol>
          </NeuCard>
        </div>

        {/* Right Column: Complaint Preview */}
        <div style={{ flex: 2 }}>
          <NeuCard>
            <div className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
              <h3 className="text-card-title">Review your complaint</h3>
              <NeuButton variant="primary" onClick={handleDownload}>
                Download Complaint
              </NeuButton>
            </div>
            <p className="text-helper" style={{ marginBottom: '24px' }}>
              This is a draft to help you file — not legal advice. Please review all details before submitting.
            </p>
            <div className="legal-document">
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
                {complaintData?.rendered_complaint}
              </pre>
            </div>
          </NeuCard>
        </div>

      </div>
    </div>
  );
}
