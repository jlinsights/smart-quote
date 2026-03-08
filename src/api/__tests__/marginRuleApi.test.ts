import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMarginRules, createMarginRule, updateMarginRule, deleteMarginRule, resolveMargin } from '../marginRuleApi';

vi.mock('../apiClient', () => ({
  request: vi.fn(),
}));

import { request } from '../apiClient';
const mockRequest = vi.mocked(request);

describe('marginRuleApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMarginRules', () => {
    it('calls GET /api/v1/margin_rules', async () => {
      const mockResponse = { rules: [{ id: 1, name: 'Test' }] };
      mockRequest.mockResolvedValue(mockResponse);

      const result = await getMarginRules();

      expect(mockRequest).toHaveBeenCalledWith('/api/v1/margin_rules');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createMarginRule', () => {
    it('calls POST /api/v1/margin_rules with data', async () => {
      const data = { name: 'New Rule', marginPercent: 19 };
      const mockResponse = { id: 1, ...data };
      mockRequest.mockResolvedValue(mockResponse);

      const result = await createMarginRule(data);

      expect(mockRequest).toHaveBeenCalledWith('/api/v1/margin_rules', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateMarginRule', () => {
    it('calls PUT /api/v1/margin_rules/:id with data', async () => {
      const data = { name: 'Updated' };
      const mockResponse = { id: 5, ...data };
      mockRequest.mockResolvedValue(mockResponse);

      const result = await updateMarginRule(5, data);

      expect(mockRequest).toHaveBeenCalledWith('/api/v1/margin_rules/5', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteMarginRule', () => {
    it('calls DELETE /api/v1/margin_rules/:id', async () => {
      mockRequest.mockResolvedValue({ success: true });

      const result = await deleteMarginRule(3);

      expect(mockRequest).toHaveBeenCalledWith('/api/v1/margin_rules/3', {
        method: 'DELETE',
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('resolveMargin', () => {
    it('calls GET /api/v1/margin_rules/resolve with query params', async () => {
      const mockResponse = { marginPercent: 19, matchedRule: { id: 1, name: 'Test' }, fallback: false };
      mockRequest.mockResolvedValue(mockResponse);

      const result = await resolveMargin('user@test.com', 'South Korea', 25);

      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/margin_rules/resolve?email=user%40test.com&nationality=South%20Korea&weight=25'
      );
      expect(result).toEqual(mockResponse);
    });

    it('encodes special characters in params', async () => {
      mockRequest.mockResolvedValue({ marginPercent: 24, matchedRule: null, fallback: true });

      await resolveMargin('a+b@test.com', 'Côte d\'Ivoire', 10.5);

      const url = mockRequest.mock.calls[0][0] as string;
      expect(url).toContain('email=a%2Bb%40test.com');
      expect(url).toContain('weight=10.5');
    });
  });
});
