import React, { useState } from 'react';
import { QuoteInput } from '@/types';
import { saveQuote } from '@/api/quoteApi';
import { Save, Check, Loader2 } from 'lucide-react';

interface Props {
  input: QuoteInput;
  onSaved?: () => void;
}

export const SaveQuoteButton: React.FC<Props> = ({ input, onSaved }) => {
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');

  const handleSave = async () => {
    setState('saving');
    try {
      await saveQuote(input, notes || undefined);
      setState('saved');
      setShowNotes(false);
      setNotes('');
      onSaved?.();
      setTimeout(() => setState('idle'), 2000);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  };

  if (showNotes) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes (optional)"
          className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-jways-500 focus:border-transparent w-48"
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          autoFocus
        />
        <button
          onClick={handleSave}
          disabled={state === 'saving'}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-jways-600 rounded-lg hover:bg-jways-700 disabled:opacity-50 transition-colors"
        >
          {state === 'saving' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Save
        </button>
        <button
          onClick={() => { setShowNotes(false); setNotes(''); }}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowNotes(true)}
      disabled={state === 'saving'}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
        state === 'saved'
          ? 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400'
          : state === 'error'
          ? 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
      }`}
    >
      {state === 'saved' ? (
        <><Check className="w-3.5 h-3.5" /> Saved!</>
      ) : state === 'error' ? (
        <>Failed to save</>
      ) : (
        <><Save className="w-3.5 h-3.5" /> Save Quote</>
      )}
    </button>
  );
};
