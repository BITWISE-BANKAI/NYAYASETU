import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NeuCard } from '../components/ui/NeuCard';
import { NeuButton } from '../components/ui/NeuButton';
import { FigmaIcon } from '../components/ui/FigmaIcon';
import { Copy, Download, RefreshCw, Check, ArrowRight, Edit3, User, ShoppingBag, Building, FileText, CheckCircle2 } from 'lucide-react';

export function Dashboard() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [complaintData, setComplaintData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let interval;
    let isMounted = true;

    const fetchComplaint = async () => {
      try {
        const compRes = await fetch(`http://localhost:8000/api/v1/cases/${caseId}/complaint`);
        const compData = await compRes.json();
        if (compData.success && isMounted) {
          setComplaintData(compData.data);
        }
      } catch (e) {
        console.error("Complaint fetch error", e);
      }
    };

    const pollStatus = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/cases/${caseId}/status`);
        const data = await res.json();
        if (data.success && isMounted) {
          const currentStage = data.data.current_stage;
          setStatus(currentStage);
          if (currentStage === 'complete') {
            if (interval) clearInterval(interval);
            fetchComplaint();
          }
        }
      } catch (e) {
        console.error("Status polling error", e);
      }
    };

    // Immediate first check
    pollStatus();
    interval = setInterval(pollStatus, 2500);

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [caseId]);

  const stages = [
    { id: 'stage2_extraction', label: 'Extracting facts & transaction details' },
    { id: 'stage3_rag', label: 'Retrieving parent statutes & Consumer Protection Act, 2019' },
    { id: 'stage4_generation', label: 'Drafting structured legal petition via NyayaDrafter' },
    { id: 'complete', label: 'Complaint Ready for Filing' }
  ];

  const getStageIndex = (s) => {
    if (s === 'complete') return 3;
    if (s === 'stage4_generation') return 2;
    if (s === 'stage3_rag') return 1;
    return 0;
  };
  const currentIndex = getStageIndex(status);

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

  const handleCopy = () => {
    if (!complaintData?.rendered_complaint) return;
    navigator.clipboard.writeText(complaintData.rendered_complaint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Extract facts and guided form values
  const facts = complaintData?.facts || {};
  const guidedState = complaintData?.guided_form_state || {};
  const formFields = {};
  if (guidedState.sections) {
    guidedState.sections.forEach(sec => {
      sec.fields.forEach(f => {
        formFields[f.field_id] = f;
      });
    });
  }

  const getFieldVal = (fieldId, fallbackKey) => {
    if (formFields[fieldId]?.value !== undefined && formFields[fieldId]?.value !== null && String(formFields[fieldId]?.value).trim() !== '') {
      return formFields[fieldId].value;
    }
    if (facts[fallbackKey || fieldId] !== undefined && facts[fallbackKey || fieldId] !== null) {
      return facts[fallbackKey || fieldId];
    }
    return null;
  };

  const isFieldUserEdited = (fieldId) => {
    const f = formFields[fieldId];
    return f && (f.user_confirmed || f.provenance?.kind === 'user_input');
  };

  const complainantName = getFieldVal('complainant_name');
  const complainantAddress = getFieldVal('complainant_address');
  const complainantPhone = getFieldVal('complainant_phone');
  const complainantEmail = getFieldVal('complainant_email');
  const complainantDistrict = getFieldVal('complainant_district', 'complainant_city');
  const productOrService = getFieldVal('product_or_service');
  const transactionAmount = getFieldVal('transaction_amount_inr');
  const purchaseDate = getFieldVal('purchase_or_incident_date');
  const invoiceNumber = getFieldVal('invoice_number');
  const manufacturerName = getFieldVal('manufacturer_name');
  const ecommercePlatform = getFieldVal('ecommerce_platform');
  const merchantSeller = getFieldVal('merchant_seller_name');
  const serviceCenter = getFieldVal('service_center_name');
  const issueSummary = getFieldVal('issue_summary_neutral');
  const sellerResponse = getFieldVal('seller_response_summary');

  if (status !== 'complete' && status !== 'error') {
    return (
      <div className="container flex-col items-center justify-center animate-fade-in" style={{ gap: '32px', padding: '64px 0' }}>
        <div style={{ textAlign: 'center' }}>
          <span className="overline" style={{ justifyContent: 'center', marginBottom: '8px' }}>
            <span /> Automated Legal Drafting
          </span>
          <h2 className="text-display" style={{ margin: '8px 0' }}>Analyzing Case & Drafting Petition...</h2>
          <p className="text-helper">Our local legal pipeline is grounding your narrative in statutory provisions.</p>
        </div>

        <div className="intake-card" style={{ maxWidth: '520px', width: '100%', padding: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {stages.map((stage, idx) => (
              <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div 
                  className={`step-node ${idx <= currentIndex ? (idx === currentIndex ? 'active' : 'completed') : ''}`}
                  style={{ width: '32px', height: '32px' }}
                >
                  {idx < currentIndex ? '✓' : (idx === currentIndex ? '●' : '○')}
                </div>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: idx === currentIndex ? 700 : 500, color: idx === currentIndex ? 'var(--ink)' : 'var(--muted)' }}>
                    {stage.label}
                  </span>
                  {idx === currentIndex && (
                    <div style={{ fontSize: '11px', color: 'var(--brand)', marginTop: '2px' }}>
                      Processing in background...
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '28px', borderTop: '1px solid var(--line)', paddingTop: '20px', textAlign: 'center' }}>
            <NeuButton onClick={() => navigate(`/guided-form/${caseId}`)}>
              Open Interactive Guided Form Instead <ArrowRight size={14} />
            </NeuButton>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="container animate-fade-in" style={{ padding: '48px 0' }}>
        <div className="intake-card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '40px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(208, 83, 83, 0.12)', color: '#c0433a', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
            <FigmaIcon name="shield" size={24} />
          </div>
          <h2 className="text-heading" style={{ color: 'var(--color-danger)' }}>Need Clarification to Finalize Draft</h2>
          <p className="text-body" style={{ margin: '12px 0 24px' }}>
            Some essential facts or conflicting details need your verification before court filing.
          </p>
          <NeuButton variant="primary" onClick={() => navigate(`/guided-form/${caseId}`)}>
            Open Guided Form to Verify Details <ArrowRight size={16} />
          </NeuButton>
        </div>
      </div>
    );
  }

  return (
    <div className="container flex-col animate-fade-in" style={{ gap: '28px', padding: '36px 0 64px' }}>
      
      {/* Top Banner */}
      <div className="intake-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '24px 32px' }}>
        <div>
          <span className="overline" style={{ marginBottom: '4px' }}>
            <span /> Legal Bridge
          </span>
          <h3 style={{ margin: '4px 0', fontFamily: 'DM Serif Display, serif', fontSize: '22px' }}>
            NyayaSetu Consumer Bridge: Petition Ready
          </h3>
          <p className="text-helper" style={{ margin: 0 }}>
            Your draft has been generated under Section 35 of the Consumer Protection Act, 2019.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <NeuButton onClick={() => navigate(`/guided-form/${caseId}`)}>
            Review & Edit in Guided Form →
          </NeuButton>
        </div>
      </div>

      {/* Structured Complaint Details & Manually Added Information */}
      <div className="matter-panel" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span className="section-label">Verified Case Record</span>
            <h3 style={{ margin: '4px 0 0', fontFamily: 'DM Serif Display, serif', fontSize: '22px' }}>
              Complaint Particulars & Manually Entered Facts
            </h3>
            <p className="text-helper" style={{ margin: '4px 0 0', fontSize: '13px' }}>
              These parameters are synchronized with the court petition and statutory legal slots.
            </p>
          </div>
          <NeuButton onClick={() => navigate(`/guided-form/${caseId}`)} style={{ fontSize: '13px' }}>
            <Edit3 size={14} /> Edit in Guided Form
          </NeuButton>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* Card 1: Complainant Information */}
          <div className="neu-inset" style={{ padding: '18px', borderRadius: '12px', background: 'var(--surface-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--brand)', marginBottom: '12px', fontSize: '14px' }}>
              <User size={16} /> Complainant Details
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div>
                <span className="text-helper" style={{ display: 'block', fontSize: '11px' }}>Full Name</span>
                <strong>{complainantName || <span style={{ color: 'var(--color-danger)' }}>Not Provided</span>}</strong>
                {isFieldUserEdited('complainant_name') && <span className="badge-pill badge-confirmed" style={{ marginLeft: '6px', fontSize: '10px' }}>✓ User Verified</span>}
              </div>
              <div>
                <span className="text-helper" style={{ display: 'block', fontSize: '11px' }}>Postal Address</span>
                <span>{complainantAddress || <span style={{ color: 'var(--color-danger)' }}>Not Provided</span>}</span>
                {isFieldUserEdited('complainant_address') && <span className="badge-pill badge-confirmed" style={{ marginLeft: '6px', fontSize: '10px' }}>✓ User Verified</span>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <span className="text-helper" style={{ display: 'block', fontSize: '11px' }}>Contact Phone</span>
                  <span>{complainantPhone || '—'}</span>
                </div>
                <div>
                  <span className="text-helper" style={{ display: 'block', fontSize: '11px' }}>Email</span>
                  <span>{complainantEmail || '—'}</span>
                </div>
              </div>
              <div>
                <span className="text-helper" style={{ display: 'block', fontSize: '11px' }}>District / Forum City</span>
                <span>{complainantDistrict || 'District Commission'}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Transaction & Product Particulars */}
          <div className="neu-inset" style={{ padding: '18px', borderRadius: '12px', background: 'var(--surface-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--brand)', marginBottom: '12px', fontSize: '14px' }}>
              <ShoppingBag size={16} /> Disputed Goods / Transaction
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div>
                <span className="text-helper" style={{ display: 'block', fontSize: '11px' }}>Product / Service</span>
                <strong>{productOrService || 'Consumer Electronics Device'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <span className="text-helper" style={{ display: 'block', fontSize: '11px' }}>Consideration Paid</span>
                  <strong style={{ color: 'var(--brand)' }}>
                    {transactionAmount ? `₹ ${Number(transactionAmount).toLocaleString('en-IN')}` : '—'}
                  </strong>
                </div>
                <div>
                  <span className="text-helper" style={{ display: 'block', fontSize: '11px' }}>Purchase / Incident Date</span>
                  <span>{purchaseDate || '—'}</span>
                </div>
              </div>
              <div>
                <span className="text-helper" style={{ display: 'block', fontSize: '11px' }}>Tax Invoice / Bill No.</span>
                <span>{invoiceNumber || <span style={{ fontStyle: 'italic', color: 'var(--muted)' }}>Not Available / Unknown</span>}</span>
                {isFieldUserEdited('invoice_number') && <span className="badge-pill badge-confirmed" style={{ marginLeft: '6px', fontSize: '10px' }}>✓ User Verified</span>}
              </div>
            </div>
          </div>

          {/* Card 3: Opposite Parties */}
          <div className="neu-inset" style={{ padding: '18px', borderRadius: '12px', background: 'var(--surface-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--brand)', marginBottom: '12px', fontSize: '14px' }}>
              <Building size={16} /> Commercial Entities / Opposite Parties
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div>
                <span className="text-helper" style={{ display: 'block', fontSize: '11px' }}>Manufacturer / Brand</span>
                <strong>{manufacturerName || '—'}</strong>
              </div>
              <div>
                <span className="text-helper" style={{ display: 'block', fontSize: '11px' }}>E-Commerce Marketplace</span>
                <span>{ecommercePlatform || '—'}</span>
              </div>
              <div>
                <span className="text-helper" style={{ display: 'block', fontSize: '11px' }}>Merchant Seller / Service Center</span>
                <span>{[merchantSeller, serviceCenter].filter(Boolean).join(' / ') || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Grievance Core & Relief */}
        <div style={{ marginTop: '16px', padding: '14px 18px', borderRadius: '10px', background: 'var(--surface)', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--brand)' }}>
            <FileText size={14} /> Grievance Core & Defect Allegations
          </div>
          <div style={{ fontSize: '13px', color: 'var(--ink)' }}>
            <strong>Defect / Deficiency: </strong>
            {issueSummary || 'Display panel failure within warranty period with denial of repair.'}
          </div>
          {sellerResponse && (
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
              <strong>Opposite Party Position: </strong>
              {sellerResponse}
            </div>
          )}
        </div>
      </div>

      <div className="services-layout" style={{ gridTemplateColumns: 'minmax(280px, 0.85fr) minmax(400px, 1.45fr)', gap: '24px' }}>
        
        {/* Left Column: Summary & Evidence */}
        <div className="flex-col gap-3">
          <div className="matter-panel" style={{ padding: '24px' }}>
            <span className="section-label">Evidence Verification</span>
            <h3 style={{ margin: '8px 0 16px', fontFamily: 'DM Serif Display, serif', fontSize: '20px' }}>
              Evidence Strength
            </h3>
            
            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <div style={{ 
                width: '110px', 
                height: '110px', 
                borderRadius: '50%', 
                border: '3px solid var(--brand)',
                background: 'var(--surface-soft)',
                display: 'inline-grid', 
                placeItems: 'center', 
                fontSize: '28px', 
                fontWeight: 800, 
                color: 'var(--brand)' 
              }}>
                {complaintData?.evidence_strength_score || 75}/100
              </div>
              <small style={{ display: 'block', marginTop: '8px', color: 'var(--muted)', fontSize: '11px' }}>
                High evidentiary standing for consumer forum
              </small>
            </div>

            {complaintData?.missing_mandatory_fields?.length > 0 && (
              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(208, 83, 83, 0.08)', borderRadius: '8px', border: '1px solid rgba(208, 83, 83, 0.2)' }}>
                <h4 style={{ color: 'var(--color-danger)', fontSize: '12px', margin: '0 0 6px 0' }}>Recommended Additions</h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', color: 'var(--text)' }}>
                  {complaintData.missing_mandatory_fields.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}
          </div>

          <aside className="source-panel" style={{ padding: '24px' }}>
            <span className="section-label">Next Action Steps</span>
            <h3 style={{ margin: '8px 0 16px', fontFamily: 'DM Serif Display, serif', fontSize: '20px' }}>
              Action Roadmap
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span className="step-node completed" style={{ width: '24px', height: '24px', fontSize: '11px' }}>1</span>
                <span>Send Formal Legal Notice / Letter</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span className="step-node completed" style={{ width: '24px', height: '24px', fontSize: '11px' }}>2</span>
                <span>Register with National Consumer Helpline (1915)</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontWeight: 700, color: 'var(--brand)' }}>
                <span className="step-node active" style={{ width: '24px', height: '24px', fontSize: '11px' }}>3</span>
                <span>File Petition on e-Daakhil / District Commission</span>
              </div>
            </div>
          </aside>
        </div>

        {/* Right Column: Complaint Preview */}
        <div>
          <div className="matter-panel" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span className="section-label">Official Legal Document</span>
                <h3 style={{ margin: '4px 0 0', fontFamily: 'DM Serif Display, serif', fontSize: '22px' }}>
                  Court-Ready Complaint Petition
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="button open-matter" onClick={handleCopy}>
                  {copied ? <><Check size={14} color="var(--success)" /> Copied</> : <><Copy size={14} /> Copy</>}
                </button>
                <button className="primary button" onClick={handleDownload}>
                  <Download size={14} /> Download .TXT
                </button>
              </div>
            </div>

            <p className="text-helper" style={{ marginBottom: '16px', fontSize: '12px' }}>
              Formatted for the District Consumer Disputes Redressal Commission under Section 35, CPA 2019. Review all fields before submission.
            </p>

            <div className="legal-document" style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0, fontSize: '13px', lineHeight: '1.7', color: 'var(--ink)' }}>
                {complaintData?.rendered_complaint || 'Loading drafted complaint...'}
              </pre>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
