import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMessageCircle, FiX, FiSend } from 'react-icons/fi';
import API from '../api/axios';

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    API.get('/chatbot/settings').then((res) => {
      const en = res.data.enabled;
      setEnabled(en);
      setGreeting(res.data.greeting || '');
      if (en && window.location.hash === '#chatbot') {
        setOpen(true);
        window.location.hash = '';
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === '#chatbot' && enabled) {
        setOpen(true);
        window.location.hash = '';
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [enabled]);

  useEffect(() => {
    if (open && enabled && messages.length === 0) {
      setMessages([{ id: 0, sender: 'bot', message: greeting }]);
    }
  }, [open, enabled, greeting]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    setMessages((prev) => [...prev, { id: Date.now(), sender: 'user', message: text }]);
    try {
      const res = await API.post('/chatbot/messages', { message: text });
      setMessages((prev) => [...prev, { id: res.data.bot_message.id, sender: 'bot', message: res.data.bot_message.message }]);
    } catch {
      setMessages((prev) => [...prev, { id: Date.now(), sender: 'bot', message: 'متأسفانه خطایی رخ داد. لطفاً بعداً تلاش کنید.' }]);
    } finally {
      setSending(false);
    }
  };

  if (!enabled) return null;

  return (
    <>
      <div id="chatbot" className="absolute -top-24" />

      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition-all hover:scale-105 flex items-center justify-center"
      >
        <FiMessageCircle size={24} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 left-6 z-40 w-80 md:w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
          >
            <div className="bg-emerald-600 text-white px-4 py-3 flex items-center justify-between">
              <span className="font-medium text-sm">🤖 دستیار هوشمند</span>
              <button onClick={() => setOpen(false)}><FiX size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-emerald-50/30 to-white">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-md'
                      : 'bg-slate-100 text-slate-700 rounded-bl-md'
                  }`}>
                    {m.message}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-slate-100 p-3 flex gap-2 bg-white">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="پیام خود را بنویسید..."
                className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition disabled:opacity-40"
              >
                <FiSend size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
