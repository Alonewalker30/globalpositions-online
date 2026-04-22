import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader, Sparkles } from 'lucide-react';
import { apiClient } from '../services/api';
import MarkdownText from './MarkdownText';

interface Message { role: 'user' | 'assistant'; text: string; ts: string; }

const SUGGESTIONS = [
  'How do I negotiate a higher salary offer?',
  'What skills should I learn to become a Senior Engineer?',
  'How do I tailor my resume for a FAANG company?',
  'What are the most in-demand skills in 2025?',
  'How do I transition from backend to ML engineering?',
];

export default function AIChatPanel() {
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(m => [...m, { role: 'user', text, ts }]);
    setInput('');
    setLoading(true);

    try {
      const res = await apiClient.post('/career/chat', { message: text, history: messages.slice(-6) });
      const reply = res.data.reply ?? 'Sorry, I could not generate a response.';
      setMessages(m => [...m, { role: 'assistant', text: reply, ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', text: 'I encountered an error. Please try again.', ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="panel chat-panel">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-avatar"><Bot size={20} /></div>
        <div>
          <div className="chat-name">AI Career Copilot</div>
          <div className="chat-status"><span className="status-dot" />Always on</div>
        </div>
        <div className="chat-badge"><Sparkles size={13} />Powered by Claude</div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <div className="chat-welcome-icon"><Bot size={32} /></div>
            <h3>Hi, I'm your AI Career Copilot</h3>
            <p>Ask me anything about your job search, resume, salary negotiation, or career growth.</p>
            <div className="chat-suggestions">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} className="suggestion-chip" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`msg-row ${m.role}`}>
            <div className={`msg-avatar ${m.role}`}>
              {m.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
            </div>
            <div className="msg-bubble-wrap">
              <div className={`msg-bubble ${m.role}`}>
                {m.role === 'assistant' ? <MarkdownText text={m.text} /> : m.text}
              </div>
              <span className="msg-ts">{m.ts}</span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="msg-row assistant">
            <div className="msg-avatar assistant"><Bot size={16} /></div>
            <div className="msg-bubble assistant typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-input-row">
        <input
          className="chat-input"
          placeholder="Ask anything about your career…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
          disabled={loading}
        />
        <button className="chat-send-btn" onClick={() => send(input)} disabled={loading || !input.trim()}>
          {loading ? <Loader size={16} className="spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
