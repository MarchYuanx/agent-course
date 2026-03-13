import { useState, useRef, useCallback, useEffect } from 'react';
import { parseSSE } from './lib/sse';
import './App.css';

type Message = { role: 'user' | 'assistant'; content: string };

type Session = {
  id: string;
  title: string;
  messages: Message[];
};

const STORAGE_KEY = 'chatbot-sessions';

function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: Session[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function getSessionTitle(messages: Message[]): string {
  const first = messages.find((m) => m.role === 'user');
  if (!first) return '新对话';
  const text = first.content.trim();
  return text.length > 20 ? text.slice(0, 20) + '...' : text;
}

function App() {
  const [sessions, setSessions] = useState<Session[]>(loadSessions);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const currentSession = sessions.find((s) => s.id === currentId);
  const messages = currentSession?.messages ?? [];

  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  const scrollToBottom = useCallback(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, []);

  const newSession = useCallback(() => {
    const id = crypto.randomUUID();
    const session: Session = { id, title: '新对话', messages: [] };
    setSessions((prev) => [session, ...prev]);
    setCurrentId(id);
    setError(null);
  }, []);

  const selectSession = useCallback((id: string) => {
    setCurrentId(id);
    setError(null);
  }, []);

  const deleteSession = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (currentId === id) {
      const rest = sessions.filter((s) => s.id !== id);
      setCurrentId(rest[0]?.id ?? null);
    }
  }, [currentId, sessions]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    let sessionId = currentId;
    if (!sessionId || !currentSession) {
      const id = crypto.randomUUID();
      const session: Session = { id, title: '新对话', messages: [] };
      setSessions((prev) => [session, ...prev]);
      setCurrentId(id);
      sessionId = id;
    }

    setInput('');
    setError(null);
    const userMsg: Message = { role: 'user', content: text };
    const session = sessions.find((s) => s.id === sessionId);
    const history: Message[] = session ? [...session.messages, userMsg] : [userMsg];

    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, messages: [...s.messages, userMsg], title: s.messages.length === 0 ? getSessionTitle([userMsg]) : s.title }
          : s
      )
    );
    setLoading(true);

    const apiMessages = history.map((m) => ({ role: m.role, content: m.content }));

    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
        signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const stream = res.body;
      if (!stream) throw new Error('No response stream');

      const reader = stream.getReader();
      let content = '';

      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, messages: [...s.messages, { role: 'assistant' as const, content: '' }] } : s))
      );

      for await (const chunk of parseSSE(reader)) {
        content += chunk;
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== sessionId) return s;
            const msgs = [...s.messages];
            const last = msgs[msgs.length - 1];
            if (last?.role === 'assistant') msgs[msgs.length - 1] = { ...last, content };
            return { ...s, messages: msgs };
          })
        );
        scrollToBottom();
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setError((e as Error).message);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [input, loading, currentId, currentSession, sessions, scrollToBottom]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return (
    <div className={`app ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="logo">YuanBot 原宝</h1>
          <button
            type="button"
            className="btn-icon collapse"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>
        <button type="button" className="btn-new" onClick={newSession}>
          <span className="icon">+</span>
          <span className="session-label">新对话</span>
        </button>
        <nav className="session-list">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`session-item ${s.id === currentId ? 'active' : ''}`}
              onClick={() => selectSession(s.id)}
            >
              <span className="session-title">{s.title}</span>
              <button
                type="button"
                className="btn-icon delete"
                onClick={(e) => deleteSession(s.id, e)}
                title="删除对话"
              >
                ×
              </button>
            </div>
          ))}
        </nav>
      </aside>

      <main className="main">
        <header className="header">
          <p className="subtitle">基于 DeepSeek 的智能助手</p>
        </header>

        <div className="chat" ref={listRef}>
          {messages.length === 0 && (
            <div className="empty">
              <p>输入消息开始对话，或从左侧选择已有会话</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`message ${m.role}`}>
              <span className="role">{m.role === 'user' ? '你' : 'AI'}</span>
              <div className="content">
                {m.content || (loading && i === messages.length - 1 ? '...' : '')}
              </div>
            </div>
          ))}
        </div>

        {error && <div className="error">{error}</div>}

        <div className="input-wrap">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="输入消息..."
            rows={1}
            disabled={loading}
          />
          {loading ? (
            <button type="button" className="btn stop" onClick={stop}>
              停止
            </button>
          ) : (
            <button type="button" className="btn send" onClick={send} disabled={!input.trim()}>
              发送
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
