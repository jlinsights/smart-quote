import React from 'react';
import { QuoteInput, CargoItem } from '@/types';
import { RouteSection } from './RouteSection';
import { FinancialSection } from './FinancialSection';
import { CargoSection } from './CargoSection';
import { ServiceSection } from './ServiceSection';

interface Props {
  input: QuoteInput;
  onChange: (newInput: QuoteInput) => void;
  isMobileView?: boolean;
  effectiveMarginPercent?: number;
  hideMargin?: boolean;
}

export const InputSection: React.FC<Props> = ({ input, onChange, isMobileView = false, effectiveMarginPercent, hideMargin }) => {

  const updateField = <K extends keyof QuoteInput>(key: K, value: QuoteInput[K]) => {
    onChange({ ...input, [key]: value });
  };

  const handleCargoChange = (newItems: CargoItem[]) => {
      updateField('items', newItems);
  };

  return (
    <div className="space-y-4">
      <RouteSection input={input} onFieldChange={updateField} isMobileView={isMobileView} />
      <CargoSection items={input.items} onChange={handleCargoChange} isMobileView={isMobileView} />
      <ServiceSection input={input} onFieldChange={updateField} isMobileView={isMobileView} />
      <FinancialSection input={input} onFieldChange={updateField} isMobileView={isMobileView} effectiveMarginPercent={effectiveMarginPercent} hideMargin={hideMargin} />
    </div>
  );
};