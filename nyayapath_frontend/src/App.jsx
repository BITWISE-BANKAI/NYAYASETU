import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeLanguageProvider } from './context/ThemeLanguageContext';
import { AppShell } from './components/AppShell';
import { Landing } from './pages/Landing';
import { Intake } from './pages/Intake';
import { EvidenceUpload } from './pages/EvidenceUpload';
import { Dashboard } from './pages/Dashboard';
import { GuidedForm } from './pages/GuidedForm';

function App() {
  return (
    <ThemeLanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<Landing />} />
            <Route path="intake" element={<Intake />} />
            <Route path="upload" element={<EvidenceUpload />} />
            <Route path="dashboard/:caseId" element={<Dashboard />} />
            <Route path="guided-form/:caseId" element={<GuidedForm />} />
            <Route path="cases/:caseId/guided-form" element={<GuidedForm />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeLanguageProvider>
  );
}

export default App;
