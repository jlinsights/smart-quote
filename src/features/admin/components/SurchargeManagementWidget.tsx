import React, { useState, useEffect, useCallback } from 'react';
import { Shield, RefreshCw, Plus, Save, Loader2, Trash2, X, ExternalLink, AlertTriangle, AlertCircle } from 'lucide-react';
import { getSurcharges, createSurcharge, updateSurcharge, deleteSurcharge, type SurchargeRule } from '@/api/surchargeApi';
import { useToast } from '@/components/ui/Toast';
import { formatKRW } from '@/lib/format';

const CARRIER_LINKS: Record<string, { label: string; url: string }> = {
  UPS: { label: 'UPS Surcharges', url: 'https://www.ups.com/kr/ko/support/shipping-support/shipping-costs-rates/fuel-surcharges.page' },
  DHL: { label: 'DHL Surcharges', url: 'https://mydhl.express.dhl/kr/ko/ship/surcharges.html' },
};

const EMPTY_FORM: Partial<SurchargeRule> = {
  code: '',
  name: '',
  nameKo: '',
  carrier: '',
  zone: '',
  countryCodes: [],
  chargeType: 'fixed',
  amount: 0,
  effectiveFrom: new Date().toISOString().slice(0, 10),
  effectiveTo: null,
  isActive: true,
  sourceUrl: '',
};

function chargeTypeLabel(type: string, amount: number) {
  return type === 'rate' ? `${amount}%` : formatKRW(amount);
}

function carrierBadge(carrier: string | null) {
  if (!carrier) return 'All';
  const colors: Record<string, string> = {
    UPS: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    DHL: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    EMAX: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  };
  return colors[carrier] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
}

export const SurchargeManagementWidget: React.FC = () => {
  const { toast } = useToast();
  const [surcharges, setSurcharges] = useState<SurchargeRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<SurchargeRule>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getSurcharges();
      setSurcharges(res.surcharges);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load surcharges');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const startEdit = (rule: SurchargeRule) => {
    setEditingId(rule.id);
    setShowAddForm(false);
    setForm({
      code: rule.code,
      name: rule.name,
      nameKo: rule.nameKo || '',
      carrier: rule.carrier || '',
      zone: rule.zone || '',
      countryCodes: rule.countryCodes,
      chargeType: rule.chargeType,
      amount: rule.amount,
      effectiveFrom: rule.effectiveFrom.slice(0, 10),
      effectiveTo: rule.effectiveTo?.slice(0, 10) || null,
      isActive: rule.isActive,
      sourceUrl: rule.sourceUrl || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.code || !form.name || form.amount === undefined) {
      toast('error', 'Code, Name, and Amount are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        countryCodes: typeof form.countryCodes === 'string'
          ? (form.countryCodes as string).split(',').map(s => s.trim()).filter(Boolean)
          : form.countryCodes,
        carrier: form.carrier || null,
        zone: form.zone || null,
        effectiveTo: form.effectiveTo || null,
        sourceUrl: form.sourceUrl || null,
        nameKo: form.nameKo || null,
      };

      if (editingId) {
        await updateSurcharge(editingId, payload);
        toast('success', 'Surcharge updated.');
      } else {
        await createSurcharge(payload);
        toast('success', 'Surcharge created.');
      }
      cancelEdit();
      await fetchData();
    } catch {
      toast('error', 'Failed to save surcharge.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteSurcharge(id);
      toast('success', 'Surcharge deleted.');
      setConfirmDeleteId(null);
      await fetchData();
    } catch {
      toast('error', 'Failed to delete surcharge.');
    } finally {
      setDeletingId(null);
    }
  };

  const updateForm = (key: string, value: unknown) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const activeSurcharges = surcharges.filter(s => s.isActive);

  const renderForm = () => (
    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Code *</label>
          <input
            type="text"
            value={form.code || ''}
            onChange={e => updateForm('code', e.target.value)}
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="WAR_RISK"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Carrier</label>
          <select
            value={form.carrier || ''}
            onChange={e => updateForm('carrier', e.target.value)}
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">All Carriers</option>
            <option value="UPS">UPS</option>
            <option value="DHL">DHL</option>
            <option value="EMAX">EMAX</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Name (EN) *</label>
          <input
            type="text"
            value={form.name || ''}
            onChange={e => updateForm('name', e.target.value)}
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="War Risk Surcharge"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Name (KO)</label>
          <input
            type="text"
            value={form.nameKo || ''}
            onChange={e => updateForm('nameKo', e.target.value)}
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="전쟁 위험 할증료"
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Type</label>
          <select
            value={form.chargeType || 'fixed'}
            onChange={e => updateForm('chargeType', e.target.value)}
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="fixed">Fixed (KRW)</option>
            <option value="rate">Rate (%)</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Amount *</label>
          <input
            type="number"
            step="any"
            value={form.amount ?? 0}
            onChange={e => updateForm('amount', Number(e.target.value))}
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Zone</label>
          <input
            type="text"
            value={form.zone || ''}
            onChange={e => updateForm('zone', e.target.value)}
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="Z1,Z2 or empty"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Country Codes</label>
          <input
            type="text"
            value={Array.isArray(form.countryCodes) ? form.countryCodes.join(', ') : form.countryCodes || ''}
            onChange={e => updateForm('countryCodes', e.target.value)}
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="IL, UA (comma separated, empty = all)"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Source URL</label>
          <input
            type="text"
            value={form.sourceUrl || ''}
            onChange={e => updateForm('sourceUrl', e.target.value)}
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="https://..."
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Effective From</label>
          <input
            type="date"
            value={form.effectiveFrom || ''}
            onChange={e => updateForm('effectiveFrom', e.target.value)}
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Effective To</label>
          <input
            type="date"
            value={form.effectiveTo || ''}
            onChange={e => updateForm('effectiveTo', e.target.value || null)}
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex items-end pb-0.5">
          <label className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive ?? true}
              onChange={e => updateForm('isActive', e.target.checked)}
              className="rounded border-gray-300"
            />
            Active
          </label>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold bg-jways-600 hover:bg-jways-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          {editingId ? 'Update' : 'Create'}
        </button>
        <button
          onClick={cancelEdit}
          className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <X className="w-3 h-3" />
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-500" />
          <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
            Surcharge Management
          </h4>
          <span className="text-[10px] text-gray-400 font-mono">({activeSurcharges.length} active)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowAddForm(true); setEditingId(null); setForm(EMPTY_FORM); }}
            className="flex items-center gap-1 text-[10px] font-semibold text-jways-600 hover:text-jways-700 dark:text-jways-400 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="text-[10px] font-semibold text-gray-500 hover:text-jways-600 dark:text-gray-400 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingId) && renderForm()}

      {/* Surcharge List */}
      {loadError && surcharges.length === 0 ? (
        <div className="p-6 text-center text-xs text-red-500">
          <AlertCircle className="w-4 h-4 mx-auto mb-1" />
          {loadError}
          <button onClick={fetchData} className="ml-2 underline hover:no-underline">Retry</button>
        </div>
      ) : loading && surcharges.length === 0 ? (
        <div className="p-6 text-center text-xs text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin mx-auto" />
        </div>
      ) : surcharges.length === 0 ? (
        <div className="p-6 text-center text-xs text-gray-400">
          No surcharges configured. Click &ldquo;Add&rdquo; to create one.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                <th className="text-left px-3 py-2 font-semibold">Code / Name</th>
                <th className="text-center px-2 py-2 font-semibold">Carrier</th>
                <th className="text-center px-2 py-2 font-semibold">Type</th>
                <th className="text-right px-2 py-2 font-semibold">Amount</th>
                <th className="text-center px-2 py-2 font-semibold">Status</th>
                <th className="text-right px-3 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {surcharges.map(rule => (
                <tr
                  key={rule.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${!rule.isActive ? 'opacity-50' : ''}`}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <div>
                        <span className="font-mono text-[10px] text-gray-400">{rule.code}</span>
                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{rule.name}</p>
                        {rule.nameKo && <p className="text-[10px] text-gray-400">{rule.nameKo}</p>}
                        {rule.countryCodes.length > 0 && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            Countries: {rule.countryCodes.join(', ')}
                          </p>
                        )}
                      </div>
                      {rule.sourceUrl && (
                        <a href={rule.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-jways-500 flex-shrink-0">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${carrierBadge(rule.carrier)}`}>
                      {rule.carrier || 'ALL'}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                      rule.chargeType === 'rate'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                    }`}>
                      {rule.chargeType === 'rate' ? 'Rate' : 'Fixed'}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right font-medium text-gray-800 dark:text-gray-200">
                    {chargeTypeLabel(rule.chargeType, rule.amount)}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${rule.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <button
                        onClick={() => startEdit(rule)}
                        className="text-[10px] font-semibold text-gray-400 hover:text-jways-600 transition-colors"
                      >
                        Edit
                      </button>
                      {confirmDeleteId === rule.id ? (
                        <button
                          onClick={() => handleDelete(rule.id)}
                          disabled={deletingId === rule.id}
                          className="text-[10px] font-semibold text-red-600 hover:text-red-700"
                        >
                          {deletingId === rule.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm'}
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(rule.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Carrier Official Links */}
      <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 flex items-center gap-4 flex-wrap">
        {Object.entries(CARRIER_LINKS).map(([key, val]) => (
          <a
            key={key}
            href={val.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] font-medium text-jways-600 dark:text-jways-400 hover:text-jways-700 dark:hover:text-jways-300 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            {val.label}
          </a>
        ))}
      </div>

      {/* Notice */}
      <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-start gap-1.5 text-[10px] text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <p>
            UPS/DHL은 할증료 API를 제공하지 않아 실시간 자동 반영이 불가합니다.
            공식 홈페이지의 변경사항을 확인 후 수동으로 업데이트해 주세요.
          </p>
        </div>
      </div>
    </div>
  );
};
