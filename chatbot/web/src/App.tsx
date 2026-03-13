import { useState, useRef, useCallback, useEffect } from 'react';
import { Layout, Button, Typography, Select, Input, Tooltip, Tag, Alert } from 'antd';
import {
  PlusOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DeleteOutlined,
  RobotOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { parseSSE } from './lib/sse';
import { PERSONAS, type PersonaId } from './lib/personas';
import { MarkdownContent } from './components/MarkdownContent';
import './App.css';

type Message = { role: 'user' | 'assistant'; content: string };

type Session = {
  id: string;
  title: string;
  messages: Message[];
  personaId?: PersonaId;
};

const { Sider, Header, Content } = Layout;
const { TextArea } = Input;
const { Text } = Typography;

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
  const [personaId, setPersonaId] = useState<PersonaId>('default');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const currentSession = sessions.find((s) => s.id === currentId);
  const messages = currentSession?.messages ?? [];
  const activePersonaId = currentSession?.personaId ?? personaId;

  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  const scrollToBottom = useCallback(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, []);

  const newSession = useCallback(() => {
    const id = crypto.randomUUID();
    const session: Session = { id, title: '新对话', messages: [], personaId };
    setSessions((prev) => [session, ...prev]);
    setCurrentId(id);
    setError(null);
  }, [personaId]);

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
      const session: Session = { id, title: '新对话', messages: [], personaId };
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
    const sessionPersona = sessions.find((s) => s.id === sessionId)?.personaId ?? personaId;

    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, personaId: sessionPersona }),
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
  }, [input, loading, currentId, currentSession, sessions, personaId, scrollToBottom]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return (
    <Layout className={`app ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sider
        width={260}
        collapsedWidth={64}
        collapsible
        collapsed={sidebarCollapsed}
        trigger={null}
        className="sidebar"
      >
        <div className="sidebar-header">
          <Typography.Title level={4} className="logo" style={{ margin: 0 }}>
            <RobotOutlined style={{ marginRight: 8 }} />
            YuanBot 原宝
          </Typography.Title>
          <Button
            type="text"
            size="small"
            className="btn-icon collapse"
            icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>
        <Button
          type="dashed"
          block
          icon={<PlusOutlined />}
          className="btn-new"
          onClick={newSession}
        >
          <span className="session-label">新对话</span>
        </Button>
        <nav className="session-list">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`session-item ${s.id === currentId ? 'active' : ''}`}
              onClick={() => selectSession(s.id)}
            >
              <UserOutlined style={{ fontSize: 14, marginRight: 4 }} />
              <span className="session-title">{s.title}</span>
              <Tooltip title="删除对话">
                <Button
                  type="text"
                  size="small"
                  className="btn-icon delete"
                  icon={<DeleteOutlined />}
                  onClick={(e) => deleteSession(s.id, e)}
                />
              </Tooltip>
            </div>
          ))}
        </nav>
      </Sider>

      <Layout className="main">
        <Header className="header">
          <div className="header-row">
            <Text style={{ color: 'var(--text-muted)' }}>当前身份</Text>
            <Select<PersonaId>
              className="persona-select"
              value={activePersonaId}
              onChange={(v) => {
                setPersonaId(v);
                if (currentSession) {
                  setSessions((prev) =>
                    prev.map((s) => (s.id === currentId ? { ...s, personaId: v } : s)),
                  );
                }
              }}
              options={PERSONAS.map((p) => ({ label: p.label, value: p.id }))}
            />
          </div>
        </Header>

        <Content className="chat" ref={listRef}>
          {messages.length === 0 && (
            <div className="empty">
              <Text type="secondary">输入消息开始对话，或从左侧选择已有会话</Text>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`message ${m.role}`}>
              <div>
                <Tag color={m.role === 'user' ? 'blue' : 'cyan'}>
                  {m.role === 'user' ? '你' : '原宝'}
                </Tag>
              </div>
              <div className="content">
                <MarkdownContent
                  content={m.content || (loading && i === messages.length - 1 ? '...' : '')}
                  className="md-content"
                />
              </div>
            </div>
          ))}
        </Content>

        {error && (
          <div className="error">
            <Alert type="error" message={error} showIcon />
          </div>
        )}

        <div className="input-wrap">
          <TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="输入消息，按 Enter 发送，Shift + Enter 换行"
            autoSize={{ minRows: 1, maxRows: 4 }}
            disabled={loading}
          />
          {loading ? (
            <Button type="default" danger className="btn stop" onClick={stop}>
              停止
            </Button>
          ) : (
            <Button
              type="primary"
              className="btn send"
              onClick={send}
              disabled={!input.trim()}
            >
              发送
            </Button>
          )}
        </div>
      </Layout>
    </Layout>
  );
}

export default App;
