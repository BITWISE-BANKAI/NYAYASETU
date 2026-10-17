import React, { useState, useEffect, useRef } from 'react';
import { 
  X, ExternalLink, Send, ShieldCheck, 
  AlertCircle, RefreshCw, Sparkles, Check, Trash2, 
  Scale, MessageSquare
} from 'lucide-react';
import { NeuButton } from '../ui/NeuButton';
import { NeuInput } from '../ui/NeuInput';

export function AssistantChatDrawer({ 
  activeField, 
  currentStep, 
  caseId, 
  onClose,
  onApplySuggestion,
  onOpenFieldEditor 
}) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState(new Set());
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load chat history for this specific case on mount
  useEffect(() => {
    const fetchHistory = async () => {
      if (!caseId) return;
      try {
        const res = await fetch(`http://localhost:8000/api/v1/cases/${caseId}/assistant/history`);
        const json = await res.json();
        if (json.success && json.data?.messages) {
          setMessages(json.data.messages);
        }
      } catch (err) {
        console.warn('Could not load prior assistant chat history:', err);
      }
    };
    fetchHistory();
  }, [caseId]);

  // Trigger contextual prompt when activeField changes
  useEffect(() => {
    if (activeField?.field_id && messages.length === 0) {
      handleSendMessage(`Explain what '${activeField.label}' means and why it is needed.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeField?.field_id]);

  const handleSendMessage = async (textToSend) => {
    const query = textToSend || inputValue;
    if (!query.trim() || loading) return;

    setError(null);
    setInputValue('');

    const userMsg = {
      message_id: `temp_${Date.now()}`,
      role: 'user',
      content: query,
      field_id: activeField?.field_id,
      step_number: currentStep,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch(`http://localhost:8000/api/v1/cases/${caseId}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          field_id: activeField?.field_id || undefined,
          step_number: currentStep || undefined
        })
      });

      const json = await res.json();
      if (json.success && json.data) {
        const botMsg = {
          message_id: `resp_${Date.now()}`,
          role: 'assistant',
          content: json.data.answer,
          field_id: json.data.related_field_id || activeField?.field_id,
          step_number: currentStep,
          sources: json.data.sources || [],
          suggested_field_value: json.data.suggested_field_value,
          suggested_value_provenance: json.data.suggested_value_provenance,
          needs_user_confirmation: json.data.needs_user_confirmation,
          needs_clarification: json.data.needs_clarification,
          insufficient_evidence: json.data.insufficient_evidence,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
        setError(json.detail || 'Could not retrieve legal guidance.');
      }
    } catch (err) {
      console.error('Assistant error:', err);
      setError('Could not connect to NyayaSetu assistant service.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!caseId) return;
    try {
      await fetch(`http://localhost:8000/api/v1/cases/${caseId}/assistant/history`, {
        method: 'DELETE'
      });
      setMessages([]);
    } catch (e) {
      console.error('Failed to clear history:', e);
    }
  };

  const handleDismissSuggestion = (msgId) => {
    setDismissedSuggestions(prev => new Set([...prev, msgId]));
  };

  const quickPrompts = [
    activeField ? `Explain '${activeField.label}'` : 'What should I do on this step?',
    'Why does CPA 2019 require this?',
    'What documents do I need to attach?',
    'What relief can I claim?'
  ];

  return (
    <div 
      className="rag-drawer animate-fade-in" 
      style={{ 
        position: 'sticky', 
        top: '90px', 
        height: 'calc(100vh - 120px)', 
        display: 'flex', 
        flexDirection: 'column',
        borderRadius: '16px',
        background: 'var(--base-bg)',
        boxShadow: 'var(--shadow-raised)',
        padding: '16px',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div 
        className="flex justify-between items-center" 
        style={{ 
          borderBottom: '1px solid var(--shadow-dark)', 
          paddingBottom: '12px', 
          marginBottom: '12px',
          flexShrink: 0
        }}
      >
        <div className="flex items-center gap-2">
          <div 
            style={{ 
              background: 'var(--color-understand)', 
              color: '#ffffff', 
              borderRadius: '8px', 
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Scale size={18} />
          </div>
          <div>
            <h3 className="text-card-title" style={{ fontSize: '15px', margin: 0 }}>
              Ask NyayaSetu
            </h3>
            <span className="text-helper" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Legal Guidance & Form Assistant
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              title="Clear chat session"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              <Trash2 size={15} />
            </button>
          )}
          <button 
            onClick={onClose} 
            title="Close Assistant"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Active Field Context Pill */}
      {activeField && (
        <div 
          className="neu-inset" 
          style={{ 
            padding: '8px 12px', 
            borderRadius: '10px', 
            marginBottom: '12px',
            background: 'rgba(63, 111, 224, 0.05)',
            border: '1px solid rgba(63, 111, 224, 0.15)',
            flexShrink: 0
          }}
        >
          <div className="flex justify-between items-center">
            <span className="text-helper" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-understand)', fontWeight: '700' }}>
              Step {currentStep || 1} Context
            </span>
            <span className="badge-pill badge-suggested" style={{ fontSize: '10px', padding: '2px 6px' }}>
              {activeField.status || 'active'}
            </span>
          </div>
          <div style={{ fontWeight: '700', fontSize: '13px', marginTop: '2px', color: 'var(--text-primary)' }}>
            {activeField.label}
          </div>
          {activeField.value !== null && activeField.value !== undefined && (
            <div className="text-helper" style={{ fontSize: '11px', marginTop: '2px', color: 'var(--text-secondary)' }}>
              Current: <strong>{String(activeField.value)}</strong>
            </div>
          )}
        </div>
      )}

      {/* Messages Stream */}
      <div 
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          paddingRight: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        {messages.length === 0 && (
          <div style={{ padding: '20px 8px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', background: 'rgba(63, 111, 224, 0.08)', marginBottom: '12px' }}>
              <MessageSquare size={24} style={{ color: 'var(--color-understand)' }} />
            </div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '700' }}>
              How can I assist you with this field?
            </h4>
            <p className="text-helper" style={{ fontSize: '12px', margin: '0 0 16px 0' }}>
              Ask questions in <strong>English, Hindi, or Hinglish</strong>. Every explanation is strictly grounded in official CPA 2019 and e-Jagriti provisions.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
              <span className="text-helper" style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                Suggested prompts:
              </span>
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  className="neu-card"
                  style={{
                    padding: '8px 12px',
                    fontSize: '12px',
                    textAlign: 'left',
                    borderRadius: '8px',
                    border: '1px solid #e0e4ec',
                    cursor: 'pointer',
                    background: '#ffffff',
                    color: 'var(--text-primary)'
                  }}
                >
                  💬 {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          const showSuggestion = 
            msg.suggested_field_value !== null && 
            msg.suggested_field_value !== undefined && 
            !dismissedSuggestions.has(msg.message_id);

          return (
            <div 
              key={msg.message_id || index} 
              style={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start'
              }}
            >
              <div 
                style={{ 
                  maxWidth: '92%', 
                  padding: '12px 14px', 
                  borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  background: isUser ? 'var(--color-understand)' : '#ffffff',
                  color: isUser ? '#ffffff' : 'var(--text-primary)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  border: isUser ? 'none' : '1px solid #e5e8ef',
                  fontSize: '13px',
                  lineHeight: '1.45'
                }}
              >
                {!isUser && (
                  <div className="flex items-center gap-1" style={{ marginBottom: '6px', color: 'var(--color-understand)', fontWeight: '700', fontSize: '11px' }}>
                    <ShieldCheck size={13} /> NYAYASETU GUIDANCE
                  </div>
                )}
                
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </div>

                {/* Insufficient Evidence Warning Banner */}
                {!isUser && msg.insufficient_evidence && (
                  <div 
                    style={{ 
                      marginTop: '10px', 
                      padding: '10px', 
                      borderRadius: '8px', 
                      background: '#fffbe6', 
                      border: '1px solid #ffe58f',
                      color: '#ad6800',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ fontWeight: '700', marginBottom: '4px' }}>
                      ⚠️ Insufficient Local Legal Evidence
                    </div>
                    <span>
                      The indexed legal database does not verify this claim. Please refer directly to official guidance at:
                    </span>
                    <div style={{ marginTop: '6px' }}>
                      <a 
                        href="https://e-jagriti.gov.in/help-docs" 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ color: 'var(--color-understand)', fontWeight: '700', textDecoration: 'underline' }}
                      >
                        e-Jagriti Official Help Documentation ↗
                      </a>
                    </div>
                  </div>
                )}

                {/* Interactive Suggestion Box */}
                {!isUser && showSuggestion && (
                  <div 
                    style={{ 
                      marginTop: '12px', 
                      padding: '12px', 
                      borderRadius: '10px', 
                      background: 'rgba(31, 138, 92, 0.06)', 
                      border: '1px solid rgba(31, 138, 92, 0.25)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <div className="flex items-center gap-1" style={{ color: 'var(--color-act)', fontWeight: '700', fontSize: '11px', marginBottom: '4px' }}>
                      <Sparkles size={13} /> SUGGESTED FIELD VALUE (UNCONFIRMED)
                    </div>
                    
                    <div style={{ fontSize: '14px', fontWeight: '700', margin: '4px 0' }}>
                      {typeof msg.suggested_field_value === 'number' ? `₹ ${msg.suggested_field_value.toLocaleString('en-IN')}` : String(msg.suggested_field_value)}
                    </div>

                    {msg.suggested_value_provenance && (
                      <div className="text-helper" style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        Source: {msg.suggested_value_provenance}
                      </div>
                    )}

                    <div className="flex gap-2" style={{ marginTop: '8px' }}>
                      <NeuButton 
                        variant="act"
                        onClick={() => {
                          if (onApplySuggestion && msg.field_id) {
                            onApplySuggestion(msg.field_id, msg.suggested_field_value);
                          }
                          handleDismissSuggestion(msg.message_id);
                        }}
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                      >
                        <Check size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Use Suggestion
                      </NeuButton>

                      {onOpenFieldEditor && (
                        <NeuButton 
                          onClick={() => onOpenFieldEditor(msg.field_id)}
                          style={{ fontSize: '11px', padding: '4px 10px' }}
                        >
                          Edit
                        </NeuButton>
                      )}

                      <button
                        onClick={() => handleDismissSuggestion(msg.message_id)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--text-secondary)' }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}

                {/* Verified Official Sources Cards */}
                {!isUser && msg.sources && msg.sources.length > 0 && (
                  <div style={{ marginTop: '12px', borderTop: '1px solid #f0f0f0', paddingTop: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Verified Sources ({msg.sources.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {msg.sources.map((src, sIdx) => (
                        <div 
                          key={sIdx} 
                          style={{ 
                            padding: '8px 10px', 
                            borderRadius: '8px', 
                            background: '#f8f9fc', 
                            border: '1px solid #e2e6f0',
                            fontSize: '11px'
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                              {src.title}
                            </span>
                            {src.url && (
                              <a 
                                href={src.url} 
                                target="_blank" 
                                rel="noreferrer" 
                                title="Open verified official gazette link"
                                style={{ color: 'var(--color-understand)', marginLeft: '6px' }}
                              >
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                          <div style={{ color: 'var(--color-act)', fontWeight: '600', margin: '2px 0 4px 0' }}>
                            {src.citation_label}
                          </div>
                          <div style={{ color: '#55595f', fontStyle: 'italic', lineHeight: '1.3' }}>
                            "{src.supporting_excerpt}"
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#ffffff', borderRadius: '12px', width: 'fit-content', border: '1px solid #e5e8ef' }}>
            <RefreshCw size={14} className="animate-spin" style={{ color: 'var(--color-understand)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Retrieving CPA 2019 & e-Jagriti legal guidance...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Notice */}
      {error && (
        <div 
          className="neu-inset" 
          style={{ 
            padding: '8px 12px', 
            borderRadius: '8px', 
            color: 'var(--color-danger)', 
            fontSize: '12px', 
            marginTop: '8px',
            flexShrink: 0
          }}
        >
          <div className="flex items-center gap-1" style={{ fontWeight: '700' }}>
            <AlertCircle size={13} /> {error}
          </div>
        </div>
      )}

      {/* Chat Input Bar */}
      <div 
        style={{ 
          marginTop: '12px', 
          borderTop: '1px solid var(--shadow-dark)', 
          paddingTop: '10px',
          flexShrink: 0
        }}
      >
        <div className="flex gap-2">
          <NeuInput 
            placeholder={activeField ? `Ask about '${activeField.label}'...` : "Ask NyayaSetu a question..."}
            value={inputValue} 
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            style={{ fontSize: '13px', padding: '10px 14px' }}
          />
          <NeuButton 
            variant="primary" 
            onClick={() => handleSendMessage()} 
            disabled={loading || !inputValue.trim()}
            style={{ padding: '10px 14px' }}
          >
            {loading ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
          </NeuButton>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
          <span className="text-helper" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            Supports English, Hindi, Hinglish
          </span>
          <span className="text-helper" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            Official CPA 2019 & e-Jagriti
          </span>
        </div>
      </div>
    </div>
  );
}
