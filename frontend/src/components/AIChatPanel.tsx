import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader, Sparkles, AlignLeft, X } from 'lucide-react';
import { streamChat } from '../services/api';
import MarkdownText from './MarkdownText';

interface Message { role: 'user' | 'assistant'; text: string; ts: string; }

const SUGGESTIONS = [
  'How do I negotiate a higher salary offer?',
  'Review my resume for a Senior Engineer role',
  'How do I tailor my resume for FAANG?',
  'What are the most in-demand skills in 2025?',
  'How do I transition from backend to ML engineering?',
];

export default function AIChatPanel() {
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [longMode,    setLongMode]    = useState(false);
  const [longText,    setLongText]    = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const ts = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;

    const history = messages;
    setMessages(m => [...m, { role: 'user', text: content, ts: ts() }]);
    setInput('');
    setLongText('');
    setLongMode(false);
    setLoading(true);

    const tier = localStorage.getItem('model_tier') ?? 'balanced';
    let accumulated = '';

    try {
      for await (const token of streamChat(content, history, tier)) {
        if (accumulated === '') {
          // First token — add the assistant bubble and stop the typing indicator
          setLoading(false);
          setMessages(m => [...m, { role: 'assistant', text: token, ts: ts() }]);
        } else {
          setMessages(m => {
            const copy = [...m];
            const last = copy[copy.length - 1];
            copy[copy.length - 1] = { ...last, text: last.text + token };
            return copy;
          });
        }
        accumulated += token;
      }
      if (!accumulated) {
        setMessages(m => [...m, { role: 'assistant', text: 'No response received.', ts: ts() }]);
      }
    } catch (e: unknown) {
      const detail = (e instanceof Error ? e.message : String(e)) || 'Unknown error';
      setMessages(m => [...m, { role: 'assistant', text: `Error: ${detail}`, ts: ts() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
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
        <div className="chat-badge"><Sparkles size={13} />Streaming · Multi-model</div>
      </div>

      {/* Messages */}
      <div className="chat-messages" role="log" aria-live="polite" aria-relevant="additions">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <div className="chat-welcome-icon"><Bot size={32} /></div>
            <h3>Hi, I'm your AI Career Copilot</h3>
            <p>Ask me anything about your job search, resume, salary negotiation, or career growth.<br/>
              <strong style={{ color: 'var(--accent)' }}>You can paste entire resumes or job descriptions</strong> — I handle long inputs.
            </p>
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

      {/* Long-text input panel */}
      {longMode && (
        <div className="chat-long-panel">
          <div className="chat-long-header">
            <span>Paste resume / job description / long text</span>
            <button onClick={() => { setLongMode(false); setLongText(''); }}><X size={14} /></button>
          </div>
          <textarea
            className="chat-long-textarea"
            rows={8}
            placeholder="Paste anything here — full resume, entire job description, company info. I can handle it all."
            value={longText}
            onChange={e => setLongText(e.target.value)}
            autoFocus
          />
          <button
            className="btn-primary"
            style={{ alignSelf: 'flex-end' }}
            onClick={() => send(longText)}
            disabled={!longText.trim() || loading}
          >
            {loading ? <><Loader size={14} className="spin" />Thinking…</> : <><Send size={14} />Send</>}
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="chat-input-row">
        <button
          className="chat-attach-btn"
          title="Paste long text / resume / job description"
          onClick={() => setLongMode(o => !o)}
        >
          <AlignLeft size={16} />
        </button>
        <input
          className="chat-input"
          placeholder="Ask anything… or use the ¶ button to paste a resume/JD"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button className="chat-send-btn" onClick={() => send(input)} disabled={loading || !input.trim()}>
          {loading ? <Loader size={16} className="spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
