import React from 'react';
import { QuoteInput, DomesticRegionCode, Incoterm } from '@/types';
import { ORIGIN_COUNTRY_OPTIONS, COUNTRY_OPTIONS, INCOTERM_OPTIONS, DOMESTIC_REGIONS } from '@/constants';
import { Clock, AlertCircle } from 'lucide-react';
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
                onChange={(e) => onFieldChange('destinationCountry', e.target.value)}
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
          
          <div className={!isMobileView ? "md:col-span-2" : ""}>
            <label className={lc}>Pickup Region (Domestic)</label>
            <div className="space-y-3">
                <div className="relative">
                    <select 
                    value={input.domesticRegionCode}
                    onChange={(e) => onFieldChange('domesticRegionCode', e.target.value as DomesticRegionCode)}
                    className={`${ic} appearance-none`}
                    disabled={input.isJejuPickup}
                    >
                    {DOMESTIC_REGIONS.map(r => (
                        <option key={r.code} value={r.code}>
                            {r.code} - {r.label} ({r.cities.substring(0, 40)}{r.cities.length > 40 ? '...' : ''})
                        </option>
                    ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 text-xs border border-gray-100 dark:border-gray-600 space-y-2">
                    <div className="flex items-start">
                         <Clock className="w-3.5 h-3.5 mr-2 text-jways-600 dark:text-jways-400 flex-shrink-0 mt-0.5" />
                         <div className="text-gray-600 dark:text-gray-300">
                            <p className="mb-0.5"><span className="font-bold text-gray-800 dark:text-gray-200">당일혼적:</span> 14시 이전 픽업건은 당일 18시까지 입고</p>
                            <p><span className="font-bold text-gray-800 dark:text-gray-200">익일혼적:</span> 14시 이후 픽업건은 익일 10시까지 입고</p>
                         </div>
                    </div>
                    
                    {['O','P','Q','R','S','T'].includes(input.domesticRegionCode) && (
                         <div className="flex items-start pt-2 border-t border-gray-200 dark:border-gray-600/50">
                            <AlertCircle className="w-3.5 h-3.5 mr-2 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div className="text-gray-600 dark:text-gray-300 leading-snug">
                                <span className="font-bold text-amber-700 dark:text-amber-500">별도 협의 필요 (Region {input.domesticRegionCode}):</span> 
                                <br/>
                                전라도/특수 지역의 500kg 미만 화물은 별도 요율 협의가 필요합니다. 
                                <span className="block mt-1 text-gray-500">→ 결과 화면의 <strong>'Domestic Cost'</strong>를 직접 입력해주세요.</span>
                            </div>
                        </div>
                    )}
                </div>
                
                <label className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <input
                        type="checkbox"
                        checked={input.isJejuPickup}
                        onChange={(e) => onFieldChange('isJejuPickup', e.target.checked)}
                        className={`text-jways-600 focus:ring-jways-500 border-gray-300 rounded ${isMobileView ? 'h-6 w-6' : 'h-5 w-5'}`}
                    />
                    <div className="ml-3">
                        <span className={`block font-medium text-gray-900 dark:text-gray-300 ${isMobileView ? 'text-base' : 'text-sm'}`}>Jeju / Remote Island</span>
                        <span className="block text-xs text-amber-500 font-medium">Additional Surcharge Applies</span>
                    </div>
                </label>
            </div>
          </div>
          
        </div>
    </div>
  );
};
