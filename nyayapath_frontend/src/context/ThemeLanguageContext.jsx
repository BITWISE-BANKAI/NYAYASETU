import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeLanguageContext = createContext(null);

export const translations = {
  English: {
    utilityPrivate: 'Private, secure legal assistance',
    utilityUrgent: 'For urgent danger, call 112',
    brandTagline: 'न्याय तक आपकी पहुँच',
    navLegalHelp: 'Legal help',
    navMyMatters: 'My matters',
    navHowItWorks: 'How it works',
    navResources: 'Resources',
    heroOverline: 'AI-assisted legal services for India',
    heroTitlePrefix: 'Legal help that starts with ',
    heroTitleEm: 'listening.',
    heroIntro: 'Explain your situation in everyday language. We help identify the legal path, organise your evidence and prepare documents for the appropriate authority.',
    trustIndianLaw: 'Indian law sources',
    trustApprove: 'You approve every step',
    trustConfidential: 'Confidential by design',
    intakeLabel: 'Start a legal assessment',
    intakeTitle: 'How can we help today?',
    assistantOnline: 'Assistant online',
    textareaPlaceholder: 'Describe what happened, who was involved, and what outcome you need...',
    attachDocs: 'Attach documents',
    encrypted: 'Encrypted',
    assessBtn: 'Assess my issue',
    reviewing: 'Reviewing',
    tryExample: 'Try an example',
    plainLanguageNote: 'Plain language is enough. You don\'t need to know legal terms.',
    assessmentTitle: 'Preliminary assessment',
    pathwayIdentified: 'A consumer-law pathway was identified',
    suggestedRoute: 'Suggested route',
    routeLaw: 'Consumer Protection Act, 2019',
    routeDescription: 'This matter may concern a defect in goods or deficiency in service. The next step is to verify your transaction, timeline and evidence.',
    routeDuration: 'About 8 minutes',
    routeSections: '6 guided sections',
    continueAssessment: 'Continue assessment',
    startAgain: 'Start again',
    journeyOverline: 'How it works',
    journeyTitle: 'From problem to petition',
    journeySubtitle: 'You stay in control at every step. Nothing is filed without your review.',
    step1Title: 'Tell your story',
    step1Desc: 'Explain the issue naturally in English, Hindi, or Hinglish.',
    step2Title: 'Understand your rights',
    step2Desc: 'Get grounded guidance from current Indian consumer law.',
    step3Title: 'Prepare your case',
    step3Desc: 'Review facts, evidence, and a court-ready complaint draft.',
    step4Title: 'Take action',
    step4Desc: 'File through the official e-Jagriti portal with confidence.',
    servicesLabel: 'Legal services',
    servicesTitle: 'Choose where you need support',
    servicesSubtitle: 'Each service follows a guided process based on the relevant Indian law and official filing requirements.',
    exploreService: 'Explore this service',
    workspaceLabel: 'Your legal workspace',
    workspaceTitle: 'Open matters',
    viewAllMatters: 'View all matters',
    matterStatus: 'Draft in progress',
    matterTitle: 'Defective television and denied warranty claim',
    matterSubtitle: 'District Consumer Commission · Last updated today',
    caseReadiness: 'Case readiness',
    detailsNeeded: '2 details still needed',
    continueMatter: 'Continue',
    verifiedSourceLabel: 'Verified legal source',
    sourceTitle: 'Your location can determine where you file.',
    sourceBody: 'A consumer complaint may be filed where the complainant resides or personally works for gain.',
    sourceCitation: 'Consumer Protection Act, 2019 · Section 34(2)',
    sourceAction: 'Read the plain-language explanation',
    footerDisclaimer: 'NyayaSetu provides legal information and document assistance. It does not replace advice from a qualified advocate.',
    footerTagline: 'Built to bridge citizens with justice.',
  },
  'हिंदी': {
    utilityPrivate: 'निजी एवं सुरक्षित कानूनी सहायता',
    utilityUrgent: 'आपातकालीन सहायता के लिए 112 डायल करें',
    brandTagline: 'न्याय तक आपकी पहुँच',
    navLegalHelp: 'कानूनी सहायता',
    navMyMatters: 'मेरे मामले',
    navHowItWorks: 'प्रक्रिया',
    navResources: 'संसाधन',
    heroOverline: 'भारत के लिए AI-संचालित कानूनी सहायता',
    heroTitlePrefix: 'कानूनी सहायता जो शुरू होती है ',
    heroTitleEm: 'सुनने से।',
    heroIntro: 'अपनी स्थिति सामान्य बोलचाल की भाषा में बताएं। हम कानूनी मार्ग की पहचान करने, साक्ष्य व्यवस्थित करने और आधिकारिक मंच के लिए दस्तावेज़ तैयार करने में सहायता करते हैं।',
    trustIndianLaw: 'भारतीय कानून स्रोतों पर आधारित',
    trustApprove: 'हर कदम आपकी स्वीकृति से',
    trustConfidential: 'गोपनीयता की पूर्ण गारंटी',
    intakeLabel: 'कानूनी मूल्यांकन शुरू करें',
    intakeTitle: 'आज हम आपकी क्या मदद कर सकते हैं?',
    assistantOnline: 'सहायक ऑनलाइन है',
    textareaPlaceholder: 'बताएं कि क्या हुआ था, कौन शामिल था, और आपको क्या समाधान चाहिए...',
    attachDocs: 'दस्तावेज़ जोड़ें',
    encrypted: 'एन्क्रिप्टेड',
    assessBtn: 'मामले का आकलन करें',
    reviewing: 'जांच जारी है',
    tryExample: 'उदाहरण चुनें',
    plainLanguageNote: 'सरल भाषा ही काफी है। आपको कानूनी शब्दावली जानने की आवश्यकता नहीं है।',
    assessmentTitle: 'प्रारंभिक मूल्यांकन',
    pathwayIdentified: 'उपभोक्ता संरक्षण कानून मार्ग की पहचान हुई',
    suggestedRoute: 'सुझाया गया मार्ग',
    routeLaw: 'उपभोक्ता संरक्षण अधिनियम, 2019',
    routeDescription: 'यह मामला माल में दोष या सेवा में कमी से संबंधित हो सकता है। अगला कदम आपके लेन-देन, समय-सीमा और साक्ष्यों की पुष्टि करना है।',
    routeDuration: 'लगभग 8 मिनट',
    routeSections: '6 चरणबद्ध भाग',
    continueAssessment: 'मूल्यांकन जारी रखें',
    startAgain: 'पुनः शुरू करें',
    journeyOverline: 'कार्यप्रणाली',
    journeyTitle: 'समस्या से याचिका तक',
    journeySubtitle: 'हर कदम पर आपका नियंत्रण बना रहता है। आपकी समीक्षा के बिना कुछ भी दाखिल नहीं होता।',
    step1Title: 'अपनी कहानी बताएं',
    step1Desc: 'समस्या को हिंदी, अंग्रेजी या हिंग्लिश में सहजता से समझाएं।',
    step2Title: 'अपने अधिकार समझें',
    step2Desc: 'भारतीय उपभोक्ता कानून से सीधे मार्गदर्शन प्राप्त करें।',
    step3Title: 'अपना मामला तैयार करें',
    step3Desc: 'तथ्यों, साक्ष्यों और शिकायत मसौदे की समीक्षा करें।',
    step4Title: 'कार्यवाही करें',
    step4Desc: 'आधिकारिक ई-दाखिल / ई-जागृति पोर्टल पर आत्मविश्वास से फाइल करें।',
    servicesLabel: 'कानूनी सेवाएं',
    servicesTitle: 'आपको कहाँ सहायता चाहिए?',
    servicesSubtitle: 'प्रत्येक सेवा संबंधित भारतीय कानूनों और आधिकारिक फाइलिंग आवश्यकताओं के अनुसार काम करती है।',
    exploreService: 'यह सेवा चुनें',
    workspaceLabel: 'आपका कानूनी कार्यक्षेत्र',
    workspaceTitle: 'सक्रिय मामले',
    viewAllMatters: 'सभी मामले देखें',
    matterStatus: 'प्रारूप प्रगति पर है',
    matterTitle: 'खराब टेलीविज़न और अस्वीकृत वारंटी दावा',
    matterSubtitle: 'जिला उपभोक्ता आयोग · आज अपडेट किया गया',
    caseReadiness: 'मामले की तैयारी',
    detailsNeeded: '2 आवश्यक विवरण बाकी हैं',
    continueMatter: 'आगे बढ़ें',
    verifiedSourceLabel: 'सत्यापित कानूनी स्रोत',
    sourceTitle: 'आपका निवास स्थान तय कर सकता है कि आप कहाँ शिकायत दर्ज करें।',
    sourceBody: 'उपभोक्ता शिकायत उस स्थान पर दर्ज की जा सकती है जहाँ शिकायतकर्ता रहता है या व्यक्तिगत रूप से लाभ के लिए कार्य करता है।',
    sourceCitation: 'उपभोक्ता संरक्षण अधिनियम, 2019 · धारा 34(2)',
    sourceAction: 'सरल भाषा में व्याख्या पढ़ें',
    footerDisclaimer: 'न्यायसेतु कानूनी जानकारी और दस्तावेज़ सहायता प्रदान करता है। यह किसी अधिकृत अधिवक्ता की सलाह का विकल्प नहीं है।',
    footerTagline: 'नागरिकों को न्याय से जोड़ने हेतु समर्पित।',
  }
};

export function ThemeLanguageProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return window.localStorage.getItem('nyaya-theme') === 'dark' ? 'dark' : 'light';
  });

  const [language, setLanguage] = useState(() => {
    return window.localStorage.getItem('nyaya-lang') === 'हिंदी' ? 'हिंदी' : 'English';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('nyaya-theme', theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem('nyaya-lang', language);
  }, [language]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'English' ? 'हिंदी' : 'English');
  };

  const t = (key) => {
    return translations[language]?.[key] || translations['English']?.[key] || key;
  };

  return (
    <ThemeLanguageContext.Provider value={{ theme, setTheme, toggleTheme, language, setLanguage, toggleLanguage, t }}>
      {children}
    </ThemeLanguageContext.Provider>
  );
}

export function useThemeLanguage() {
  const context = useContext(ThemeLanguageContext);
  if (!context) {
    throw new Error('useThemeLanguage must be used within a ThemeLanguageProvider');
  }
  return context;
}
