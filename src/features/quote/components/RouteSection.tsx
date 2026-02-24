import React from 'react';
import { QuoteInput, Incoterm } from '@/types';
import { COUNTRY_OPTIONS, INCOTERM_OPTIONS } from '@/config/options';
import { inputStyles } from './input-styles';

const INCOTERM_DESC: Record<string, string> = {
  [Incoterm.EXW]: 'Buyer arranges all shipping from seller\'s premises.',
  [Incoterm.FOB]: 'Seller delivers to port. Buyer bears freight & risk after.',
  [Incoterm.CNF]: 'Seller pays freight to destination port. Buyer bears risk.',
  [Incoterm.CIF]: 'Seller pays freight + insurance to destination port.',
  [Incoterm.DAP]: 'Seller delivers to destination. Buyer pays duties & taxes.',
  [Incoterm.DDP]: 'Seller delivers duty paid. All costs included in price.',
};

interface Props {
  input: QuoteInput;
  onFieldChange: <K extends keyof QuoteInput>(key: K, value: QuoteInput[K]) => void;
  isMobileView: boolean;
}

const ZIP_HINTS: Record<string, { placeholder: string; pattern?: string }> = {
  US: { placeholder: 'e.g. 90001', pattern: '[0-9]{5}' },
  CN: { placeholder: 'e.g. 100000', pattern: '[0-9]{6}' },
  JP: { placeholder: 'e.g. 100-0001', pattern: '[0-9]{3}-?[0-9]{4}' },
  VN: { placeholder: 'e.g. 700000', pattern: '[0-9]{6}' },
  SG: { placeholder: 'e.g. 018956', pattern: '[0-9]{6}' },
  DE: { placeholder: 'e.g. 10115', pattern: '[0-9]{5}' },
  GB: { placeholder: 'e.g. SW1A 1AA', pattern: '[A-Za-z0-9 ]{5,8}' },
};

const selectChevron = (
  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
  </div>
);

export const RouteSection: React.FC<Props> = ({ input, onFieldChange, isMobileView }) => {
  const { inputClass, labelClass, cardClass, sectionTitleClass, twoColGrid } = inputStyles;
  const ic = inputClass(isMobileView);
  const lc = labelClass(isMobileView);
  const grid = twoColGrid(isMobileView);

  const zipHint = ZIP_HINTS[input.destinationCountry] || { placeholder: 'Zip / Postal Code' };

  return (
    <div className={cardClass}>
        <h3 className={sectionTitleClass}>
            <span className="w-2 h-2 bg-jways-500 rounded-full mr-2"></span>
            Route & Terms
        </h3>
        <div className={grid}>

          <div>
            <label className={lc}>Origin Country</label>
            <div className={`${ic} bg-gray-50 dark:bg-gray-600 text-gray-700 dark:text-gray-200 cursor-default flex items-center`}>
                <span className="mr-1.5">🇰🇷</span> South Korea (KR)
            </div>
          </div>

          <div>
            <label className={lc}>Destination Country</label>
            <div className="relative">
                <select
                value={input.destinationCountry}
                onChange={(e) => {
                  onFieldChange('destinationCountry', e.target.value);
                }}
                className={`${ic} appearance-none`}
                >
                {COUNTRY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
                {selectChevron}
            </div>
          </div>

          <div>
            <label className={lc}>Dest. Zip Code</label>
            <input
              type="text"
              value={input.destinationZip}
              onChange={(e) => onFieldChange('destinationZip', e.target.value)}
              className={ic}
              placeholder={zipHint.placeholder}
              pattern={zipHint.pattern}
              inputMode="text"
              autoComplete="postal-code"
            />
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
                {selectChevron}
            </div>
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
                {selectChevron}
            </div>
          </div>

          {/* Incoterm description */}
          <div className="flex items-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed pl-1">
              <span className="font-semibold text-gray-600 dark:text-gray-300">{input.incoterm}</span>
              {' — '}
              {INCOTERM_DESC[input.incoterm] || ''}
            </p>
          </div>

        </div>
    </div>
  );
};
