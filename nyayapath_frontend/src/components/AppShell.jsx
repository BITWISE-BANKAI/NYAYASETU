import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { FigmaIcon } from './ui/FigmaIcon';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { LegalSourceModal } from './LegalSourceModal';
import { AllMattersModal } from './AllMattersModal';

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme, language, toggleLanguage, t } = useThemeLanguage();

  const [profileOpen, setProfileOpen] = useState(false);
  const [mattersOpen, setMattersOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const profileRef = useRef(null);

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavClick = (sectionId) => {
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="site-shell">
      {/* Top Security & Helplines Utility Bar */}
      <div className="utility-bar">
        <div className="container utility-inner">
          <span>
            <FigmaIcon name="shield" size={14} />
            {t('utilityPrivate')}
          </span>
          <span>{t('utilityUrgent')}</span>
        </div>
      </div>

      {/* Main Sticky Blurred Header */}
      <header className="main-header">
        <div className="container header-inner">
          <button 
            className="button brand" 
            onClick={() => {
              navigate('/');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <span className="brand-symbol">
              <FigmaIcon name="scale" size={22} />
            </span>
            <span>
              <strong>NyayaSetu</strong>
              <small>{t('brandTagline')}</small>
            </span>
          </button>

          <nav aria-label="Primary navigation">
            <button 
              className={`button nav-link ${location.pathname === '/' ? 'active' : ''}`}
              onClick={() => handleNavClick('hero-intake')}
            >
              {t('navLegalHelp')}
            </button>
            <button 
              className="button nav-link"
              onClick={() => setMattersOpen(true)}
            >
              {t('navMyMatters')} <span className="count">2</span>
            </button>
            <button 
              className="button nav-link"
              onClick={() => handleNavClick('journey-section')}
            >
              {t('navHowItWorks')}
            </button>
            <button 
              className="button nav-link"
              onClick={() => handleNavClick('services-section')}
            >
              {t('navResources')}
            </button>
          </nav>

          <div className="header-actions">
            {/* Language Switcher */}
            <button 
              className="button language" 
              onClick={toggleLanguage}
              title="Toggle English / हिंदी"
            >
              {language} <FigmaIcon name="chevron" size={13} />
            </button>

            {/* Light / Dark Mode Toggle */}
            <button
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              className="button theme-toggle"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              <span className="theme-thumb">
                <FigmaIcon name={theme === 'light' ? 'sun' : 'moon'} size={14} />
              </span>
            </button>

            {/* Profile Menu */}
            <div style={{ position: 'relative' }} ref={profileRef}>
              <button 
                className="button account" 
                aria-label="Open profile"
                onClick={() => setProfileOpen(!profileOpen)}
                title="Citizen Profile"
              >
                <FigmaIcon name="user" size={17} />
              </button>

              {profileOpen && (
                <div className="profile-menu">
                  <div style={{ paddingBottom: '8px', borderBottom: '1px solid var(--line)', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '13px', display: 'block', color: 'var(--ink)' }}>Arjun Kumar</strong>
                    <small style={{ color: 'var(--muted)', fontSize: '11px' }}>arjun.citizen@gov.in</small>
                  </div>
                  <button 
                    className="button" 
                    style={{ width: '100%', textAlign: 'left', padding: '6px 0', fontSize: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}
                    onClick={() => {
                      setProfileOpen(false);
                      setMattersOpen(true);
                    }}
                  >
                    <FigmaIcon name="briefcase" size={14} /> {t('navMyMatters')}
                  </button>
                  <button 
                    className="button" 
                    style={{ width: '100%', textAlign: 'left', padding: '6px 0', fontSize: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}
                    onClick={() => {
                      setProfileOpen(false);
                      setSourceOpen(true);
                    }}
                  >
                    <FigmaIcon name="book" size={14} /> {t('verifiedSourceLabel')}
                  </button>
                  <div style={{ borderTop: '1px solid var(--line)', marginTop: '8px', paddingTop: '8px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--success)', fontWeight: 700 }}>
                      ● Verified Citizen Account
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Outlet */}
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      {/* Cohesive Figma Footer */}
      <footer>
        <div className="container footer-inner">
          <div className="footer-brand">
            <FigmaIcon name="scale" size={18} />
            <strong>NyayaSetu</strong>
          </div>
          <p>{t('footerDisclaimer')} {t('footerTagline')}</p>
          <div>
            <button className="button" onClick={() => setSourceOpen(true)}>
              {language === 'English' ? 'Legal Library' : 'कानूनी पुस्तकालय'}
            </button>
            <button 
              className="button" 
              onClick={() => window.open('https://edaakhil.nic.in/', '_blank', 'noreferrer')}
            >
              e-Daakhil
            </button>
            <button 
              className="button"
              onClick={() => window.open('https://consumerhelpline.gov.in/', '_blank', 'noreferrer')}
            >
              NCH (1915)
            </button>
          </div>
        </div>
      </footer>

      {/* Reusable Modals */}
      <LegalSourceModal isOpen={sourceOpen} onClose={() => setSourceOpen(false)} />
      <AllMattersModal isOpen={mattersOpen} onClose={() => setMattersOpen(false)} />
    </div>
  );
}
