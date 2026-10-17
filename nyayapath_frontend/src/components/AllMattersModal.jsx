import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FigmaIcon } from './ui/FigmaIcon';
import { useThemeLanguage } from '../context/ThemeLanguageContext';

export function AllMattersModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { language } = useThemeLanguage();

  if (!isOpen) return null;

  const matters = [
    {
      id: 'demo-matter-1',
      title: language === 'English' ? 'Defective television and denied warranty claim' : 'खराब टेलीविज़न और अस्वीकृत वारंटी दावा',
      forum: 'District Consumer Disputes Redressal Commission',
      updated: language === 'English' ? 'Updated today' : 'आज अपडेट किया गया',
      status: language === 'English' ? 'Draft in progress' : 'प्रारूप प्रगति पर है',
      readiness: 72,
      tag: 'CPA 2019'
    },
    {
      id: 'demo-matter-2',
      title: language === 'English' ? 'Cancelled airline flight without refund' : 'रद्द की गई उड़ान का टिकट रिफंड न मिलना',
      forum: 'State Consumer Commission (Delhi)',
      updated: language === 'English' ? 'Updated 3 days ago' : '3 दिन पहले अपडेट किया गया',
      status: language === 'English' ? 'Evidence ready' : 'साक्ष्य तैयार',
      readiness: 90,
      tag: 'Aviation / Service'
    },
    {
      id: 'demo-matter-3',
      title: language === 'English' ? 'Unauthorized payment deduction on UPI' : 'यूपीआई पर अनधिकृत भुगतान कटौती',
      forum: 'National Cyber Crime Reporting Portal / Ombudsman',
      updated: language === 'English' ? 'Filed' : 'दर्ज किया गया',
      status: language === 'English' ? 'Dispatched' : 'भेज दिया गया',
      readiness: 100,
      tag: 'Cyber Fraud'
    }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <span className="section-label">{language === 'English' ? 'Citizen Case Vault' : 'नागरिक केस वॉल्ट'}</span>
            <h3 style={{ margin: '4px 0 0', fontFamily: 'DM Serif Display, serif', fontSize: '22px' }}>
              {language === 'English' ? 'Your Legal Matters' : 'आपके कानूनी मामले'}
            </h3>
          </div>
          <button className="button" onClick={onClose} style={{ fontSize: '20px', padding: '4px 8px' }} aria-label="Close">
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {matters.map((matter) => (
            <div 
              key={matter.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                border: '1px solid var(--line)',
                borderRadius: '12px',
                background: 'var(--surface-soft)',
                gap: '16px',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: '240px' }}>
                <span className="matter-symbol" style={{ width: '38px', height: '38px', borderRadius: '10px' }}>
                  <FigmaIcon name="briefcase" size={18} />
                </span>
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                    <span className="matter-state" style={{ margin: 0 }}>{matter.status}</span>
                    <span style={{ fontSize: '10px', color: 'var(--muted)', background: 'var(--line)', padding: '2px 6px', borderRadius: '4px' }}>
                      {matter.tag}
                    </span>
                  </div>
                  <strong style={{ fontSize: '13px', display: 'block', color: 'var(--ink)' }}>{matter.title}</strong>
                  <small style={{ color: 'var(--muted)', fontSize: '11px' }}>{matter.forum} · {matter.updated}</small>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ minWidth: '80px', textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>Readiness</span>
                  <strong style={{ color: 'var(--success)', fontSize: '13px' }}>{matter.readiness}%</strong>
                </div>
                <button 
                  className="open-matter"
                  onClick={() => {
                    onClose();
                    navigate(`/guided-form/${matter.id}`);
                  }}
                >
                  {language === 'English' ? 'Open' : 'खोलें'} <FigmaIcon name="arrow" size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            className="secondary button"
            onClick={() => {
              onClose();
              navigate('/intake');
            }}
          >
            + {language === 'English' ? 'Start new complaint' : 'नई शिकायत शुरू करें'}
          </button>
          <button className="primary" onClick={onClose}>
            {language === 'English' ? 'Close' : 'बंद करें'}
          </button>
        </div>
      </div>
    </div>
  );
}
