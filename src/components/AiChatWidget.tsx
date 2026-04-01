import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
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
/** Render simple markdown: **bold**, `code`, ## headings, - lists, numbered lists */
const renderMarkdown = (text: string): React.ReactNode[] => {
  return text.split('\n').map((line, lineIdx) => {
    // Headings: ## or ###
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = inlineFormat(headingMatch[2]);
      const cls = level === 1 ? 'text-base font-bold mt-2 mb-1' : level === 2 ? 'text-sm font-bold mt-2 mb-1' : 'text-sm font-semibold mt-1';
      return <div key={lineIdx} className={cls}>{content}</div>;
    }

    // Unordered list: - item
    const ulMatch = line.match(/^[-•]\s+(.+)$/);
    if (ulMatch) {
      return <div key={lineIdx} className="flex gap-1.5 ml-1"><span className="shrink-0">•</span><span>{inlineFormat(ulMatch[1])}</span></div>;
    }

    // Ordered list: 1. item
    const olMatch = line.match(/^(\d+)[.)]\s+(.+)$/);
    if (olMatch) {
      return <div key={lineIdx} className="flex gap-1.5 ml-1"><span className="shrink-0 font-semibold">{olMatch[1]}.</span><span>{inlineFormat(olMatch[2])}</span></div>;
    }

    // Empty line → spacing
    if (!line.trim()) return <div key={lineIdx} className="h-2" />;

    // Regular paragraph
    return <div key={lineIdx}>{inlineFormat(line)}</div>;
  });
};

/** Inline formatting: **bold**, `code` */
const inlineFormat = (text: string): React.ReactNode => {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining) {
    // Bold: **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Code: `text`
    const codeMatch = remaining.match(/`(.+?)`/);

    const firstMatch = [boldMatch, codeMatch]
      .filter(Boolean)
      .sort((a, b) => (a!.index ?? Infinity) - (b!.index ?? Infinity))[0];

    if (!firstMatch || firstMatch.index === undefined) {
      parts.push(remaining);
      break;
    }

    // Text before match
    if (firstMatch.index > 0) {
      parts.push(remaining.slice(0, firstMatch.index));
    }

    if (firstMatch === boldMatch) {
      parts.push(<strong key={key++} className="font-bold">{firstMatch[1]}</strong>);
    } else {
      parts.push(<code key={key++} className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 text-xs font-mono">{firstMatch[1]}</code>);
    }

    remaining = remaining.slice(firstMatch.index + firstMatch[0].length);
  }

  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : <>{parts}</>;
};

const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  return (
    <div className={`flex mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed break-words ${
          isUser
            ? 'bg-jways-600 text-white rounded-2xl rounded-tr-sm'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-2xl rounded-tl-sm'
        }`}
      >
        {isUser ? message.content : renderMarkdown(message.content)}
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
} as const;

type SupportedLang = keyof typeof labels;

/* ------------------------------------------------------------------ */
/*  Suggested questions per language                                    */
/* ------------------------------------------------------------------ */
/** Question pool — 3 random questions are picked each time the chat opens */
const questionPool: Record<SupportedLang, string[]> = {
  en: [
    'How do I use the quote calculator?',
    'What is the difference between UPS and DHL rates?',
    'Tell me about packing options and costs',
    'What is the Fuel Surcharge (FSC)?',
    'How is volumetric weight calculated?',
    'How do I download a quote as PDF?',
    'What does the incoterm DAP mean?',
    'How do I check remote area surcharges?',
    'Where can I view my quote history?',
  ],
};

/** Pick n random unique items from an array */
function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

/* ------------------------------------------------------------------ */
/*  Main widget                                                        */
/* ------------------------------------------------------------------ */
/** Chat language — English only */
function resolveChatLang(): SupportedLang {
  return 'en';
}

export const AiChatWidget: React.FC = () => {
  const { user } = useAuth();

  const lang = resolveChatLang();
  const l = labels[lang];

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>([]);

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

  /* Welcome message on first open + randomize suggestions every open */
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setHasUnread(false);
    setCurrentSuggestions(pickRandom(questionPool[lang], 3));
    setShowSuggestions(true);
    if (!hasGreeted) {
      setMessages([{ role: 'assistant', content: l.welcome(user?.name) }]);
      setHasGreeted(true);
    }
  }, [hasGreeted, l, user?.name, lang]);

  /* Send message (accepts optional text for suggested questions) */
  const handleSend = useCallback(async (directText?: string) => {
    const text = (directText || inputValue).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputValue('');
    setShowSuggestions(false);
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

          {/* Suggested questions — shown after welcome, hidden after first user message */}
          {showSuggestions && messages.length <= 1 && !isLoading && (
            <div className="flex flex-col gap-2 mb-3">
              {currentSuggestions.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="text-left text-xs px-3.5 py-2.5 rounded-xl border border-jways-200 dark:border-jways-700 bg-jways-50 dark:bg-jways-900/20 text-jways-700 dark:text-jways-300 hover:bg-jways-100 dark:hover:bg-jways-900/40 hover:border-jways-300 dark:hover:border-jways-600 transition-all duration-150"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

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
              onClick={() => handleSend()}
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
