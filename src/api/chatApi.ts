import { request } from '@/api/apiClient';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const sendChatMessage = async (messages: ChatMessage[]): Promise<string> => {
  const data = await request<{ reply: string }>('/api/v1/chat', {
    method: 'POST',
    body: JSON.stringify({ messages }),
  });
  return data.reply;
};
