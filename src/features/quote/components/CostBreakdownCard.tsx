import React, { useState } from 'react';
import { QuoteResult } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { Calculator, PackageCheck, HelpCircle, X, Plane, BoxSelect, TrendingUp, Info } from 'lucide-react';
import { UI_TEXT } from '@/config/text';
import { formatKRW } from '@/lib/format';
import { resultStyles } from './result-styles';

interface Props {
  result: QuoteResult;
  onMarginChange: (newMargin: number) => void;
  marginPercent: number;
  hideMargin?: boolean;
}

export const CostBreakdownCard: React.FC<Props> = ({ result, onMarginChange, marginPercent, hideMargin }) => {
  const [showPackingInfo, setShowPackingInfo] = useState(false);
  const { cardClass } = resultStyles;
  const { t } = useLanguage();

  const formatCurrency = formatKRW;

  const carrierTotalCost = result.breakdown.intlBase + result.breakdown.intlFsc + result.breakdown.intlWarRisk + result.breakdown.intlSurge;
  const totalInternalCost = result.totalCostAmount;

  return (
      <div className={cardClass}>
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex justify-between items-center transition-colors">
            <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center text-sm">
                <Calculator className="w-4 h-4 mr-2 text-jways-500" />
                {t('quote.logisticsCost')}
            </h3>
            <span className="text-[10px] font-bold px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-gray-600 dark:text-gray-300 uppercase tracking-wide">Internal</span>
        </div>
        
        <div className="p-5 space-y-6 text-sm">
            
            {/* 1. Internal Costs */}
            <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Cost Basis</h4>
                <div className="space-y-4 pl-3 border-l-2 border-dashed border-gray-200 dark:border-gray-700">
                    
                    {/* Packing */}
                    <div className="flex flex-col space-y-2">
                        <div className="flex justify-between items-center text-gray-700 dark:text-gray-300 group">
                            <div className="flex items-center">
                                <PackageCheck className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                                <span className="mr-2">Packing & Docs</span>
                                <button
                                    onClick={() => setShowPackingInfo(!showPackingInfo)}
                                    className="text-gray-400 hover:text-jways-500 transition-colors focus:outline-none"
                                    title="View Calculation Logic"
                                >
                                    <HelpCircle className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <span className="font-medium">{formatCurrency(
                                result.breakdown.packingMaterial + 
                                result.breakdown.packingLabor + 
                                result.breakdown.packingFumigation + 
                                result.breakdown.handlingFees
                            )}</span>
                        </div>

                        {/* Packing Info Box */}
                        {showPackingInfo && (
                            <div className="ml-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-xs text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-600 relative animate-in fade-in slide-in-from-top-1 duration-200">
                                <button 
                                    onClick={() => setShowPackingInfo(false)}
                                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                                <p className="font-bold mb-2 text-jways-700 dark:text-jways-300">{UI_TEXT.COST_BREAKDOWN.TITLE}</p>
                                <ul className="space-y-1.5 list-disc pl-4 marker:text-gray-300">
                                    <li>{UI_TEXT.COST_BREAKDOWN.MATERIAL}</li>
                                    <li>{UI_TEXT.COST_BREAKDOWN.LABOR}</li>
                                    <li>{UI_TEXT.COST_BREAKDOWN.FUMIGATION}</li>
                                    <li>{UI_TEXT.COST_BREAKDOWN.HANDLING}</li>
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Pick-up in Seoul (Conditional) */}
                    {result.breakdown.pickupInSeoul > 0 && (
                        <div className="flex justify-between items-center text-gray-700 dark:text-gray-300">
                            <div className="flex items-center">
                                <BoxSelect className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                                <span>Pick-up in Seoul</span>
                            </div>
                            <span className="font-medium">{formatCurrency(result.breakdown.pickupInSeoul)}</span>
                        </div>
                    )}

                    {/* Overseas Carrier */}
                    <div className="flex flex-col space-y-1">
                        <div className="flex justify-between items-start text-gray-700 dark:text-gray-300">
                            <div className="flex items-center">
                                <Plane className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                                <span>Intl. Freight ({result.carrier === 'EMAX' ? 'E-MAX' : result.carrier})</span>
                            </div>
                            <div className="text-right">
                                <span className="block font-medium">{formatCurrency(carrierTotalCost)}</span>
                            </div>
                        </div>
                        {/* Sub-breakdown: Base / FSC / War Risk / Surge */}
                        <div className="space-y-0.5 text-xs text-gray-500 dark:text-gray-400 pl-6">
                            <div className="flex justify-between">
                                <span>Base Rate</span>
                                <span>{formatCurrency(result.breakdown.intlBase)}</span>
                            </div>
                            {result.breakdown.intlFsc > 0 && (
                                <div className="flex justify-between">
                                    <span>FSC ({result.breakdown.intlBase > 0 ? Math.round(result.breakdown.intlFsc / result.breakdown.intlBase * 100 * 10) / 10 : 0}%)</span>
                                    <span>{formatCurrency(result.breakdown.intlFsc)}</span>
                                </div>
                            )}
                            {result.breakdown.intlWarRisk > 0 && (
                                <div className="hidden justify-between">
                                    <span>War Risk (5%)</span>
                                    <span>{formatCurrency(result.breakdown.intlWarRisk)}</span>
                                </div>
                            )}
                            {result.breakdown.intlSurge > 0 && (
                                <div className="flex justify-between text-amber-600 dark:text-amber-500">
                                    <div className="flex items-center">
                                        <BoxSelect className="w-3 h-3 mr-1" />
                                        <span>Demand/Surge/War Risk</span>
                                    </div>
                                    <span>{formatCurrency(result.breakdown.intlSurge)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* DDP Duty (Conditional) */}
                    {result.breakdown.destDuty > 0 && (
                         <div className="flex justify-between items-center text-gray-700 dark:text-gray-300">
                             <div className="flex items-center pl-6">
                                <span>Destination Duty</span>
                             </div>
                             <span className="font-medium">{formatCurrency(result.breakdown.destDuty)}</span>
                         </div>
                    )}
                </div>
                
                {/* Total Internal Cost Line */}
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 font-bold text-gray-800 dark:text-white">
                    <span className="pl-3">Total Internal Cost</span>
                    <span>{formatCurrency(totalInternalCost)}</span>
                </div>
            </div>

            {/* 2. Margin & Final Price */}
            <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{t('quote.pricingStrategy')}</h4>
                <div className="bg-jways-50 dark:bg-jways-900/20 p-4 rounded-xl space-y-3 border border-jways-100 dark:border-jways-800/30">
                     
                     {!hideMargin && (
                     <div className="flex justify-between items-center text-green-700 dark:text-green-400">
                        <div className="flex items-center">
                            <TrendingUp className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="mr-2 font-medium">{t('quote.margin')}</span>

                            {/* Interactive Margin Input (%) */}
                            <div className="relative rounded-md shadow-sm w-28">
                                <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={marginPercent}
                                    onChange={(e) => onMarginChange(Number(e.target.value))}
                                    className="focus:ring-jways-500 focus:border-jways-500 block w-full text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white pr-6 py-1.5 text-right font-bold"
                                    inputMode="decimal"
                                />
                                <div className="pointer-events-none absolute inset-y-0 right-0 pr-2 flex items-center text-gray-500 text-xs">%</div>
                            </div>
                            <span className="ml-2 text-xs text-gray-400">({result.profitMargin}%)</span>
                        </div>
                        <span className="font-bold">+ {formatCurrency(result.profitAmount)}</span>
                    </div>
                    )}
                    
                    <div className={`flex justify-between items-center pt-3 ${hideMargin ? '' : 'border-t border-jways-200 dark:border-jways-700/50'}`}>
                        <span className="text-jways-900 dark:text-jways-100 font-extrabold text-lg">{t('quote.finalPrice')}</span>
                        <div className="flex flex-col items-end">
                            <span className="text-jways-900 dark:text-jways-100 font-extrabold text-lg">{formatCurrency(result.totalQuoteAmount)}</span>
                            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                                ({t('quote.approx')} ${result.totalQuoteAmountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                            </span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700/50 px-5 py-3 text-xs text-gray-500 dark:text-gray-400 flex items-start transition-colors">
             <Info className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5 text-gray-400" />
             <p className="leading-relaxed">
                 {UI_TEXT.COST_BREAKDOWN.DISCLAIMER}
             </p>
        </div>
      </div>
  );
};
