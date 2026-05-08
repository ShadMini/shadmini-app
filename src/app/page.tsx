'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
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
  messages: Message[] | null;
  lastUpdated: number;
}

const WELCOME_TITLE = 'محادثة جديدة';

export default function Home() {
  const { data: session } = useSession();
  const [chats, setChats] = useState<Record<string, Chat>>({});
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [model, setModel] = useState('gpt-4o-mini');
  const [typingText, setTypingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // تحميل المحادثات من MongoDB عند تسجيل الدخول
  useEffect(() => {
    if (session?.user) {
      fetch('/api/chats')
        .then((res) => res.json())
        .then((data) => {
          const chatMap: Record<string, Chat> = {};
          data.chats?.forEach((chat: any) => {
            chatMap[chat.id] = {
              id: chat.id,
              title: chat.title,
              model: chat.model || 'gpt-4o-mini',
              messages: null,
              lastUpdated: chat.lastUpdated || Date.now(),
            };
          });
          setChats(chatMap);
          const ids = Object.keys(chatMap);
          if (ids.length > 0) {
            const lastId = ids.sort((a, b) => (chatMap[b].lastUpdated || 0) - (chatMap[a].lastUpdated || 0))[0];
            setActiveChatId(lastId);
            setModel(chatMap[lastId].model || 'gpt-4o-mini');
            loadMessagesForChat(lastId);
          }
        });
    }
  }, [session]);

  const loadMessagesForChat = async (chatId: string) => {
    if (!chats[chatId] || chats[chatId]?.messages !== null) return;
    try {
      const res = await fetch(`/api/chats/${chatId}`);
      const data = await res.json();
      setChats((prev) => ({
        ...prev,
        [chatId]: {
          ...prev[chatId],
          messages: data.messages || [],
          lastUpdated: Date.now(),
        },
      }));
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const activeChat = activeChatId ? chats[activeChatId] : null;
  const activeMessages = activeChat?.messages || [];

  // إنشاء محادثة جديدة في MongoDB
  const handleNewChat = useCallback(async () => {
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: WELCOME_TITLE, model: model }),
      });
      const newChat = await res.json();
      setChats((prev) => ({
        ...prev,
        [newChat.id]: { ...newChat, messages: [] },
      }));
      setActiveChatId(newChat.id);
      setModel('gpt-4o-mini');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
  }, [model]);

  // تحميل محادثة عند اختيارها
  const handleSelectChat = useCallback(
    async (id: string) => {
      setActiveChatId(id);
      // تحميل الرسائل إن لم تكن محمّلة
      if (chats[id]?.messages === null) {
        await loadMessagesForChat(id);
      }
      if (chats[id]) {
        setModel(chats[id].model || 'gpt-4o-mini');
      }
    },
    [chats]
  );

  // حذف محادثة
  const handleDeleteChat = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/chats/${id}`, { method: 'DELETE' });
        const updated = { ...chats };
        delete updated[id];
        setChats(updated);
        if (activeChatId === id) {
          const remaining = Object.keys(updated);
          if (remaining.length > 0) {
            const lastId = remaining.sort(
              (a, b) => (updated[b].lastUpdated || 0) - (updated[a].lastUpdated || 0)
            )[0];
            setActiveChatId(lastId);
            setModel(updated[lastId].model || 'gpt-4o-mini');
            loadMessagesForChat(lastId);
          } else {
            setActiveChatId(null);
          }
        }
      } catch (error) {
        console.error('Failed to delete chat:', error);
      }
    },
    [chats, activeChatId]
  );

  // إعادة تسمية محادثة
  const handleRenameChat = useCallback(
    async (id: string, title: string) => {
      if (!chats[id]) return;
      try {
        await fetch(`/api/chats/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        });
        setChats((prev) => ({
          ...prev,
          [id]: { ...prev[id], title },
        }));
      } catch (error) {
        console.error('Failed to rename chat:', error);
      }
    },
    [chats]
  );

  // حفظ المحادثة إلى MongoDB (تُستدعى بعد أي تغيير)
  const saveChatToServer = useCallback(
    async (chatId: string, messages: Message[], title?: string) => {
      try {
        await fetch(`/api/chats/${chatId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages, ...(title && { title }) }),
        });
      } catch (error) {
        console.error('Failed to save chat:', error);
      }
    },
    []
  );

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
        if (i >= words.length) {
          clearInterval(interval);
          setIsTyping(false);
          setTypingText('');
          resolve(current);
          return;
        }
        if (abortRef.current?.signal.aborted) {
          clearInterval(interval);
          setIsTyping(false);
          setTypingText('');
          resolve(current + ' ⏹️');
          return;
        }
        current += words[i];
        setTypingText(current);
        i++;
      }, 15);
    });
  }, []);

  const handleSendAI = useCallback(
    async (msgs: Message[]) => {
      if (!activeChatId) return;
      setIsGenerating(true);
      abortRef.current = new AbortController();
      const currentChat = chats[activeChatId];
      const updatedChat = { ...currentChat, messages: msgs, lastUpdated: Date.now() };
      setChats((prev) => ({ ...prev, [activeChatId]: updatedChat }));

      try {
        const res = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: msgs.map((m) => ({ role: m.role, content: m.content })),
            model,
          }),
          signal: abortRef.current.signal,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        const fullResponse = data.result || '⚠️ رد فارغ';
        const finalText = await simulateTyping(fullResponse);
        const aiMsg: Message = {
          id: 'ai_' + Date.now(),
          role: 'assistant',
          content: finalText,
          createdAt: new Date().toISOString(),
        };
        const newMessages = [...msgs, aiMsg];
        const finalChat = {
          ...updatedChat,
          messages: newMessages,
          lastUpdated: Date.now(),
          title:
            updatedChat.title === WELCOME_TITLE
              ? msgs[msgs.length - 1]?.content.slice(0, 40) +
                (msgs[msgs.length - 1]?.content.length > 40 ? '…' : '')
              : updatedChat.title,
        };
        setChats((prev) => ({ ...prev, [activeChatId]: finalChat }));
        // حفظ في MongoDB
        saveChatToServer(activeChatId, newMessages, finalChat.title);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        const errorMsg: Message = {
          id: 'err_' + Date.now(),
          role: 'assistant',
          content: `❌ خطأ: ${err.message}`,
          createdAt: new Date().toISOString(),
        };
        const newMessages = [...msgs, errorMsg];
        setChats((prev) => ({
          ...prev,
          [activeChatId]: { ...prev[activeChatId], messages: newMessages, lastUpdated: Date.now() },
        }));
        saveChatToServer(activeChatId, newMessages);
      } finally {
        setIsGenerating(false);
        abortRef.current = null;
      }
    },
    [activeChatId, chats, model, saveChatToServer, simulateTyping]
  );

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isGenerating) return;
    if (!activeChatId || !chats[activeChatId]) {
      handleNewChat();
      return;
    }
    const currentMessages = chats[activeChatId]?.messages || [];
    const userMsg: Message = {
      id: 'usr_' + Date.now(),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    const newMessages = [...currentMessages, userMsg];
    setChats((prev) => ({
      ...prev,
      [activeChatId!]: { ...prev[activeChatId!], messages: newMessages, lastUpdated: Date.now() },
    }));
    setInputValue('');
    await handleSendAI(newMessages);
  }, [inputValue, isGenerating, activeChatId, chats, handleNewChat, handleSendAI]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setIsGenerating(false);
  }, []);

  const handleCopy = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      alert('تم النسخ!');
    } catch {}
  }, []);

  const handleRegenerate = useCallback(
    (messageIndex: number) => {
      if (!activeChatId || !chats[activeChatId] || isGenerating) return;
      const currentMessages = chats[activeChatId].messages || [];
      const newMessages = currentMessages.slice(0, messageIndex);
      setChats((prev) => ({
        ...prev,
        [activeChatId]: { ...prev[activeChatId], messages: newMessages, lastUpdated: Date.now() },
      }));
      saveChatToServer(activeChatId, newMessages);
      setTimeout(() => handleSendAI(newMessages), 100);
    },
    [activeChatId, chats, isGenerating, saveChatToServer, handleSendAI]
  );

  const chatsList = Object.values(chats).map((c) => ({
    id: c.id,
    title: c.title,
    lastUpdated: c.lastUpdated,
  }));

  // شاشة تسجيل الدخول إذا لم يكن هناك جلسة
  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#212121] text-white">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-[#7c5cfc] to-[#e879f9] bg-clip-text text-transparent">
            ShadMini AI
          </h1>
          <p className="mt-4 text-gray-400">يرجى تسجيل الدخول للمتابعة</p>
          <a
            href="/login"
            className="mt-6 inline-block rounded-lg bg-[#10a37f] px-6 py-3 font-semibold text-white transition hover:bg-[#0d8f6e]"
          >
            تسجيل الدخول
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#212121] dark:bg-[#212121]">
      <ChatSidebar
        chats={chatsList}
        activeChatId={activeChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        darkMode={darkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />
      <main className="flex h-full flex-1 flex-col overflow-hidden bg-[#212121]">
        <header className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm font-medium text-white focus:outline-none"
          >
            <option value="gpt-4o-mini">GPT-4o Mini</option>
            <option value="deepseek-r1">DeepSeek R1</option>
            <option value="Llama-3.3-70B-Instruct">Llama 3.3 70B</option>
            <option value="Mistral-Large-2411">Mistral Large</option>
            <option value="Phi-4">Phi-4</option>
            <option value="Codestral-2501">Codestral</option>
          </select>
          <span className="text-sm text-gray-500">
            {activeChat?.title || WELCOME_TITLE}
          </span>
        </header>
        <div className="flex-1 overflow-y-auto">
          <ChatWindow
            messages={
              isTyping
                ? [...activeMessages, { role: 'assistant', content: typingText }]
                : activeMessages
            }
            isGenerating={isGenerating || isTyping}
            onCopy={handleCopy}
            onRegenerate={handleRegenerate}
          />
        </div>
        <div className="border-t border-gray-700 px-4 py-3">
          <div className="mx-auto flex max-w-3xl items-end gap-3 rounded-2xl border border-gray-600 bg-[#2f2f2f] px-4 py-3">
            <textarea
              ref={inputRef}
              id="message-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder="اكتب رسالتك هنا..."
              className="flex-1 resize-none bg-transparent text-sm text-white placeholder-gray-400 outline-none"
            />
            <div className="flex items-center gap-2">
              {isGenerating && (
                <button
                  onClick={handleStop}
                  id="stop-btn"
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-gray-500 text-gray-400 transition hover:bg-gray-700"
                >
                  <StopCircle size={18} />
                </button>
              )}
              <button
                onClick={handleSend}
                id="send-btn"
                disabled={isGenerating || !inputValue.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition hover:opacity-80 disabled:opacity-30"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-gray-500">
            اضغط Enter للإرسال، Shift+Enter لسطر جديد
          </p>
        </div>
      </main>
    </div>
  );
}