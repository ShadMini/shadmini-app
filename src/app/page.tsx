'use client';

import { useState, useEffect, useCallback } from 'react';
import ChatSidebar from '@/components/ChatSidebar';

interface Chat {
  id: string;
  title: string;
  model: string;
  messages: any[];
  lastUpdated: number;
}

export default function Home() {
  const [chats, setChats] = useState<Record<string, Chat>>({});
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('shadmini_app_chats_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setChats(parsed);
        const ids = Object.keys(parsed);
        if (ids.length > 0) {
          const lastId = ids.sort((a, b) => (parsed[b].lastUpdated || 0) - (parsed[a].lastUpdated || 0))[0];
          setActiveChatId(lastId);
        }
      } catch {}
    }
  }, []);

  const saveChats = useCallback((newChats: Record<string, Chat>) => {
    setChats(newChats);
    localStorage.setItem('shadmini_app_chats_v1', JSON.stringify(newChats));
  }, []);

  const handleNewChat = useCallback(() => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const newChat: Chat = {
      id,
      title: 'محادثة جديدة',
      model: 'gpt-4o-mini',
      messages: [],
      lastUpdated: Date.now(),
    };
    saveChats({ ...chats, [id]: newChat });
    setActiveChatId(id);
  }, [chats, saveChats]);

  const handleSelectChat = useCallback((id: string) => {
    setActiveChatId(id);
  }, []);

  const handleDeleteChat = useCallback((id: string) => {
    const updated = { ...chats };
    delete updated[id];
    saveChats(updated);
    if (activeChatId === id) {
      const remaining = Object.keys(updated);
      if (remaining.length > 0) {
        setActiveChatId(remaining[remaining.length - 1]);
      } else {
        setActiveChatId(null);
      }
    }
  }, [chats, activeChatId, saveChats]);

  const handleRenameChat = useCallback((id: string, title: string) => {
    if (chats[id]) {
      saveChats({ ...chats, [id]: { ...chats[id], title } });
    }
  }, [chats, saveChats]);

  const handleToggleDarkMode = useCallback(() => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('light', !next);
  }, [darkMode]);

  const chatsList = Object.values(chats).map(c => ({
    id: c.id,
    title: c.title,
    lastUpdated: c.lastUpdated,
  }));

  return (
    <div className="flex h-screen overflow-hidden bg-[#212121]">
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
      <main className="flex flex-1 items-center justify-center bg-[#212121]">
        <p className="text-gray-400 text-lg">✅ الشريط الجانبي يعمل! سنضيف نافذة المحادثة في الخطوة التالية.</p>
      </main>
    </div>
  );
}