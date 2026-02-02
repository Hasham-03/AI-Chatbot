'use client';

import { useState, useRef, useEffect } from 'react';
import { signInWithRedirect, signOut, fetchAuthSession } from 'aws-amplify/auth';
import ReactMarkdown from 'react-markdown';
import { configureAuth } from '../lib/auth';

const API_URL = 'https://mp2bcx3l2e.execute-api.ap-south-1.amazonaws.com/prod/chat';

type Msg = { role: 'user' | 'assistant'; content: string };

export default function Assistant() {
  useEffect(() => {
    configureAuth();
  }, []);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [historyThreads, setHistoryThreads] = useState<Array<{id:number; user:string; assistant?:string}>>([]);
  const [rawHistory, setRawHistory] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const session = await fetchAuthSession();
        console.log('Auth check session:', session);
        if (session.tokens) setIsLoggedIn(true);
      } catch {
        setIsLoggedIn(false);
      }
    };
    checkUser();
  }, []);

  const fetchHistory = async () => {
    try {
      const session = await fetchAuthSession();
      const userld = session.tokens?.idToken?.payload?.sub;
      const token = session.tokens?.idToken?.toString();

      if (!userld || !token) {
        console.warn("User not authenticated for history load");
        return;
      }

      console.log("Fetching history with userld:", userld);

      const res = await fetch(API_URL.replace('/chat', '/history'), {
        method: 'GET',
        headers: {
          'userld': userld,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log("History response status:", res.status, res.statusText);

      const responseText = await res.text();
      console.log("Raw response:", responseText);
      setRawHistory(responseText || null);

      if (!res.ok) {
        console.error(`History fetch failed with status ${res.status}`);
        return;
      }

      if (!responseText) {
        console.warn("Empty response from history API");
        return;
      }

      const outer = JSON.parse(responseText);
      const parsed = outer.body ? JSON.parse(outer.body) : outer;

      if (parsed.messages) {
        // set messages only if nothing is already present (prevent overwrite after auth re-render)
        setMessages(prev => prev.length === 0 ? parsed.messages : prev);
        // derive lightweight threads from the flat message list
        const items = parsed.messages as Array<any>;
        const threads: Array<{id:number; user:string; assistant?:string}> = [];
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          if (it.role === 'user') {
            const userMsg = it.content ?? '';
            let assistantMsg: string | undefined = undefined;
            if (i + 1 < items.length && items[i + 1].role === 'assistant') {
              assistantMsg = items[i + 1].content ?? '';
            }
            threads.push({ id: i, user: userMsg, assistant: assistantMsg });
          }
        }
        setHistoryThreads(threads);
      }
    } catch (err) {
      console.warn("History load failed (this is optional):", err);
      // History loading is optional - don't block user
    }
  };

  useEffect(() => {
    if (isLoggedIn) fetchHistory();
  }, [isLoggedIn]);

  // ✅ CLEAN SEND FUNCTION
  const send = async () => {
    if (!input.trim()) return;

    // ✅ Check if user is logged in BEFORE sending
    if (!isLoggedIn) {
      alert('Please log in first');
      return;
    }

    const userMessage = input;

    const updatedMessages: Msg[] = [
      ...messages,
      { role: 'user', content: userMessage },
    ];

    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      const userld = session.tokens?.idToken?.payload?.sub;

      console.log('Session:', { token: !!token, userld, fullSession: session });

      if (!userld || !token) {
        throw new Error('User not authenticated. Please sign in first.');
      }

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          messages: updatedMessages,
          userld: userld,
        }),
      });

      console.log('Chat API response status:', res.status, res.statusText);

      const responseText = await res.text();
      console.log('Raw chat response:', responseText);

      if (!res.ok) {
        throw new Error(`API error: ${res.status} - ${responseText}`);
      }

      if (!responseText) {
        throw new Error('Empty response from API');
      }

      const data = JSON.parse(responseText);
      console.log('Parsed chat response:', data);

      // ⭐ THIS is the critical part
      if (data.error || data.errorMessage) {
        throw new Error(data.error || data.errorMessage);
      }

      let answer = '';

      // Lambda proxy format
      if (data.body) {
        console.log('Response in Lambda proxy format');
        const parsed = JSON.parse(data.body);
        answer = parsed.answer || parsed.error;
      } else {
        console.log('Response in direct format');
        answer = data.answer || data.error || 'No response from API';
      }

      console.log('Final answer:', answer);

      if (!answer || answer.includes('No response')) {
        throw new Error('No answer received from API');
      }

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: answer },
      ]);

      // Update historyThreads locally so the sidebar shows the new conversation immediately
      try {
        const lastUser = updatedMessages.reverse().find(m => m.role === 'user')?.content || updatedMessages[updatedMessages.length-1]?.content || '';
        const newThread = { id: Date.now(), user: lastUser, assistant: answer };
        setHistoryThreads(prev => [newThread, ...prev]);
      } catch (e) {
        // ignore
      }

    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `System Error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-[#0d1117] text-gray-900 dark:text-gray-200">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-[#161b22] border-r border-gray-200 dark:border-gray-800 p-4 flex flex-col z-10">
        <h1 className="text-xl font-bold mb-4">Conversations</h1>

        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {historyThreads.length === 0 ? (
            rawHistory ? (
              <pre className="text-xs whitespace-pre-wrap max-h-48 overflow-auto opacity-70">{rawHistory}</pre>
            ) : (
              <div className="text-sm opacity-70">No history yet</div>
            )
          ) : (
            historyThreads.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  const msgs: Msg[] = [];
                  msgs.push({ role: 'user', content: t.user });
                  if (t.assistant) msgs.push({ role: 'assistant', content: t.assistant });
                  setMessages(msgs);
                }}
                className="w-full text-left p-2 rounded hover:bg-gray-100 dark:hover:bg-[#0f1720]"
              >
                <div className="text-sm font-medium truncate">{t.user}</div>
                {t.assistant && (
                  <div className="text-xs opacity-60 truncate">{t.assistant}</div>
                )}
              </button>
            ))
          )}
        </div>

        <div className="mb-4">
          {!isLoggedIn ? (
            <button
              type="button"
              onClick={() => signInWithRedirect()}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer pressable"
            >
              Login
            </button>
          ) : (
            <button
              type="button"
              onClick={() => signOut()}
              className="w-full bg-gray-300 dark:bg-gray-700 px-4 py-2 rounded-lg cursor-pointer"
            >
              Logout
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMessages([])}
          className="w-full text-sm text-left px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-[#0f1720]"
        >
          + New chat
        </button>
      </aside>

      {/* Chat */}
      <main className="flex flex-col flex-1">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 font-semibold text-lg">
          Chat
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-3xl px-4 py-3 rounded-lg ${
                m.role === 'user'
                  ? 'ml-auto bg-blue-600 text-white'
                  : 'bg-white dark:bg-[#1f242b] border'
              }`}
            >
              <ReactMarkdown>{m.content}</ReactMarkdown>
            </div>
          ))}

          {loading && (
            <div className="bg-gray-200 dark:bg-[#1f242b] px-4 py-3 rounded-lg w-fit">
              Thinking...
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex gap-3">
          <textarea
            className="flex-1 resize-none rounded-lg p-3 border"
            placeholder="Ask anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button
            onClick={send}
            disabled={loading}
            className="bg-blue-600 text-white px-6 rounded-lg pressable"
          >
            Send
          </button>
        </div>
      </main>
    </div>
  );
}
