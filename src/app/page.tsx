'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ChatSidebar from '@/components/ChatSidebar';
import ChatWindow from '@/components/ChatWindow';
import { Send, StopCircle } from 'lucide-react';

interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: string;
}

interface Chat {
  id: string;
  title: string;
  model: string;
  messages: Message[];
  lastUpdated: number;
}

const STORAGE_KEY = 'shadmini_app_chats_v1';
const WELCOME_TITLE = 'محادثة جديدة';

export default function Home() {
  const [chats, setChats] = useState<Record<string, Chat>>({});
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [model, setModel] = useState('gpt-4o-mini');
  const [typingText, setTypingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setChats(parsed);
        const ids = Object.keys(parsed);
        if (ids.length > 0) {
          const lastId = ids.sort((a, b) => (parsed[b].lastUpdated || 0) - (parsed[a].lastUpdated || 0))[0];
          setActiveChatId(lastId);
          setModel(parsed[lastId].model || 'gpt-4o-mini');
        }
      } catch {}
    }
    const theme = localStorage.getItem('theme');
    if (theme === 'light') {
      setDarkMode(false);
      document.documentElement.classList.add('light');
    }
  }, []);

  const saveChats = useCallback((newChats: Record<string, Chat>) => {
    setChats(newChats);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newChats));
  }, []);

  const activeChat = activeChatId ? chats[activeChatId] : null;
  const activeMessages = activeChat?.messages || [];

  const handleNewChat = useCallback(() => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const newChat: Chat = { id, title: WELCOME_TITLE, model, messages: [], lastUpdated: Date.now() };
    saveChats({ ...chats, [id]: newChat });
    setActiveChatId(id);
    setModel('gpt-4o-mini');
    inputRef.current?.focus();
  }, [chats, model, saveChats]);

  const handleSelectChat = useCallback((id: string) => {
    setActiveChatId(id);
    if (chats[id]) setModel(chats[id].model || 'gpt-4o-mini');
  }, [chats]);

  const handleDeleteChat = useCallback((id: string) => {
    const updated = { ...chats };
    delete updated[id];
    saveChats(updated);
    if (activeChatId === id) {
      const remaining = Object.keys(updated);
      if (remaining.length > 0) {
        const lastId = remaining.sort((a, b) => (updated[b].lastUpdated || 0) - (updated[a].lastUpdated || 0))[0];
        setActiveChatId(lastId);
        setModel(updated[lastId].model || 'gpt-4o-mini');
      } else setActiveChatId(null);
    }
  }, [chats, activeChatId, saveChats]);

  const handleRenameChat = useCallback((id: string, title: string) => {
    if (chats[id]) saveChats({ ...chats, [id]: { ...chats[id], title } });
  }, [chats, saveChats]);

  const handleToggleDarkMode = useCallback(() => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('light', !next);
  }, [darkMode]);

  const simulateTyping = useCallback(async (fullText: string): Promise<string> => {
    setTypingText('');
    setIsTyping(true);
    const words = fullText.split(/(\s+)/);
    let current = '';
    return new Promise((resolve) => {
      let i = 0;
      const interval = setInterval(() => {
        if (i >= words.length) { clearInterval(interval); setIsTyping(false); setTypingText(''); resolve(current); return; }
        if (abortRef.current?.signal.aborted) { clearInterval(interval); setIsTyping(false); setTypingText(''); resolve(current + ' ⏹️'); return; }
        current += words[i]; setTypingText(current); i++;
      }, 15);
    });
  }, []);

  const handleSendAI = useCallback(async (msgs: Message[]) => {
    if (!activeChatId) return;
    setIsGenerating(true);
    abortRef.current = new AbortController();
    const chat = chats[activeChatId];
    const updatedChat = { ...chat, messages: [...msgs], lastUpdated: Date.now() };
    saveChats({ ...chats, [activeChatId]: updatedChat });
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs.map(m => ({ role: m.role, content: m.content })), model }),
        signal: abortRef.current.signal,
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `HTTP ${res.status}`); }
      const data = await res.json();
      const fullResponse = data.result || '⚠️ رد فارغ';
      const finalText = await simulateTyping(fullResponse);
      const aiMsg: Message = { id: 'ai_' + Date.now(), role: 'assistant', content: finalText, createdAt: new Date().toISOString() };
      const final = { ...chats, [activeChatId]: { ...updatedChat, messages: [...updatedChat.messages, aiMsg], lastUpdated: Date.now(), title: updatedChat.title === WELCOME_TITLE ? msgs[msgs.length-1]?.content.slice(0,40) + (msgs[msgs.length-1]?.content.length > 40 ? '…' : '') : updatedChat.title } };
      saveChats(final);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      const errorMsg: Message = { id: 'err_' + Date.now(), role: 'assistant', content: `❌ خطأ: ${err.message}`, createdAt: new Date().toISOString() };
      saveChats({ ...chats, [activeChatId]: { ...updatedChat, messages: [...updatedChat.messages, errorMsg], lastUpdated: Date.now() } });
    } finally { setIsGenerating(false); abortRef.current = null; }
  }, [activeChatId, chats, model, saveChats, simulateTyping]);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isGenerating) return;
    let currentId = activeChatId;
    if (!currentId) { handleNewChat(); return; }
    const chat = chats[currentId];
    if (!chat) { handleNewChat(); return; }
    const userMsg: Message = { id: 'usr_' + Date.now(), role: 'user', content: text, createdAt: new Date().toISOString() };
    const newMessages = [...chat.messages, userMsg];
    setInputValue('');
    await handleSendAI(newMessages);
  }, [inputValue, isGenerating, activeChatId, chats, handleNewChat, handleSendAI]);

  const handleStop = useCallback(() => { abortRef.current?.abort(); setIsGenerating(false); }, []);
  const handleCopy = useCallback(async (content: string) => { try { await navigator.clipboard.writeText(content); alert('تم النسخ!'); } catch {} }, []);
  
  const handleRegenerate = useCallback((messageIndex: number) => {
    if (!activeChatId || !chats[activeChatId] || isGenerating) return;
    const chat = chats[activeChatId];
    const newMessages = chat.messages.slice(0, messageIndex);
    saveChats({ ...chats, [activeChatId]: { ...chat, messages: newMessages } });
    setTimeout(() => handleSendAI(newMessages), 100);
  }, [activeChatId, chats, isGenerating, saveChats, handleSendAI]);

  const chatsList = Object.values(chats).map(c => ({ id: c.id, title: c.title, lastUpdated: c.lastUpdated }));

  return (
    <div className="flex h-screen overflow-hidden bg-[#212121] dark:bg-[#212121]">
      <ChatSidebar chats={chatsList} activeChatId={activeChatId} onNewChat={handleNewChat} onSelectChat={handleSelectChat} onDeleteChat={handleDeleteChat} onRenameChat={handleRenameChat} darkMode={darkMode} onToggleDarkMode={handleToggleDarkMode} />
      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <select value={model} onChange={(e) => setModel(e.target.value)} className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm font-medium text-white focus:outline-none">
            <option value="gpt-4o-mini">GPT-4o Mini</option>
            <option value="deepseek-r1">DeepSeek R1</option>
            <option value="Llama-3.3-70B-Instruct">Llama 3.3 70B</option>
            <option value="Mistral-Large-2411">Mistral Large</option>
            <option value="Phi-4">Phi-4</option>
            <option value="Codestral-2501">Codestral</option>
          </select>
          <span className="text-sm text-gray-500">{activeChat?.title || WELCOME_TITLE}</span>
        </header>
        <ChatWindow messages={isTyping ? [...activeMessages, { role: 'assistant', content: typingText }] : activeMessages} isGenerating={isGenerating || isTyping} onCopy={handleCopy} onRegenerate={handleRegenerate} />
        <div className="border-t border-gray-700 px-4 py-3">
          <div className="mx-auto flex max-w-3xl items-end gap-3 rounded-2xl border border-gray-600 bg-[#2f2f2f] px-4 py-3">
            <textarea ref={inputRef} id="message-input" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} rows={1} placeholder="اكتب رسالتك هنا..." className="flex-1 resize-none bg-transparent text-sm text-white placeholder-gray-400 outline-none" />
            <div className="flex items-center gap-2">
              {isGenerating && <button onClick={handleStop} id="stop-btn" className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-gray-500 text-gray-400 transition hover:bg-gray-700"><StopCircle size={18} /></button>}
              <button onClick={handleSend} id="send-btn" disabled={isGenerating || !inputValue.trim()} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition hover:opacity-80 disabled:opacity-30"><Send size={16} /></button>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-gray-500">اضغط Enter للإرسال، Shift+Enter لسطر جديد</p>
        </div>
      </main>
    </div>
  );
}