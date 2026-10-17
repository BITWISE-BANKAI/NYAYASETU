import React from 'react';
import { FigmaIcon } from './ui/FigmaIcon';
import { useThemeLanguage } from '../context/ThemeLanguageContext';

export function LegalSourceModal({ isOpen, onClose }) {
  const { language } = useThemeLanguage();
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
              <FigmaIcon name="book" size={24} />
            </span>
            <div>
              <span className="section-label">
                {language === 'English' ? 'Statutory Authority' : 'वैधानिक अधिकार'}
              </span>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'DM Serif Display, serif', fontSize: '22px' }}>
                {language === 'English' ? 'Territorial Jurisdiction for Consumers' : 'उपभोक्ताओं के लिए क्षेत्रीय अधिकार क्षेत्र'}
              </h3>
            </div>
          </div>
          <button 
            className="button" 
            onClick={onClose}
            style={{ fontSize: '20px', lineHeight: 1, padding: '4px 8px', borderRadius: '6px' }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '16px', background: 'var(--surface-soft)', borderRadius: '12px', border: '1px solid var(--line)', marginBottom: '20px' }}>
          <strong style={{ fontSize: '13px', display: 'block', marginBottom: '6px', color: 'var(--brand)' }}>
            Consumer Protection Act, 2019 · Section 34(2)(d)
          </strong>
          <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.6', color: 'var(--text)' }}>
            {language === 'English' ? (
              '“A complaint shall be instituted in a District Commission within the local limits of whose jurisdiction the complainant resides or personally works for gain.”'
            ) : (
              '“शिकायत उस जिला आयोग में दायर की जाएगी जिसके अधिकार क्षेत्र की स्थानीय सीमाओं के भीतर शिकायतकर्ता रहता है या व्यक्तिगत रूप से लाभ के लिए कार्य करता है।”'
            )}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px', lineHeight: '1.65', color: 'var(--text)' }}>
          <div>
            <strong style={{ color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
              {language === 'English' ? 'Why this matters to you:' : 'यह आपके लिए महत्वपूर्ण क्यों है:'}
            </strong>
            <p style={{ margin: 0 }}>
              {language === 'English' ? (
                'Under the old 1986 Act, consumers often had to travel to where the company\'s head office was situated (e.g., Bengaluru, Mumbai, or Delhi). Under the 2019 Act, you can file directly in your home district or through the official e-Daakhil / e-Jagriti digital portal.'
              ) : (
                'पुराने 1986 के अधिनियम के तहत, उपभोक्ताओं को अक्सर कंपनी के मुख्यालय (जैसे बेंगलुरु, मुंबई या दिल्ली) जाना पड़ता था। 2019 के नए कानून के अनुसार, आप सीधे अपने गृह जिले में या ऑनलाइन ई-दाखिल / ई-जागृति पोर्टल के माध्यम से शिकायत दर्ज कर सकते हैं।'
              )}
            </p>
          </div>

          <div>
            <strong style={{ color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
              {language === 'English' ? 'Pecuniary Limits (Claim Value):' : 'आर्थिक सीमाएं (दावा राशि):'}
            </strong>
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>District Commission:</strong> Up to ₹50 Lakhs (approx. ₹1 Crore under revised gazette notifications)</li>
              <li><strong>State Commission:</strong> ₹50 Lakhs to ₹2 Crores</li>
              <li><strong>National Commission (NCDRC):</strong> Above ₹2 Crores</li>
            </ul>
          </div>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="primary" onClick={onClose} style={{ minHeight: '38px', padding: '0 20px', borderRadius: '8px' }}>
            {language === 'English' ? 'Got it' : 'समझ गया'}
          </button>
        </div>
      </div>
    </div>
  );
}
