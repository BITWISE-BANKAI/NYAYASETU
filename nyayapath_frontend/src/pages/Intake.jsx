import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NeuButton } from '../components/ui/NeuButton';
import { NeuCard } from '../components/ui/NeuCard';
import { NeuTextArea } from '../components/ui/NeuInput';

export function Intake() {
  const navigate = useNavigate();
  const [text, setText] = useState('');

  const handleSubmit = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/cases/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intake_text: text })
      });
      
      const data = await response.json();
      
      if (data.success) {
        navigate(`/dashboard/${data.data}`);
      } else {
        console.error('Submission failed:', data);
        alert('Submission failed. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting case:', error);
      alert('An error occurred while submitting your case.');
    }
  };

  return (
    <div className="container flex-col animate-fade-in" style={{ gap: '32px', maxWidth: '800px' }}>
      <div>
        <h2 className="text-heading">Tell us what happened</h2>
        <p className="text-helper">Write it the way you'd tell a friend. We'll sort out the legal language.</p>
      </div>

      <NeuCard inset={true} style={{ padding: '0' }}>
        <NeuTextArea 
          placeholder="Tell us what happened in your own words. You can write in English, हिंदी, or Hinglish."
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ minHeight: '200px', boxShadow: 'none' }}
        />
        <div className="flex justify-between items-center" style={{ padding: '16px', borderTop: '1px solid var(--shadow-dark)' }}>
          <span className="text-helper">English | हिंदी | Hinglish</span>
        </div>
      </NeuCard>

      <div className="flex justify-between items-center">
        <NeuButton onClick={() => navigate('/upload')}>I'll add evidence first</NeuButton>
        <NeuButton variant="primary" onClick={handleSubmit} disabled={!text}>
          Continue
        </NeuButton>
      </div>
    </div>
  );
}
