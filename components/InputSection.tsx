import React from 'react';
import { QuoteInput, DomesticRegionCode, Incoterm, PackingType, CargoItem } from '../types';
import { COUNTRY_OPTIONS, ORIGIN_COUNTRY_OPTIONS, INCOTERM_OPTIONS, DOMESTIC_REGIONS } from '../constants';
import { Plus, Trash2, Package, TrendingUp, Box, RotateCcw, Clock, AlertCircle, Info } from 'lucide-react';

interface Props {
  input: QuoteInput;
  onChange: (newInput: QuoteInput) => void;
  isMobileView?: boolean;
  systemExchangeRate: number;
  systemFscPercent: number;
}

export const InputSection: React.FC<Props> = ({ 
    input, 
    onChange, 
    isMobileView = false,
    systemExchangeRate,
    systemFscPercent
}) => {

  const updateField = <K extends keyof QuoteInput>(key: K, value: QuoteInput[K]) => {
    onChange({ ...input, [key]: value });
  };

  const updateItem = (index: number, field: keyof CargoItem, value: number) => {
    const newItems = [...input.items];
    newItems[index] = { ...newItems[index], [field]: value };
    updateField('items', newItems);
  };

  const addItem = () => {
    const newItem: CargoItem = {
      id: Math.random().toString(36).substr(2, 9),
      width: 0, length: 0, height: 0, weight: 0, quantity: 1
    };
    updateField('items', [...input.items, newItem]);
  };

  const removeItem = (index: number) => {
    if (input.items.length > 1) {
      const newItems = input.items.filter((_, i) => i !== index);
      updateField('items', newItems);
    }
  };

  // Check if current rates match the system fetched rates
  const isDefaultRates = input.exchangeRate === systemExchangeRate && input.fscPercent === systemFscPercent;
  
  const resetRates = () => {
    onChange({ 
        ...input, 
        exchangeRate: systemExchangeRate, 
        fscPercent: systemFscPercent 
    });
  };

  // Mobile Optimization: 
  // - text-base prevents iOS zoom on focus
  // - py-3.5 px-4 for comfortable touch targets on mobile
  // - py-2.5 px-3 for compact desktop view
  const inputClass = `w-full border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:border-jways-500 focus:ring-jways-500 border bg-white dark:bg-gray-700 dark:text-white transition-colors placeholder-gray-400 
    ${isMobileView ? 'text-base py-3.5 px-4' : 'text-sm py-2.5 px-3'}`;
    
  const labelClass = `block font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-0.5 
    ${isMobileView ? 'text-base' : 'text-sm'}`;
    
  const cardClass = "bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors";
  const sectionTitleClass = "text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-5 flex items-center border-b border-gray-100 dark:border-gray-700 pb-2";
  const grayCardClass = "bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl shadow-inner border border-gray-200 dark:border-gray-700 transition-colors";

  // Grid classes that depend on view mode
  const twoColGrid = `grid grid-cols-1 ${!isMobileView ? 'md:grid-cols-2' : ''} gap-5`;
  
  // Cargo Grid: Improved gap and background
  const cargoGrid = `grid grid-cols-12 gap-x-3 gap-y-4 ${!isMobileView ? 'sm:gap-2' : ''} items-end p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl transition-colors border border-gray-200 dark:border-gray-600/50 relative`;
  
  // Financial factors grid - adapt to 3 items
  const financialGrid = `grid grid-cols-1 ${!isMobileView ? 'sm:grid-cols-3' : 'grid-cols-2'} gap-5`;

  // Helper for Cargo labels
  const cargoLabelClass = `block font-medium text-gray-500 dark:text-gray-400 mb-1 
    ${isMobileView ? 'text-sm' : 'text-xs'}`;

  // Button Styles with Touch Target Logic
  const addBoxBtnClass = isMobileView
    ? "text-sm flex items-center bg-jways-600 text-white px-4 py-2.5 rounded-lg shadow-sm hover:bg-jways-700 active:scale-95 transition-all font-medium"
    : "text-xs flex items-center bg-jways-600 text-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-jways-700 active:scale-95 transition-all font-medium";

  const resetBtnClass = isMobileView
    ? "text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg border border-amber-100 dark:border-amber-800 shadow-sm whitespace-nowrap flex items-center hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors cursor-pointer group"
    : "text-[10px] sm:text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md border border-amber-100 dark:border-amber-800 shadow-sm whitespace-nowrap flex items-center hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors cursor-pointer group";

  return (
    <div className="space-y-6">
      
      {/* Route & Terms */}
      <div className={cardClass}>
        <h3 className={sectionTitleClass}>
            <span className="w-2 h-2 bg-jways-500 rounded-full mr-2"></span>
            Route & Terms
        </h3>
        <div className={twoColGrid}>
          
          <div>
            <label className={labelClass}>Origin Country</label>
            <div className="relative">
                <select 
                value={input.originCountry}
                onChange={(e) => updateField('originCountry', e.target.value)}
                className={`${inputClass} appearance-none`}
                >
                {ORIGIN_COUNTRY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>Destination Country</label>
            <div className="relative">
                <select 
                value={input.destinationCountry}
                onChange={(e) => updateField('destinationCountry', e.target.value)}
                className={`${inputClass} appearance-none`}
                >
                {COUNTRY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>
          </div>
          <div>
            <label className={labelClass}>Dest. Zip Code</label>
            <input 
              type="text" 
              value={input.destinationZip}
              onChange={(e) => updateField('destinationZip', e.target.value)}
              className={inputClass}
              placeholder="e.g. 90001"
              inputMode="numeric"
              pattern="[0-9]*" 
              autoComplete="postal-code"
            />
          </div>
          <div>
            <label className={labelClass}>Incoterms</label>
            <div className="relative">
                <select 
                value={input.incoterm}
                onChange={(e) => updateField('incoterm', e.target.value as Incoterm)}
                className={`${inputClass} appearance-none`}
                >
                {INCOTERM_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>
          </div>
          
          <div className={!isMobileView ? "md:col-span-2" : ""}>
            <label className={labelClass}>Pickup Region (Domestic)</label>
            <div className="space-y-3">
                <div className="relative">
                    <select 
                    value={input.domesticRegionCode}
                    onChange={(e) => updateField('domesticRegionCode', e.target.value as DomesticRegionCode)}
                    className={`${inputClass} appearance-none`}
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
                    
                    {/* New Info for Regions O~T */}
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
                        onChange={(e) => updateField('isJejuPickup', e.target.checked)}
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

       {/* Financial Factors (Gray Zone) */}
       <div className={grayCardClass}>
         <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider flex items-center">
                <TrendingUp className="w-4 h-4 mr-2 text-jways-600 dark:text-jways-400" />
                Financial Factors
            </h3>
            {isDefaultRates ? (
                <span className="text-[10px] sm:text-xs text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-md border border-green-100 dark:border-green-800 shadow-sm whitespace-nowrap flex items-center">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                    Live Rates Applied
                </span>
            ) : (
                <button 
                    onClick={resetRates}
                    className={resetBtnClass}
                    title="Reset to weekly default rates"
                >
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-1.5 group-hover:scale-125 transition-transform"></span>
                    Manual Override <RotateCcw className="w-3 h-3 ml-1.5 opacity-70" />
                </button>
            )}
         </div>
         <div className={financialGrid}>
            <div>
                <label className={labelClass}>Ex. Rate</label>
                <div className="relative rounded-lg shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-gray-500 sm:text-sm font-bold">₩</span>
                    </div>
                    <input
                        type="number"
                        step="any"
                        value={input.exchangeRate}
                        onChange={(e) => updateField('exchangeRate', Number(e.target.value))}
                        className={`${inputClass} pl-8 bg-white focus:bg-white ${input.exchangeRate !== systemExchangeRate ? 'ring-1 ring-amber-300 dark:ring-amber-700' : ''}`}
                        inputMode="decimal"
                        autoComplete="off"
                    />
                </div>
            </div>
            <div>
                <label className={labelClass}>FSC %</label>
                <div className="relative rounded-lg shadow-sm">
                    <input
                        type="number"
                        step="0.01"
                        value={input.fscPercent}
                        onChange={(e) => updateField('fscPercent', Number(e.target.value))}
                        className={`${inputClass} pr-8 bg-white focus:bg-white ${input.fscPercent !== systemFscPercent ? 'ring-1 ring-amber-300 dark:ring-amber-700' : ''}`}
                        inputMode="decimal"
                        autoComplete="off"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-500 sm:text-sm font-bold">%</span>
                    </div>
                </div>
            </div>
            <div className={isMobileView ? "col-span-2" : ""}>
                <label className={labelClass}>Target Margin (%)</label>
                <div className="relative rounded-lg shadow-sm">
                    <input 
                    type="number" 
                    step="any"
                    value={input.marginPercent}
                    onChange={(e) => updateField('marginPercent', Number(e.target.value))}
                    className={`${inputClass} ${input.marginPercent < 10 ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300' : 'bg-white focus:bg-white dark:bg-gray-700'}`}
                    inputMode="decimal"
                    autoComplete="off"
                    />
                     <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <span className="text-gray-500 sm:text-sm font-bold">%</span>
                    </div>
                </div>
            </div>
         </div>
         
         <div className="mt-4 flex items-start text-xs text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-black/20 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700/50">
             <Info className="w-3.5 h-3.5 mr-2 mt-0.5 text-jways-500 flex-shrink-0" />
             <div className="space-y-0.5">
                 <p className="font-medium text-gray-700 dark:text-gray-300">Market Variable Updates</p>
                 <p className="leading-relaxed opacity-90">
                    환율(Ex. Rate)과 유류할증료(FSC) 모두 <span className="font-semibold text-gray-600 dark:text-gray-200">주간 단위</span>로 변동됩니다.
                    <span className="block text-[10px] opacity-75 mt-0.5 font-normal">
                        * Both Ex. Rate & FSC update weekly
                    </span>
                 </p>
             </div>
         </div>
      </div>

      {/* Cargo Details */}
      <div className={cardClass}>
        <div className="flex justify-between items-center mb-5 border-b border-gray-100 dark:border-gray-700 pb-2">
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center">
                <Package className="w-4 h-4 mr-2" />
                Cargo Details
            </h3>
            <button 
                onClick={addItem}
                className={addBoxBtnClass}
            >
                <Plus className="w-3 h-3 mr-1" /> Add Box
            </button>
        </div>
        
        <div className="space-y-6 sm:space-y-4">
          {input.items.map((item, idx) => (
            <div key={item.id} className={cargoGrid}>
               <div className="absolute -top-3 left-3 bg-gray-50 dark:bg-gray-700 px-2 text-xs font-bold text-gray-400 flex items-center">
                    <Box className="w-3 h-3 mr-1" />
                    Box #{idx + 1}
               </div>
               
               {/* Mobile Layout: Qty (4), Weight (6), Trash (2) */}
               {/* Desktop Layout: Qty (2), L(2), W(2), H(2), Wgt(3), Trash(1) */}

               {/* Quantity */}
               <div className={`col-span-4 ${!isMobileView ? 'sm:col-span-2' : ''}`}>
                 <label className={cargoLabelClass}>Qty</label>
                 <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))} className={`${inputClass} text-center`} inputMode="numeric" pattern="[0-9]*" />
               </div>

                {/* Weight - Moved up for mobile visibility */}
               <div className={`col-span-6 ${!isMobileView ? 'sm:col-span-3 sm:order-last md:order-none' : ''}`}>
                 <label className={cargoLabelClass}>Weight (kg)</label>
                 <input type="number" step="any" value={item.weight} onChange={(e) => updateItem(idx, 'weight', Number(e.target.value))} className={inputClass} inputMode="decimal" />
               </div>

                {/* Trash - Top right on mobile */}
               <div className={`col-span-2 ${!isMobileView ? 'sm:col-span-1' : ''} flex justify-end pb-1.5 sm:pb-2`}>
                 <button 
                    onClick={() => removeItem(idx)} 
                    className={`text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ${isMobileView ? 'p-3' : 'p-2'}`}
                    disabled={input.items.length === 1}
                 >
                    <Trash2 className={`${isMobileView ? 'w-6 h-6' : 'w-5 h-5'}`} />
                 </button>
               </div>

               {/* Dimensions - Row 2 on mobile */}
               <div className={`col-span-4 ${!isMobileView ? 'sm:col-span-2' : ''}`}>
                 <label className={cargoLabelClass}>L (cm)</label>
                 <input type="number" step="any" value={item.length} onChange={(e) => updateItem(idx, 'length', Number(e.target.value))} className={inputClass} inputMode="decimal" />
               </div>
               <div className={`col-span-4 ${!isMobileView ? 'sm:col-span-2' : ''}`}>
                 <label className={cargoLabelClass}>W (cm)</label>
                 <input type="number" step="any" value={item.width} onChange={(e) => updateItem(idx, 'width', Number(e.target.value))} className={inputClass} inputMode="decimal" />
               </div>
               <div className={`col-span-4 ${!isMobileView ? 'sm:col-span-2' : ''}`}>
                 <label className={cargoLabelClass}>H (cm)</label>
                 <input type="number" step="any" value={item.height} onChange={(e) => updateItem(idx, 'height', Number(e.target.value))} className={inputClass} inputMode="decimal" />
               </div>
               
            </div>
          ))}
        </div>
      </div>

      {/* Value Added Services */}
      <div className={cardClass}>
        <h3 className={sectionTitleClass}>Value Added Services</h3>
        <div className={twoColGrid}>
          <div>
            <label className={labelClass}>Special Packing</label>
            <div className="relative">
                <select 
                value={input.packingType}
                onChange={(e) => updateField('packingType', e.target.value as PackingType)}
                className={`${inputClass} appearance-none`}
                >
                {Object.values(PackingType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>
          </div>
          
          <div>
            <label className={labelClass}>Packing & Docs Cost Override (KRW)</label>
            <div className="relative">
                <input 
                    type="number" 
                    step="any"
                    value={input.manualPackingCost ?? ''}
                    onChange={(e) => updateField('manualPackingCost', e.target.value === '' ? undefined : Number(e.target.value))}
                    className={inputClass}
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
               <label className={labelClass}>Estimated Duty & Tax (KRW)</label>
               <input 
                type="number" 
                step="any"
                value={input.dutyTaxEstimate}
                onChange={(e) => updateField('dutyTaxEstimate', Number(e.target.value))}
                className={inputClass}
                inputMode="decimal"
                autoComplete="off"
               />
            </div>
          )}
        </div>
      </div>

    </div>
  );
};