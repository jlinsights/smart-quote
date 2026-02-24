import React from 'react';
import { QuoteInput, Incoterm } from '@/types';
import { ORIGIN_COUNTRY_OPTIONS, COUNTRY_OPTIONS, INCOTERM_OPTIONS } from '@/config/options';
import { inputStyles } from './input-styles';

interface Props {
  input: QuoteInput;
  onFieldChange: <K extends keyof QuoteInput>(key: K, value: QuoteInput[K]) => void;
  isMobileView: boolean;
}

export const RouteSection: React.FC<Props> = ({ input, onFieldChange, isMobileView }) => {
  const { inputClass, labelClass, cardClass, sectionTitleClass, twoColGrid } = inputStyles;
  const ic = inputClass(isMobileView);
  const lc = labelClass(isMobileView);
  const grid = twoColGrid(isMobileView);

  return (
    <div className={cardClass}>
        <h3 className={sectionTitleClass}>
            <span className="w-2 h-2 bg-jways-500 rounded-full mr-2"></span>
            Route & Terms
        </h3>
        <div className={grid}>
          
          <div>
            <label className={lc}>Origin Country</label>
            <div className="relative">
                <select 
                value={input.originCountry}
                onChange={(e) => onFieldChange('originCountry', e.target.value)}
                className={`${ic} appearance-none`}
                >
                {ORIGIN_COUNTRY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>
          </div>

          <div>
            <label className={lc}>Destination Country</label>
            <div className="relative">
                <select 
                value={input.destinationCountry}
                onChange={(e) => {
                  onFieldChange('destinationCountry', e.target.value);
                  // Optional: Reset EMAX if country changes to non-CN/VN, but simpler to just show error or let backend handle it
                }}
                className={`${ic} appearance-none`}
                >
                {COUNTRY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>
          </div>
          
          <div>
            <label className={lc}>Overseas Carrier</label>
            <div className="relative">
                <select 
                value={input.overseasCarrier || 'UPS'}
                onChange={(e) => onFieldChange('overseasCarrier', e.target.value as QuoteInput['overseasCarrier'])}
                className={`${ic} appearance-none`}
                >
                  <option value="UPS">UPS</option>
                  <option value="DHL">DHL</option>
                  <option value="EMAX" disabled={!['CN', 'VN'].includes(input.destinationCountry)}>E-MAX {['CN', 'VN'].includes(input.destinationCountry) ? '' : '(Only CN/VN)'}</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>
          </div>
          <div>
            <label className={lc}>Dest. Zip Code</label>
            <input 
              type="text" 
              value={input.destinationZip}
              onChange={(e) => onFieldChange('destinationZip', e.target.value)}
              className={ic}
              placeholder="e.g. 90001"
              inputMode="numeric"
              pattern="[0-9]*" 
              autoComplete="postal-code"
            />
          </div>
          <div>
            <label className={lc}>Incoterms</label>
            <div className="relative">
                <select 
                value={input.incoterm}
                onChange={(e) => onFieldChange('incoterm', e.target.value as Incoterm)}
                className={`${ic} appearance-none`}
                >
                {INCOTERM_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>
          </div>
          
        </div>
    </div>
  );
};
