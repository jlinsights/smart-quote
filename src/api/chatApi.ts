import { request } from '@/api/apiClient';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const sendChatMessage = async (messages: ChatMessage[]): Promise<string> => {
  // Claude API requires first message to be 'user' role
  // Filter out assistant welcome messages and ensure alternating roles
  const apiMessages = messages.filter((m, i) => {
    if (i === 0 && m.role === 'assistant') return false; // skip welcome
    return true;
  });

  // Ensure first message is user role
  const firstUserIdx = apiMessages.findIndex(m => m.role === 'user');
  const cleaned = firstUserIdx >= 0 ? apiMessages.slice(firstUserIdx) : apiMessages;

  const data = await request<{ reply: string }>('/api/v1/chat', {
    method: 'POST',
    body: JSON.stringify({ messages: cleaned }),
  });
  return data.reply;
};
