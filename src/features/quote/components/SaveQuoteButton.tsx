import React, { useState, useMemo } from 'react';
import { QuoteInput, QuoteResult } from '@/types';
import { saveQuote } from '@/api/quoteApi';
import { Save, Check, Loader2, ExternalLink } from 'lucide-react';

interface Props {
  input: QuoteInput;
  result?: QuoteResult | null;
  onSaved?: (referenceNo: string) => void;
}

export const SaveQuoteButton: React.FC<Props> = ({ input, result, onSaved }) => {
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [savedRefNo, setSavedRefNo] = useState<string | null>(null);
  const [lastSavedHash, setLastSavedHash] = useState<string | null>(null);

  // Validation: items + destination + result must exist
  const isValid = useMemo(() => {
    return input.items.length > 0
      && input.destinationCountry.trim() !== ''
      && result != null;
  }, [input.items.length, input.destinationCountry, result]);

  // Hash for duplicate detection (resets when input changes)
  const inputHash = useMemo(() => JSON.stringify(input), [input]);

  const handleSave = async () => {
    // Duplicate check
    if (lastSavedHash === inputHash) {
      if (!confirm('This quote was already saved. Save again?')) return;
    }

    setState('saving');
    try {
      const detail = await saveQuote(input, notes || undefined);
      setSavedRefNo(detail.referenceNo);
      setLastSavedHash(inputHash);
      setState('saved');
      setShowNotes(false);
      setNotes('');
      setTimeout(() => { setState('idle'); setSavedRefNo(null); }, 4000);
    } catch {
      setShowNotes(false);
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') { setShowNotes(false); setNotes(''); }
  };

  // Notes input mode
  if (showNotes) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes (optional)"
          className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-jways-500 focus:border-transparent w-48"
          onKeyDown={handleKeyDown}
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

  // Saved state with ref no + View link
  if (state === 'saved' && savedRefNo) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 rounded-lg">
          <Check className="w-3.5 h-3.5" />
          Saved! {savedRefNo}
        </span>
        {onSaved && (
          <button
            onClick={() => onSaved(savedRefNo)}
            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-jways-600 dark:text-jways-400 hover:bg-jways-50 dark:hover:bg-jways-900/20 rounded-lg transition-colors"
          >
            View <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
        Failed to save
      </span>
    );
  }

  // Default idle state
  return (
    <button
      onClick={() => setShowNotes(true)}
      disabled={!isValid || state === 'saving'}
      title={!isValid ? 'Enter cargo and destination first' : 'Save this quote'}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
        !isValid
          ? 'text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-50'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
      }`}
    >
      <Save className="w-3.5 h-3.5" /> Save Quote
    </button>
  );
};
