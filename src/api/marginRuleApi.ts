import { request } from './apiClient';

export interface MarginRule {
  id: number;
  name: string;
  ruleType: 'flat' | 'weight_based';
  priority: number;
  matchEmail: string | null;
  matchNationality: string | null;
  weightMin: number | null;
  weightMax: number | null;
  marginPercent: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResolvedMargin {
  marginPercent: number;
  matchedRule: { id: number; name: string } | null;
  fallback: boolean;
}

export const getMarginRules = (): Promise<{ rules: MarginRule[] }> =>
  request('/api/v1/margin_rules');

export const createMarginRule = (data: Partial<MarginRule>): Promise<MarginRule> =>
  request('/api/v1/margin_rules', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateMarginRule = (id: number, data: Partial<MarginRule>): Promise<MarginRule> =>
  request(`/api/v1/margin_rules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteMarginRule = (id: number): Promise<{ success: boolean }> =>
  request(`/api/v1/margin_rules/${id}`, { method: 'DELETE' });

export const resolveMargin = (
  email: string,
  nationality: string,
  weight: number
): Promise<ResolvedMargin> =>
  request(`/api/v1/margin_rules/resolve?email=${encodeURIComponent(email)}&nationality=${encodeURIComponent(nationality)}&weight=${weight}`);
