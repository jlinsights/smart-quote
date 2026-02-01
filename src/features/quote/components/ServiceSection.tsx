import React from 'react';
import { QuoteInput, PackingType, Incoterm } from '@/types';
import { inputStyles } from './input-styles';

interface Props {
  input: QuoteInput;
  onFieldChange: <K extends keyof QuoteInput>(key: K, value: QuoteInput[K]) => void;
  isMobileView: boolean;
}

export const ServiceSection: React.FC<Props> = ({ input, onFieldChange, isMobileView }) => {
  const { inputClass, labelClass, cardClass, sectionTitleClass, twoColGrid } = inputStyles;
  const ic = inputClass(isMobileView);
  const lc = labelClass(isMobileView);
  const grid = twoColGrid(isMobileView);

  return (
    <div className={cardClass}>
      <h3 className={sectionTitleClass}>Value Added Services</h3>
      <div className={grid}>
        <div>
          <label className={lc}>Special Packing</label>
          <div className="relative">
              <select 
              value={input.packingType}
              onChange={(e) => onFieldChange('packingType', e.target.value as PackingType)}
              className={`${ic} appearance-none`}
              >
              {Object.values(PackingType).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
          </div>
        </div>
        
        <div>
          <label className={lc}>Packing & Docs Cost Override (KRW)</label>
          <div className="relative">
              <input 
                  type="number" 
                  step="any"
                  value={input.manualPackingCost ?? ''}
                  onChange={(e) => onFieldChange('manualPackingCost', e.target.value === '' ? undefined : Number(e.target.value))}
                  className={ic}
                  placeholder="Auto-calculated if empty"
                  inputMode="decimal"
                  autoComplete="off"
              />
          </div>
          <p className="mt-1 text-[10px] text-gray-400">
              Enter cost to override auto-calculation of Material, Labor, Fumigation & Handling.
          </p>
        </div>

        {input.incoterm === Incoterm.DDP && (
          <div>
             <label className={lc}>Estimated Duty & Tax (KRW)</label>
             <input 
              type="number" 
              step="any"
              value={input.dutyTaxEstimate}
              onChange={(e) => onFieldChange('dutyTaxEstimate', Number(e.target.value))}
              className={ic}
              inputMode="decimal"
              autoComplete="off"
             />
          </div>
        )}
      </div>
    </div>
  );
};
