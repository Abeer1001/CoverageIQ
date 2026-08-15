import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../AuthContext';
import { askAssistant } from '../assistant';
import { MessageSquare, X, Send, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const SUGGESTIONS = [
  'Compliance summary',
  'Who is non-compliant?',
  "What's expiring soon?",
  'How do I add a vendor?',
];

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: "Hi! I'm the CoverageIQ assistant. Ask me about your compliance status or how to use the app." },
  ]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing, open]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || typing) return;
    setMessages(m => [...m, { role: 'user', text: trimmed }]);
    setInput('');
    setTyping(true);
    const started = Date.now();
    askAssistant(trimmed, user?.companyId || '').then(reply => {
      const wait = Math.max(0, 450 - (Date.now() - started));
      setTimeout(() => {
        setMessages(m => [...m, { role: 'assistant', text: reply }]);
        setTyping(false);
      }, wait);
    });
  };

  return (
    <>
      <button className="chat-fab" onClick={() => setOpen(o => !o)} aria-label={open ? 'Close assistant' : 'Open assistant'}>
        {open ? <X size={22} /> : <MessageSquare size={22} />}
      </button>

      {open && (
        <div className="chat-panel" role="dialog" aria-label="CoverageIQ assistant">
          <div className="chat-header">
            <div className="chat-header-title">
              <Sparkles size={16} color="var(--color-brand)" />
              <div>
                <div className="chat-header-name">CoverageIQ Assistant</div>
                <div className="chat-header-sub">Answers about your workspace</div>
              </div>
            </div>
            <button className="chat-close" onClick={() => setOpen(false)} aria-label="Close assistant"><X size={18} /></button>
          </div>

          <div className="chat-messages" ref={listRef}>
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                <div className="chat-bubble">{m.text}</div>
              </div>
            ))}
            {typing && (
              <div className="chat-msg assistant">
                <div className="chat-bubble chat-typing"><span /><span /><span /></div>
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="chat-suggestions">
              {SUGGESTIONS.map(s => (
                <button key={s} className="chat-suggestion" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          )}

          <form className="chat-input-row" onSubmit={e => { e.preventDefault(); send(input); }}>
            <input
              className="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask a question…"
              aria-label="Message the assistant"
            />
            <button type="submit" className="chat-send" aria-label="Send" disabled={!input.trim() || typing}>
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
