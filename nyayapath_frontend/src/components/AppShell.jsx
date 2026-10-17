import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Bell, User, HelpCircle, Globe, Briefcase } from 'lucide-react';
import { NeuButton } from './ui/NeuButton';

export function AppShell() {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      {/* Top App Bar */}
      <header className="neu-raised" style={{ margin: '16px', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: '16px', zIndex: 50 }}>
        
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <h1 className="text-display" style={{ margin: 0, fontSize: '24px', cursor: 'pointer' }} onClick={() => navigate('/')}>NyayaSetu</h1>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button className="flex items-center gap-1" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: '500' }}>
            <Briefcase size={18} /> My Case
          </button>
          
          <button className="flex items-center gap-1" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: '500' }}>
            <Globe size={18} /> Language
          </button>
          
          <button className="flex items-center gap-1" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: '500', marginRight: '16px' }}>
            <HelpCircle size={18} /> Help
          </button>

          <NeuButton style={{ width: '40px', height: '40px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
            <Bell size={20} style={{ color: 'var(--text-primary)' }} />
          </NeuButton>
          
          <NeuButton style={{ width: '40px', height: '40px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
            <User size={20} style={{ color: 'var(--text-primary)' }} />
          </NeuButton>
        </div>
      </header>

      <main style={{ flex: 1, padding: '24px' }}>
        <Outlet />
      </main>

      <footer style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }} className="text-helper">
        Secure • Private • Not legal advice
      </footer>
    </div>
  );
}
