import React, { useState, useEffect } from 'react';
import { getFscRates, updateFscRate, FscRates } from '@/api/fscApi';
import { Fuel, RefreshCw, Save, Loader2, ExternalLink } from 'lucide-react';

export const FscRateWidget: React.FC = () => {
  const [data, setData] = useState<FscRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingCarrier, setEditingCarrier] = useState<'UPS' | 'DHL' | null>(null);
  const [intlRate, setIntlRate] = useState(0);
  const [domRate, setDomRate] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const result = await getFscRates();
      setData(result);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRates(); }, []);

  const startEdit = (carrier: 'UPS' | 'DHL') => {
    if (!data) return;
    setEditingCarrier(carrier);
    setIntlRate(data.rates[carrier].international);
    setDomRate(data.rates[carrier].domestic);
  };

  const handleSave = async () => {
    if (!editingCarrier) return;
    setSaving(true);
    try {
      await updateFscRate(editingCarrier, intlRate, domRate);
      await fetchRates();
      setEditingCarrier(null);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const carrierLinks = {
    UPS: 'https://www.ups.com/kr/ko/support/shipping-support/shipping-costs-rates/fuel-surcharges.page',
    DHL: 'https://mydhl.express.dhl/kr/ko/ship/surcharges.html',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Fuel className="w-4 h-4 text-jways-500" />
          <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
            FSC Rates
          </h4>
        </div>
        <button
          onClick={fetchRates}
          disabled={loading}
          className="text-[10px] font-semibold text-gray-500 hover:text-jways-600 dark:text-gray-400 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && !data ? (
        <div className="p-6 text-center text-xs text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin mx-auto" />
        </div>
      ) : data ? (
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {(['UPS', 'DHL'] as const).map((carrier) => {
            const rates = data.rates[carrier];
            const isEditing = editingCarrier === carrier;
            const link = carrierLinks[carrier];

            return (
              <div key={carrier} className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{carrier}</span>
                    <a 
                      href={link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-jways-500 transition-colors"
                      title={`${carrier} 공식 연료 할증료 페이지 열기`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  {isEditing ? (
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-1 text-[10px] font-semibold text-jways-600 hover:text-jways-700"
                    >
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Save
                    </button>
                  ) : (
                    <button
                      onClick={() => startEdit(carrier)}
                      className="text-[10px] font-semibold text-gray-400 hover:text-jways-600 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">International</span>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.5"
                        value={intlRate}
                        onChange={(e) => setIntlRate(Number(e.target.value))}
                        className="w-full mt-0.5 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{rates.international}%</p>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">Domestic</span>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.5"
                        value={domRate}
                        onChange={(e) => setDomRate(Number(e.target.value))}
                        className="w-full mt-0.5 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{rates.domestic}%</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 text-center text-xs text-gray-400">Failed to load rates</div>
      )}

      {data && (
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            Last updated: {new Date(data.updatedAt).toLocaleString('ko-KR')}
          </span>
        </div>
      )}
    </div>
  );
};
