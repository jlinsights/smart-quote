import { fetchWithRetry } from '@/lib/fetchWithRetry';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface AddonRate {
  id: number;
  code: string;
  carrier: 'DHL' | 'UPS';
  nameEn: string;
  nameKo: string;
  description: string | null;
  chargeType: 'fixed' | 'per_piece' | 'per_carton' | 'calculated';
  unit: 'shipment' | 'piece' | 'carton';
  amount: number;
  perKgRate: number | null;
  ratePercent: number | null;
  minAmount: number | null;
  fscApplicable: boolean;
  autoDetect: boolean;
  selectable: boolean;
  condition: string | null;
  detectRules: Record<string, number | string[]> | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  sourceUrl: string | null;
  sortOrder: number;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function resolveAddonRates(carrier: 'DHL' | 'UPS'): Promise<AddonRate[]> {
  const data = await fetchWithRetry(async () => {
    const res = await fetch(
      `${API_URL}/api/v1/addon_rates/resolve?carrier=${carrier}`,
      { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } }
    );
    if (!res.ok) throw new Error(`Failed to resolve addon rates: ${res.status}`);
    return res.json();
  });
  return data.addonRates;
}
