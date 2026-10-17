import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ArrowRight, AlertTriangle, 
  Download, Copy, RefreshCw, Scale, ShieldCheck
} from 'lucide-react';
import { NeuCard } from '../components/ui/NeuCard';
import { NeuButton } from '../components/ui/NeuButton';
import { FormStepper } from '../components/guided_form/FormStepper';
import { FieldWithProvenance } from '../components/guided_form/FieldWithProvenance';
import { RAGHelpDrawer } from '../components/guided_form/RAGHelpDrawer';
import { EvidenceChecklistSection } from '../components/guided_form/EvidenceChecklistSection';
import { ConflictResolverModal } from '../components/guided_form/ConflictResolverModal';

export function GuidedForm() {
  const { caseId } = useParams();
  const navigate = useNavigate();

  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(1);
  const [activeHelpField, setActiveHelpField] = useState(null);
  const [activeConflict, setActiveConflict] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [drafting, setDrafting] = useState(false);
  const [draftResult, setDraftResult] = useState(null);
  const [copied, setCopied] = useState(false);

  // 1. Fetch form state
  const loadState = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/cases/${caseId}/guided-form`);
      const data = await res.json();
      if (data.success) {
        setState(data.data);
      }
    } catch (err) {
      console.error('Failed to load guided form state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadState();
  }, [caseId]);

  // 2. Field actions
  const handleConfirmField = async (fieldId) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/cases/${caseId}/guided-form/fields/${fieldId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_confirmed: true })
      });
      const json = await res.json();
      if (json.success) setState(json.data);
    } catch (e) {
      console.error('Error confirming field:', e);
    }
  };

  const handleSaveValue = async (fieldId, newValue) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/cases/${caseId}/guided-form/fields/${fieldId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newValue, user_confirmed: true })
      });
      const json = await res.json();
      if (json.success) setState(json.data);
    } catch (e) {
      console.error('Error saving field value:', e);
    }
  };

  const handleMarkUnknown = async (fieldId) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/cases/${caseId}/guided-form/fields/${fieldId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_unknown: true })
      });
      const json = await res.json();
      if (json.success) setState(json.data);
    } catch (e) {
      console.error('Error marking unknown:', e);
    }
  };

  // 3. Conflict resolution
  const handleResolveConflict = async (conflictId, fieldId, choice, resolvedValue, notes) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/cases/${caseId}/guided-form/clarifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conflict_id: conflictId,
          field_id: fieldId,
          resolution_choice: choice,
          resolved_value: resolvedValue,
          notes: notes
        })
      });
      const json = await res.json();
      if (json.success) setState(json.data);
    } catch (e) {
      console.error('Error resolving conflict:', e);
    }
  };

  // 4. Form validation
  const runValidation = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/cases/${caseId}/guided-form/validate`, {
        method: 'POST'
      });
      const json = await res.json();
      if (json.success) setValidationResult(json.data);
    } catch (e) {
      console.error('Validation error:', e);
    }
  };

  useEffect(() => {
    if (activeStep === 8 && state) {
      runValidation();
    }
  }, [activeStep, state]);

  // 5. Generate draft
  const handleGenerateDraft = async () => {
    setDrafting(true);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/cases/${caseId}/guided-form/draft`, {
        method: 'POST'
      });
      const json = await res.json();
      if (json.success) {
        setDraftResult(json.data);
      } else {
        alert(json.detail || 'Could not generate draft. Please address blocking errors.');
      }
    } catch (e) {
      console.error('Draft generation error:', e);
      alert('Error triggering legal drafter.');
    } finally {
      setDrafting(false);
    }
  };

  const handleCopyComplaint = () => {
    if (draftResult?.rendered_complaint) {
      navigator.clipboard.writeText(draftResult.rendered_complaint);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadComplaint = () => {
    if (!draftResult?.rendered_complaint) return;
    const blob = new Blob([draftResult.rendered_complaint], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NyayaSetu_Consumer_Complaint_${caseId.slice(0, 8)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="container flex-col items-center justify-center animate-fade-in" style={{ padding: '64px 0' }}>
        <RefreshCw size={32} style={{ color: 'var(--color-understand)', animation: 'spin 1s linear infinite' }} />
        <p className="text-body" style={{ marginTop: '16px' }}>Loading case facts and guidance...</p>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="container animate-fade-in">
        <NeuCard>
          <h2 className="text-heading" style={{ color: 'var(--color-danger)' }}>Case Not Found</h2>
          <p>Please initiate an intake narrative first.</p>
          <NeuButton onClick={() => navigate('/intake')}>Go to Intake</NeuButton>
        </NeuCard>
      </div>
    );
  }

  const currentSection = state.sections[activeStep - 1] || state.sections[0];
  const activeSectionConflicts = state.conflicts.filter(c => !c.is_resolved);

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '1280px' }}>
      
      {/* Top Header & Context Badges */}
      <div className="flex justify-between items-center" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="badge-pill" style={{ background: '#e8f0fe', color: 'var(--color-understand)' }}>
              Case #{String(caseId).slice(0, 8)}
            </span>
            <span className="badge-pill" style={{ background: '#e6f4ea', color: 'var(--color-act)' }}>
              <Scale size={13} /> Consumer Electronics Warranty Dispute
            </span>
          </div>
          <h2 className="text-heading" style={{ margin: '8px 0 0 0' }}>
            Guided Complaint Assistant
          </h2>
        </div>

        {/* Progress summary */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-helper" style={{ fontWeight: '700' }}>Form Completion</span>
            <span className="text-card-title" style={{ color: 'var(--color-act)', fontSize: '16px' }}>
              {state.completion_percentage}%
            </span>
          </div>
          <NeuButton onClick={() => navigate(`/dashboard/${caseId}`)} style={{ fontSize: '13px' }}>
            View Dashboard
          </NeuButton>
        </div>
      </div>

      {/* 8-Step Navigation Stepper */}
      <FormStepper 
        sections={state.sections} 
        currentStep={activeStep} 
        onSelectStep={(step) => setActiveStep(step)} 
      />

      {/* Main Grid: Form Canvas (Left 8 cols) + Contextual Assistance (Right 4 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3" style={{ alignItems: 'start' }}>
        
        {/* Left Column: Active Form Section */}
        <div style={{ gridColumn: 'span 8' }}>
          
          <div className="neu-card" style={{ padding: '28px', borderRadius: '16px', background: 'var(--base-bg)', boxShadow: 'var(--shadow-raised)', marginBottom: '24px' }}>
            
            {/* Section Title */}
            <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--shadow-dark)', paddingBottom: '16px' }}>
              <div className="text-helper" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-understand)', fontWeight: '700' }}>
                Step {activeStep} of {state.total_steps}
              </div>
              <h3 className="text-heading" style={{ margin: '4px 0 6px 0', fontSize: '20px' }}>
                {currentSection.title}
              </h3>
              <p className="text-helper" style={{ margin: 0 }}>
                {currentSection.description}
              </p>
            </div>

            {/* Active Conflicts Card */}
            {activeSectionConflicts.length > 0 && activeStep <= 6 && (
              <div className="neu-card" style={{ padding: '16px', borderRadius: '12px', background: '#fff1f0', border: '1px solid #ffa39e', marginBottom: '20px' }}>
                <div className="flex items-center gap-2" style={{ color: 'var(--color-danger)', fontWeight: '700', marginBottom: '6px' }}>
                  <AlertTriangle size={16} /> Contradiction Detected in Records
                </div>
                <p className="text-helper" style={{ margin: '0 0 12px 0', color: '#434343' }}>
                  {activeSectionConflicts[0].description}
                </p>
                <NeuButton 
                  onClick={() => setActiveConflict(activeSectionConflicts[0])}
                  style={{ fontSize: '12px', padding: '6px 14px', color: 'var(--color-danger)' }}
                >
                  ⚡ Resolve Contradiction
                </NeuButton>
              </div>
            )}

            {/* Fields List */}
            {activeStep === 8 ? (
              // Step 8: Evidence Checklist & Final Review
              <div>
                <EvidenceChecklistSection 
                  checklist={state.evidence_checklist} 
                  onUpdateStatus={async (itemId, newStatus) => {
                    const updated = state.evidence_checklist.map(it => it.item_id === itemId ? { ...it, status: newStatus } : it);
                    setState({ ...state, evidence_checklist: updated });
                  }}
                />

                {/* Validation Results */}
                {validationResult && (
                  <div style={{ marginTop: '32px', borderTop: '1px solid var(--shadow-dark)', paddingTop: '20px' }}>
                    <h4 className="text-card-title" style={{ fontSize: '16px', marginBottom: '12px' }}>
                      Statutory Jurisdiction & Consistency Check
                    </h4>

                    {validationResult.pecuniary_jurisdiction && (
                      <div className="neu-inset" style={{ padding: '16px', borderRadius: '12px', marginBottom: '16px', background: '#f6ffed', border: '1px solid #b7eb8f' }}>
                        <div style={{ fontWeight: '700', color: '#389e0d', fontSize: '14px', marginBottom: '4px' }}>
                          ✓ Pecuniary Forum: {validationResult.pecuniary_jurisdiction.forum_name}
                        </div>
                        <div className="text-helper" style={{ color: '#262626', fontSize: '12px' }}>
                          {validationResult.pecuniary_jurisdiction.statutory_rule}
                        </div>
                      </div>
                    )}

                    {validationResult.blocking_errors.length > 0 && (
                      <div className="neu-inset" style={{ padding: '16px', borderRadius: '12px', marginBottom: '16px', background: '#fff2f0', border: '1px solid #ffccc7' }}>
                        <div style={{ fontWeight: '700', color: '#cf1322', fontSize: '13px', marginBottom: '6px' }}>
                          Please resolve the following before draft finalization:
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#595959' }}>
                          {validationResult.blocking_errors.map((e, idx) => (
                            <li key={idx}>{e.message}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {validationResult.warnings.length > 0 && (
                      <div className="neu-inset" style={{ padding: '16px', borderRadius: '12px', marginBottom: '16px', background: '#fffbe6', border: '1px solid #ffe58f' }}>
                        <div style={{ fontWeight: '700', color: '#d48806', fontSize: '13px', marginBottom: '6px' }}>
                          Notice / Procedural Warnings:
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#595959' }}>
                          {validationResult.warnings.map((w, idx) => (
                            <li key={idx}>{w.message}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Draft Generator CTA */}
                <div style={{ marginTop: '24px', textAlign: 'center' }}>
                  <NeuButton 
                    variant="act" 
                    onClick={handleGenerateDraft} 
                    disabled={drafting || (validationResult && !validationResult.is_valid_for_drafting)}
                    style={{ fontSize: '15px', padding: '14px 28px' }}
                  >
                    {drafting ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw size={16} className="animate-spin" /> Drafting Complaint via Local Legal Pipeline...
                      </span>
                    ) : (
                      '⚖️ Generate Court-Ready Complaint Petition'
                    )}
                  </NeuButton>
                  <p className="text-helper" style={{ fontSize: '12px', marginTop: '8px' }}>
                    Reuses NyayaSetu structured legal slots, consistency gate, and Jinja2 court skeleton.
                  </p>
                </div>

                {/* Generated Complaint Preview */}
                {draftResult && (
                  <div style={{ marginTop: '32px' }} className="animate-fade-in">
                    <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
                      <h4 className="text-card-title">Generated Court Petition Preview</h4>
                      <div className="flex gap-2">
                        <NeuButton onClick={handleCopyComplaint} style={{ fontSize: '12px' }}>
                          {copied ? <span style={{ color: 'var(--color-act)' }}>✓ Copied</span> : <span className="flex items-center gap-1"><Copy size={13} /> Copy</span>}
                        </NeuButton>
                        <NeuButton variant="primary" onClick={handleDownloadComplaint} style={{ fontSize: '12px' }}>
                          <span className="flex items-center gap-1"><Download size={13} /> Download .TXT</span>
                        </NeuButton>
                      </div>
                    </div>

                    <div className="legal-document" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                      <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0, fontSize: '14px' }}>
                        {draftResult.rendered_complaint}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Regular Sections: Field List
              <div>
                {currentSection.fields.map(field => (
                  <FieldWithProvenance 
                    key={field.field_id}
                    field={field}
                    onConfirm={handleConfirmField}
                    onSaveValue={handleSaveValue}
                    onMarkUnknown={handleMarkUnknown}
                    onOpenHelp={(f) => setActiveHelpField({ ...f, section_id: currentSection.section_id })}
                  />
                ))}
              </div>
            )}

            {/* Navigation Controls */}
            <div className="flex justify-between items-center" style={{ marginTop: '32px', borderTop: '1px solid var(--shadow-dark)', paddingTop: '20px' }}>
              <NeuButton 
                onClick={() => setActiveStep(prev => Math.max(1, prev - 1))}
                disabled={activeStep === 1}
              >
                <ArrowLeft size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Previous
              </NeuButton>

              <div className="text-helper" style={{ fontSize: '13px' }}>
                All edits saved automatically to case file
              </div>

              {activeStep < state.total_steps ? (
                <NeuButton 
                  variant="primary" 
                  onClick={() => setActiveStep(prev => Math.min(state.total_steps, prev + 1))}
                >
                  Continue to Next Section <ArrowRight size={16} style={{ marginLeft: '6px', verticalAlign: 'middle' }} />
                </NeuButton>
              ) : (
                <NeuButton 
                  variant="act" 
                  onClick={() => navigate(`/dashboard/${caseId}`)}
                >
                  Done • Return to Dashboard
                </NeuButton>
              )}
            </div>

          </div>

        </div>

        {/* Right Column: Contextual Legal Grounding Drawer / Sidebar */}
        <div style={{ gridColumn: 'span 4' }}>
          {activeHelpField ? (
            <RAGHelpDrawer 
              activeField={activeHelpField}
              caseId={caseId}
              onClose={() => setActiveHelpField(null)}
            />
          ) : (
            // Default Sidebar Summary
            <div className="flex flex-col gap-3" style={{ position: 'sticky', top: '90px' }}>
              
              <NeuCard>
                <div className="flex items-center gap-2" style={{ marginBottom: '12px' }}>
                  <ShieldCheck size={18} style={{ color: 'var(--color-act)' }} />
                  <h4 className="text-card-title" style={{ fontSize: '15px', margin: 0 }}>
                    Legal RAG Guidance
                  </h4>
                </div>
                <p className="text-helper" style={{ fontSize: '13px', margin: '0 0 16px 0' }}>
                  Click <strong>"Explain"</strong> next to any form field to retrieve official citations from the Consumer Protection Act, 2019 and e-Jagriti filing guidelines.
                </p>
                <div className="neu-inset" style={{ padding: '12px', borderRadius: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  💡 <em>Every explanation is grounded in indexed government gazette passages.</em>
                </div>
              </NeuCard>

              <NeuCard>
                <h4 className="text-card-title" style={{ fontSize: '15px', marginBottom: '8px' }}>
                  Opposite Parties in Scope
                </h4>
                <p className="text-helper" style={{ fontSize: '12px', marginBottom: '12px' }}>
                  NyayaSetu maintains multi-entity separation to avoid generic party claims:
                </p>
                <ul className="text-helper" style={{ paddingLeft: '16px', margin: 0, fontSize: '12px' }}>
                  <li><strong>Manufacturer</strong> (Sec 84 liability)</li>
                  <li><strong>Marketplace</strong> (Rules 4 & 5 duties)</li>
                  <li><strong>Registered Merchant</strong> (Tax invoice)</li>
                  <li><strong>Authorized Service Center</strong> (Sec 85)</li>
                </ul>
              </NeuCard>

            </div>
          )}
        </div>

      </div>

      {/* Modal for Conflict Resolution */}
      {activeConflict && (
        <ConflictResolverModal 
          conflict={activeConflict}
          onResolve={handleResolveConflict}
          onClose={() => setActiveConflict(null)}
        />
      )}

    </div>
  );
}
