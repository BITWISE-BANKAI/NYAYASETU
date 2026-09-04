import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Landing } from './pages/Landing';
import { Intake } from './pages/Intake';
import { EvidenceUpload } from './pages/EvidenceUpload';
import { Dashboard } from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<Landing />} />
          <Route path="intake" element={<Intake />} />
          <Route path="upload" element={<EvidenceUpload />} />
          <Route path="dashboard/:caseId" element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
