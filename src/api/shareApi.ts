import { request } from './apiClient';

interface ShareResponse {
  shareUrl: string;
  token: string;
  expiresAt: string;
}

export const createShareLink = async (quoteId: number): Promise<ShareResponse> => {
  return request<ShareResponse>(`/api/v1/quotes/${quoteId}/share`, {
    method: 'POST',
  });
};
