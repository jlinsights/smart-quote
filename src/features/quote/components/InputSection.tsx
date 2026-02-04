import React from 'react';
import { QuoteInput, CargoItem } from '@/types';
import { DEFAULT_EXCHANGE_RATE, DEFAULT_FSC_PERCENT } from '@/config/rates';
import { RouteSection } from './RouteSection';
import { FinancialSection } from './FinancialSection';
import { CargoSection } from './CargoSection';
import { ServiceSection } from './ServiceSection';

interface Props {
  input: QuoteInput;
  onChange: (newInput: QuoteInput) => void;
  isMobileView?: boolean;
}

export const InputSection: React.FC<Props> = ({ input, onChange, isMobileView = false }) => {

  const updateField = <K extends keyof QuoteInput>(key: K, value: QuoteInput[K]) => {
    onChange({ ...input, [key]: value });
  };

  const resetRates = () => {
    onChange({ 
        ...input, 
        exchangeRate: DEFAULT_EXCHANGE_RATE, 
        fscPercent: DEFAULT_FSC_PERCENT 
    });
  };

  const handleCargoChange = (newItems: CargoItem[]) => {
      updateField('items', newItems);
  };

  return (
    <div className="space-y-6">
      <RouteSection input={input} onFieldChange={updateField} isMobileView={isMobileView} />
      <FinancialSection input={input} onFieldChange={updateField} resetRates={resetRates} isMobileView={isMobileView} />
      <CargoSection items={input.items} onChange={handleCargoChange} isMobileView={isMobileView} />
      <ServiceSection input={input} onFieldChange={updateField} isMobileView={isMobileView} />
    </div>
  );
};