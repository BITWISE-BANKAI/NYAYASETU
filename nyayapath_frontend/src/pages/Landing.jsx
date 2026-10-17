import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FigmaIcon } from '../components/ui/FigmaIcon';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { LegalSourceModal } from '../components/LegalSourceModal';
import { AllMattersModal } from '../components/AllMattersModal';

export function Landing() {
  const navigate = useNavigate();
  const { t, language } = useThemeLanguage();

  const [message, setMessage] = useState('');
  const [files, setFiles] = useState(0);
  const [status, setStatus] = useState('idle'); // 'idle' | 'analysing' | 'ready'
  const [activeService, setActiveService] = useState(0);
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [mattersModalOpen, setMattersModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileRef = useRef(null);
  const intakeCardRef = useRef(null);

  const services = [
    {
      title: language === 'English' ? 'Consumer complaint' : 'उपभोक्ता शिकायत',
      description: language === 'English' ? 'Refunds, defective products, warranty and service disputes' : 'रिफंड, खराब उत्पाद, वारंटी और सेवा विवाद',
      icon: 'briefcase',
      tag: language === 'English' ? 'Most used' : 'सर्वाधिक प्रयुक्त',
      prompt: language === 'English' ? 'I purchased a product that stopped working under warranty, but customer support is refusing a refund or replacement.' : 'मैंने वारंटी के तहत एक उत्पाद खरीदा जो खराब हो गया, लेकिन कस्टमर सपोर्ट रिफंड या रिप्लेसमेंट देने से मना कर रहा है।'
    },
    {
      title: language === 'English' ? 'Cyber fraud support' : 'साइबर धोखाधड़ी सहायता',
      description: language === 'English' ? 'Payment fraud, impersonation and online financial disputes' : 'भुगतान धोखाधड़ी, पहचान चोरी और ऑनलाइन वित्तीय विवाद',
      icon: 'shield',
      tag: language === 'English' ? 'Time sensitive' : 'समय-संवेदनशील',
      prompt: language === 'English' ? 'An unauthorized UPI payment was deducted from my bank account after clicking an SMS link.' : 'एक एसएमएस लिंक पर क्लिक करने के बाद मेरे बैंक खाते से अनधिकृत यूपीआई भुगतान काट लिया गया।'
    },
    {
      title: language === 'English' ? 'Government grievance' : 'सरकारी शिकायत निवारण',
      description: language === 'English' ? 'Structure and route a complaint to the right department' : 'शिकायत को सही विभाग और संबंधित अधिकारी तक पहुंचाएं',
      icon: 'document',
      tag: language === 'English' ? 'Guided filing' : 'मार्गदर्शित फाइलिंग',
      prompt: language === 'English' ? 'My passport renewal / municipal grievance has been pending for over 60 days without response.' : 'मेरा पासपोर्ट नवीनीकरण / नगर निगम का आवेदन बिना किसी उत्तर के 60 दिनों से अधिक समय से लंबित है।'
    },
    {
      title: language === 'English' ? 'Know your rights' : 'अपने अधिकार जानें',
      description: language === 'English' ? 'Clear answers grounded in current Indian statutes' : 'भारतीय कानूनों और आधिकारिक नियमों पर आधारित स्पष्ट उत्तर',
      icon: 'book',
      tag: language === 'English' ? 'Legal library' : 'कानूनी पुस्तकालय',
      prompt: language === 'English' ? 'What are my legal remedies if an airline cancels my flight less than 24 hours before departure?' : 'यदि कोई एयरलाइन प्रस्थान से 24 घंटे से कम समय पहले मेरी उड़ान रद्द कर देती है तो मेरे कानूनी उपाय क्या हैं?'
    },
  ];

  const suggestions = [
    language === 'English' ? 'A seller is refusing my refund' : 'विक्रेता मेरा रिफंड देने से मना कर रहा है',
    language === 'English' ? 'I was charged for a service I cancelled' : 'रद्द की गई सेवा के लिए मुझसे शुल्क लिया गया',
    language === 'English' ? 'My warranty claim was rejected' : 'मेरा वारंटी दावा खारिज कर दिया गया',
    language === 'English' ? 'I received a defective product online' : 'मुझे ऑनलाइन खराब उत्पाद प्राप्त हुआ',
  ];

  const handleAssessSubmit = (e) => {
    e.preventDefault();
    if (!message.trim() || status === 'analysing') return;
    setStatus('analysing');
    setTimeout(() => {
      setStatus('ready');
    }, 1000);
  };

  const handleContinueAssessment = async () => {
    setIsSubmitting(true);
    try {
      // Attempt backend case creation
      const res = await fetch('http://localhost:8000/api/v1/cases/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intake_text: message })
      });
      const data = await res.json();
      if (data && data.success && data.data) {
        navigate(`/guided-form/${data.data}`);
        return;
      }
    } catch {
      // Fallback: Proceed seamlessly to guided form demo case
      console.log('Backend not available, continuing with demo case');
    } finally {
      setIsSubmitting(false);
    }
    navigate('/guided-form/demo-matter-1');
  };

  const resetMatter = () => {
    setMessage('');
    setFiles(0);
    setStatus('idle');
  };

  const handleSelectService = (index) => {
    setActiveService(index);
    setMessage(services[index].prompt);
    intakeCardRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      {/* Hero Section */}
      <section className="hero" id="hero-intake">
        <div className="container hero-layout">
          <div className="hero-content reveal">
            <div className="overline">
              <span /> {t('heroOverline')}
            </div>
            <h1>
              {t('heroTitlePrefix')}
              <em>{t('heroTitleEm')}</em>
            </h1>
            <p className="hero-intro">{t('heroIntro')}</p>
            <div className="confidence-row">
              <span>
                <FigmaIcon name="check" size={15} /> {t('trustIndianLaw')}
              </span>
              <span>
                <FigmaIcon name="check" size={15} /> {t('trustApprove')}
              </span>
              <span>
                <FigmaIcon name="lock" size={14} /> {t('trustConfidential')}
              </span>
            </div>
          </div>

          <div className="intake-wrap reveal delay-one" ref={intakeCardRef}>
            <div className="intake-card">
              <div className="intake-head">
                <div>
                  <span className="section-label">{t('intakeLabel')}</span>
                  <h2>{t('intakeTitle')}</h2>
                </div>
                <span className="online">
                  <i /> {t('assistantOnline')}
                </span>
              </div>

              {status === 'ready' ? (
                <div className="assessment-result">
                  <div className="result-status">
                    <span className="result-icon">
                      <FigmaIcon name="check" size={20} />
                    </span>
                    <div>
                      <small>{t('assessmentTitle')}</small>
                      <strong>{t('pathwayIdentified')}</strong>
                    </div>
                  </div>
                  <p className="user-summary">“{message}”</p>
                  <div className="legal-route">
                    <span>{t('suggestedRoute')}</span>
                    <strong>{t('routeLaw')}</strong>
                    <p>{t('routeDescription')}</p>
                    <div className="route-meta">
                      <span>
                        <FigmaIcon name="clock" size={14} /> {t('routeDuration')}
                      </span>
                      <span>
                        <FigmaIcon name="document" size={14} /> {t('routeSections')}
                      </span>
                    </div>
                  </div>
                  <div className="result-actions">
                    <button 
                      className="primary button" 
                      onClick={handleContinueAssessment}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>{t('reviewing')}...</>
                      ) : (
                        <>
                          {t('continueAssessment')} <FigmaIcon name="arrow" size={17} />
                        </>
                      )}
                    </button>
                    <button className="secondary button" onClick={resetMatter}>
                      {t('startAgain')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <form onSubmit={handleAssessSubmit}>
                    <textarea
                      aria-label="Describe your legal issue"
                      disabled={status === 'analysing'}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={t('textareaPlaceholder')}
                      value={message}
                    />
                    <div className="composer-row">
                      <div>
                        <input
                          hidden
                          multiple
                          onChange={(e) => setFiles(e.target.files?.length || 0)}
                          ref={fileRef}
                          type="file"
                        />
                        <button
                          className="button attachment"
                          onClick={() => fileRef.current?.click()}
                          type="button"
                        >
                          <FigmaIcon name="paperclip" size={17} />
                          {files
                            ? `${files} ${language === 'English' ? 'document' + (files > 1 ? 's' : '') : 'दस्तावेज़ संलग्न'}`
                            : t('attachDocs')}
                        </button>
                      </div>
                      <span className="privacy">
                        <FigmaIcon name="lock" size={12} /> {t('encrypted')}
                      </span>
                      <button
                        className={`submit button ${status === 'analysing' ? 'loading' : ''}`}
                        type="submit"
                        disabled={!message.trim()}
                      >
                        {status === 'analysing' ? (
                          <>
                            <i /> {t('reviewing')}
                          </>
                        ) : (
                          <>
                            {t('assessBtn')} <FigmaIcon name="arrow" size={17} />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                  <div className="suggestions">
                    <span>{t('tryExample')}</span>
                    <div>
                      {suggestions.map((suggestion) => (
                        <button
                          className="button"
                          key={suggestion}
                          onClick={() => setMessage(suggestion)}
                          type="button"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="intake-note">
              <FigmaIcon name="spark" size={16} />
              <span>
                <strong>{t('plainLanguageNote')}</strong>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* From Problem to Petition (Journey Section) */}
      <section className="journey-section" id="journey-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="section-label">{t('journeyOverline')}</span>
              <h2>{t('journeyTitle')}</h2>
            </div>
            <p>{t('journeySubtitle')}</p>
          </div>

          <div className="journey-grid">
            <article className="journey-card">
              <span className="step-number">01</span>
              <div className="step-icon blue">
                <FigmaIcon name="message" size={20} />
              </div>
              <h4>{t('step1Title')}</h4>
              <p>{t('step1Desc')}</p>
            </article>

            <article className="journey-card">
              <span className="step-number">02</span>
              <div className="step-icon gold">
                <FigmaIcon name="spark" size={20} />
              </div>
              <h4>{t('step2Title')}</h4>
              <p>{t('step2Desc')}</p>
            </article>

            <article className="journey-card">
              <span className="step-number">03</span>
              <div className="step-icon coral">
                <FigmaIcon name="document" size={20} />
              </div>
              <h4>{t('step3Title')}</h4>
              <p>{t('step3Desc')}</p>
            </article>

            <article className="journey-card">
              <span className="step-number">04</span>
              <div className="step-icon green">
                <FigmaIcon name="scale" size={20} />
              </div>
              <h4>{t('step4Title')}</h4>
              <p>{t('step4Desc')}</p>
            </article>
          </div>
        </div>
      </section>

      {/* Legal Services Section */}
      <section className="services-section" id="services-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="section-label">{t('servicesLabel')}</span>
              <h2>{t('servicesTitle')}</h2>
            </div>
            <p>{t('servicesSubtitle')}</p>
          </div>

          <div className="services-layout">
            <div className="service-tabs">
              {services.map((service, index) => (
                <button
                  className={`button service-tab ${activeService === index ? 'active' : ''}`}
                  key={service.title}
                  onClick={() => setActiveService(index)}
                  type="button"
                >
                  <span className="service-icon">
                    <FigmaIcon name={service.icon} size={20} />
                  </span>
                  <span>
                    <strong>{service.title}</strong>
                    <small>{service.description}</small>
                  </span>
                  <FigmaIcon name="chevron" size={17} />
                </button>
              ))}
            </div>

            <div className="service-detail" key={activeService}>
              <div className="detail-top">
                <span className="service-tag">{services[activeService].tag}</span>
                <FigmaIcon name={services[activeService].icon} size={24} />
              </div>
              <h3>{services[activeService].title}</h3>
              <p>
                {services[activeService].description}.{' '}
                {language === 'English'
                  ? 'We will explain your legal remedies and statutory protections before asking you to proceed.'
                  : 'हम आगे बढ़ने से पहले आपके कानूनी अधिकारों और वैधानिक उपायों की व्याख्या करेंगे।'}
              </p>
              <div className="detail-steps">
                <span>
                  <i>1</i>{' '}
                  {language === 'English' ? 'Check eligibility' : 'पात्रता जांचें'}
                </span>
                <span>
                  <i>2</i>{' '}
                  {language === 'English' ? 'Review evidence' : 'साक्ष्य समीक्षा'}
                </span>
                <span>
                  <i>3</i>{' '}
                  {language === 'English' ? 'Prepare action' : 'दस्तावेज़ तैयार'}
                </span>
              </div>
              <button
                className="button detail-action"
                onClick={() => handleSelectService(activeService)}
                type="button"
              >
                {t('exploreService')} <FigmaIcon name="arrow" size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Legal Workspace & Verified Sources */}
      <section className="workspace-section" id="workspace-section">
        <div className="container workspace-grid">
          {/* Active Open Matters Panel */}
          <div className="matter-panel">
            <div className="panel-heading">
              <div>
                <span className="section-label">{t('workspaceLabel')}</span>
                <h2>{t('workspaceTitle')}</h2>
              </div>
              <button
                className="button text-link"
                onClick={() => setMattersModalOpen(true)}
                type="button"
              >
                {t('viewAllMatters')} <FigmaIcon name="arrow" size={15} />
              </button>
            </div>

            <div className="matter">
              <div className="matter-symbol">
                <FigmaIcon name="briefcase" size={20} />
              </div>
              <div className="matter-copy">
                <span className="matter-state">{t('matterStatus')}</span>
                <strong>{t('matterTitle')}</strong>
                <small>{t('matterSubtitle')}</small>
              </div>
              <div className="readiness">
                <div>
                  <span>{t('caseReadiness')}</span>
                  <strong>72%</strong>
                </div>
                <div className="progress">
                  <i />
                </div>
                <small>{t('detailsNeeded')}</small>
              </div>
              <button
                className="button open-matter"
                onClick={() => navigate('/guided-form/demo-matter-1')}
                type="button"
              >
                {t('continueMatter')} <FigmaIcon name="arrow" size={15} />
              </button>
            </div>
          </div>

          {/* Verified Legal Source Citation Panel */}
          <aside className="source-panel" id="source-section">
            <FigmaIcon name="book" size={22} />
            <span className="section-label">{t('verifiedSourceLabel')}</span>
            <h3>{t('sourceTitle')}</h3>
            <p>{t('sourceBody')}</p>
            <small>{t('sourceCitation')}</small>
            <button
              className="button"
              onClick={() => setSourceModalOpen(true)}
              type="button"
            >
              {t('sourceAction')} <FigmaIcon name="arrow" size={15} />
            </button>
          </aside>
        </div>
      </section>

      {/* Modals */}
      <LegalSourceModal
        isOpen={sourceModalOpen}
        onClose={() => setSourceModalOpen(false)}
      />
      <AllMattersModal
        isOpen={mattersModalOpen}
        onClose={() => setMattersModalOpen(false)}
      />
    </>
  );
}
