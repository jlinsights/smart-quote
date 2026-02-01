import React, { useState } from 'react';
import { QuoteResult } from '@/types';
import { Calculator, Truck, Edit3, PackageCheck, HelpCircle, X, Plane, BoxSelect, TrendingUp, Info } from 'lucide-react';
import { resultStyles } from './result-styles';

interface Props {
  result: QuoteResult;
  onDomesticCostChange: (newCost: number) => void;
  onPackingCostChange: (newCost: number) => void;
  onMarginChange: (newMargin: number) => void;
}

export const CostBreakdownCard: React.FC<Props> = ({ result, onDomesticCostChange, onPackingCostChange, onMarginChange }) => {
  const [showPackingInfo, setShowPackingInfo] = useState(false);
  const { cardClass } = resultStyles;

  const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val);

  const packingCost = result.breakdown.packingMaterial + result.breakdown.packingLabor + result.breakdown.packingFumigation + result.breakdown.handlingFees;
  const upsTotalCost = result.breakdown.upsBase + result.breakdown.upsFsc + result.breakdown.upsWarRisk + result.breakdown.upsSurge;
  const totalInternalCost = result.totalCostAmount;

  return (
      <div className={cardClass}>
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex justify-between items-center transition-colors">
            <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center text-sm">
                <Calculator className="w-4 h-4 mr-2 text-jways-500" />
                Cost Breakdown
            </h3>
            <span className="text-[10px] font-bold px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-gray-600 dark:text-gray-300 uppercase tracking-wide">Internal</span>
        </div>
        
        <div className="p-5 space-y-6 text-sm">
            
            {/* 1. Internal Costs */}
            <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Cost Basis</h4>
                <div className="space-y-4 pl-3 border-l-2 border-dashed border-gray-200 dark:border-gray-700">
                    
                    {/* ez Domestic */}
                    <div className="flex justify-between items-start text-gray-700 dark:text-gray-300 group">
                        <div className="flex items-center">
                            <Truck className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                            <div className="flex flex-col">
                                <span>Domestic (ez)</span>
                                <span className="text-[10px] text-gray-400 mt-0.5 max-w-[120px] leading-tight">{result.domesticTruckType}</span>
                            </div>
                        </div>
                        <div className="text-right flex items-center">
                             {/* Manual Input for Domestic Cost */}
                             <div className="relative">
                                <input
                                    type="number"
                                    value={result.breakdown.domesticBase}
                                    onChange={(e) => onDomesticCostChange(Number(e.target.value))}
                                    className="w-24 text-right text-sm font-medium border-b border-gray-300 dark:border-gray-600 bg-transparent focus:border-jways-500 focus:ring-0 p-0 pr-1 hover:border-gray-400 transition-colors"
                                />
                                <Edit3 className="w-3 h-3 text-gray-300 absolute -right-4 top-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                             </div>
                        </div>
                    </div>

                    {/* Surcharge Line (if any) */}
                    {result.breakdown.domesticSurcharge > 0 && (
                        <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 text-xs pl-6">
                            <span>+ Island/Remote Surcharge</span>
                            <span>{formatCurrency(result.breakdown.domesticSurcharge)}</span>
                        </div>
                    )}

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
                            <div className="text-right flex items-center">
                                {/* Manual Input for Packing Cost */}
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={packingCost}
                                        onChange={(e) => onPackingCostChange(Number(e.target.value))}
                                        className="w-24 text-right text-sm font-medium border-b border-gray-300 dark:border-gray-600 bg-transparent focus:border-jways-500 focus:ring-0 p-0 pr-1 hover:border-gray-400 transition-colors"
                                    />
                                    <Edit3 className="w-3 h-3 text-gray-300 absolute -right-4 top-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
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
                                <p className="font-bold mb-2 text-jways-700 dark:text-jways-300">비용 산출 기준 (Calculation Basis)</p>
                                <ul className="space-y-1.5 list-disc pl-4 marker:text-gray-300">
                                    <li>
                                        <span className="font-semibold">자재비 (Material):</span> 화물 표면적(m²) × 15,000원
                                    </li>
                                    <li>
                                        <span className="font-semibold">인건비 (Labor):</span> 박스당 50,000원 (진공포장 시 1.5배)
                                    </li>
                                    <li>
                                        <span className="font-semibold">훈증비 (Fumigation):</span> 30,000원 (Packing 시 고정)
                                    </li>
                                    <li>
                                        <span className="font-semibold">핸들링 (Handling):</span> 35,000원 (수출통관/서류)
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* UPS International */}
                    <div className="flex flex-col space-y-1">
                        <div className="flex justify-between items-start text-gray-700 dark:text-gray-300">
                            <div className="flex items-center">
                                <Plane className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                                <span>Intl. Freight (UPS)</span>
                            </div>
                            <div className="text-right">
                                <span className="block font-medium">{formatCurrency(upsTotalCost)}</span>
                            </div>
                        </div>
                        {/* Breakdown of Surge Costs if they exist */}
                        {result.breakdown.upsSurge > 0 && (
                            <div className="flex justify-between items-center text-amber-600 dark:text-amber-500 text-xs pl-6 animate-pulse">
                                <div className="flex items-center">
                                    <BoxSelect className="w-3 h-3 mr-1" />
                                    <span>UPS Demand/Surge Fees</span>
                                </div>
                                <span>{formatCurrency(result.breakdown.upsSurge)}</span>
                            </div>
                        )}
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
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Pricing Strategy</h4>
                <div className="bg-jways-50 dark:bg-jways-900/20 p-4 rounded-xl space-y-3 border border-jways-100 dark:border-jways-800/30">
                     
                     <div className="flex justify-between items-center text-green-700 dark:text-green-400">
                        <div className="flex items-center">
                            <TrendingUp className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="mr-2 font-medium">Profit Margin</span>
                            
                            {/* Interactive Margin Input */}
                            <div className="relative rounded-md shadow-sm w-24">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={result.profitMargin}
                                    onChange={(e) => onMarginChange(Number(e.target.value))}
                                    className="focus:ring-jways-500 focus:border-jways-500 block w-full text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1.5 text-right font-bold"
                                />
                                <div className="pointer-events-none absolute inset-y-0 right-0 pr-8 flex items-center hidden">
                                </div>
                                <div className="pointer-events-none absolute inset-y-0 right-0 pr-2 flex items-center text-gray-500 text-xs">
                                    %
                                </div>
                            </div>
                        </div>
                        <span className="font-bold">+ {formatCurrency(result.profitAmount)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-jways-900 dark:text-jways-100 font-extrabold text-lg pt-3 border-t border-jways-200 dark:border-jways-700/50">
                        <span>Final Quote Price</span>
                        <span>{formatCurrency(result.totalQuoteAmount)}</span>
                    </div>
                </div>
            </div>

        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700/50 px-5 py-3 text-xs text-gray-500 dark:text-gray-400 flex items-start transition-colors">
             <Info className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5 text-gray-400" />
             <p className="leading-relaxed">
                 Prices include all estimated surcharges. Final invoice may vary based on actual measurements.
             </p>
        </div>
      </div>
  );
};
