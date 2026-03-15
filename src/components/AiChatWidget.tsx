import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { sendChatMessage, type ChatMessage } from '@/api/chatApi';

/* ------------------------------------------------------------------ */
/*  Typing indicator — 3 bouncing dots                                 */
/* ------------------------------------------------------------------ */
const TypingIndicator: React.FC = () => (
  <div className="flex items-start gap-2 mb-3">
    <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"
          style={{ animationDelay: `${i * 150}ms`, animationDuration: '0.8s' }}
        />
      ))}
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Single message bubble                                              */
/* ------------------------------------------------------------------ */
const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  return (
    <div className={`flex mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? 'bg-jways-600 text-white rounded-2xl rounded-tr-sm'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-2xl rounded-tl-sm'
        }`}
      >
        {message.content}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  i18n labels                                                        */
/* ------------------------------------------------------------------ */
const labels = {
  en: {
    title: 'Smart Quote Assistant',
    placeholder: 'Type a message...',
    welcome: (name?: string) =>
      name ? `Hi ${name}! How can I help you with your shipping quote today?` : 'Hi there! How can I help you with your shipping quote today?',
    error: 'Sorry, something went wrong. Please try again.',
  },
  ko: {
    title: 'Smart Quote 어시스턴트',
    placeholder: '메시지를 입력하세요...',
    welcome: (name?: string) =>
      name ? `안녕하세요 ${name}님! 배송 견적에 대해 도움이 필요하신가요?` : '안녕하세요! 배송 견적에 대해 도움이 필요하신가요?',
    error: '죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.',
  },
  cn: {
    title: 'Smart Quote 助手',
    placeholder: '输入消息...',
    welcome: (name?: string) =>
      name ? `你好 ${name}！需要关于运费报价的帮助吗？` : '你好！需要关于运费报价的帮助吗？',
    error: '抱歉，出现了问题。请重试。',
  },
  ja: {
    title: 'Smart Quote アシスタント',
    placeholder: 'メッセージを入力...',
    welcome: (name?: string) =>
      name ? `こんにちは ${name}さん！配送見積もりについてお手伝いしますか？` : 'こんにちは！配送見積もりについてお手伝いしますか？',
    error: '申し訳ありません。エラーが発生しました。再度お試しください。',
  },
} as const;

type SupportedLang = keyof typeof labels;

/* ------------------------------------------------------------------ */
/*  Main widget                                                        */
/* ------------------------------------------------------------------ */
export const AiChatWidget: React.FC = () => {
  const { user } = useAuth();
  const { language } = useLanguage();

  const lang: SupportedLang = (language in labels ? language : 'en') as SupportedLang;
  const l = labels[lang];

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Auto-scroll on new messages */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

  /* Focus input when panel opens */
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 200);
  }, [isOpen]);

  /* Lock body scroll on mobile when chat is open */
  useEffect(() => {
    if (isOpen && window.innerWidth < 640) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  /* Welcome message on first open */
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setHasUnread(false);
    if (!hasGreeted) {
      setMessages([{ role: 'assistant', content: l.welcome(user?.name) }]);
      setHasGreeted(true);
    }
  }, [hasGreeted, l, user?.name]);

  /* Send message */
  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const reply = await sendChatMessage(updatedMessages);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      if (!isOpen) setHasUnread(true);
    } catch (e) {
      const apiMsg = e instanceof Error ? e.message : '';
      setMessages((prev) => [...prev, { role: 'assistant', content: apiMsg || l.error }]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, messages, isOpen, l.error]);

  /* Handle Enter key */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* ---- Chat panel ---- */}
      <div
        className={`fixed z-50 flex flex-col
          bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700
          transition-all duration-200 ease-out origin-bottom-right
          ${isOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-95 opacity-0 pointer-events-none'}

          sm:bottom-24 sm:right-5 sm:w-[380px] sm:h-[520px] sm:rounded-2xl

          max-sm:inset-0 max-sm:w-full max-sm:h-[100dvh] max-sm:rounded-none max-sm:border-0
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-jways-600 to-jways-700 text-white sm:rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2">
            <MessageCircle size={20} />
            <h3 className="font-semibold text-sm">{l.title}</h3>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close chat"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 overscroll-contain"
        >
          {messages.map((msg, idx) => (
            <MessageBubble key={idx} message={msg} />
          ))}
          {isLoading && <TypingIndicator />}
        </div>

        {/* Input bar — safe area aware */}
        <div className="shrink-0 px-4 py-3 border-t border-gray-200 dark:border-gray-700 max-sm:pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={l.placeholder}
              className="flex-1 px-4 py-2.5 text-sm rounded-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-jways-500 transition-shadow"
              disabled={isLoading}
              enterKeyHint="send"
              autoComplete="off"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="p-2.5 rounded-full bg-jways-600 hover:bg-jways-700 active:scale-95 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ---- Floating button (hidden on mobile when chat is open) ---- */}
      <button
        onClick={isOpen ? () => setIsOpen(false) : handleOpen}
        className={`fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-jways-600 hover:bg-jways-700 active:scale-95 text-white shadow-lg flex items-center justify-center transition-all duration-200
          ${isOpen ? 'max-sm:hidden rotate-90 sm:scale-90' : 'rotate-0 scale-100'}
        `}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
        {hasUnread && !isOpen && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
        )}
      </button>
    </>
  );
};

export default AiChatWidget;
