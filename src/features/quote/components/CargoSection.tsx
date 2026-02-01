import React from 'react';
import { CargoItem } from '@/types';
import { Package, Plus, Box, Trash2 } from 'lucide-react';
import { inputStyles } from './input-styles';

interface Props {
  items: CargoItem[];
  onChange: (items: CargoItem[]) => void;
  isMobileView: boolean;
}

export const CargoSection: React.FC<Props> = ({ items, onChange, isMobileView }) => {
  const { inputClass, cardClass } = inputStyles;
  const ic = inputClass(isMobileView);

  const addItem = () => {
    const newItem: CargoItem = {
      id: Math.random().toString(36).substr(2, 9),
      width: 0, length: 0, height: 0, weight: 0, quantity: 1
    };
    onChange([...items, newItem]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      onChange(newItems);
    }
  };

  const updateItem = (index: number, field: keyof CargoItem, value: number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  // Cargo Grid: Improved gap and background
  const cargoGrid = `grid grid-cols-12 gap-x-3 gap-y-4 ${!isMobileView ? 'sm:gap-2' : ''} items-end p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl transition-colors border border-gray-200 dark:border-gray-600/50 relative`;
  
  // Helper for Cargo labels
  const cargoLabelClass = `block font-medium text-gray-500 dark:text-gray-400 mb-1 ${isMobileView ? 'text-sm' : 'text-xs'}`;

  // Button Styles with Touch Target Logic
  const addBoxBtnClass = isMobileView
    ? "text-sm flex items-center bg-jways-600 text-white px-4 py-2.5 rounded-lg shadow-sm hover:bg-jways-700 active:scale-95 transition-all font-medium"
    : "text-xs flex items-center bg-jways-600 text-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-jways-700 active:scale-95 transition-all font-medium";

  return (
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
        {items.map((item, idx) => (
          <div key={item.id} className={cargoGrid}>
             <div className="absolute -top-3 left-3 bg-gray-50 dark:bg-gray-700 px-2 text-xs font-bold text-gray-400 flex items-center">
                  <Box className="w-3 h-3 mr-1" />
                  Box #{idx + 1}
             </div>
             
             {/* Quantity */}
             <div className={`col-span-4 ${!isMobileView ? 'sm:col-span-2' : ''}`}>
               <label className={cargoLabelClass}>Qty</label>
               <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))} className={`${ic} text-center`} inputMode="numeric" pattern="[0-9]*" />
             </div>

             {/* Weight - Moved up for mobile visibility */}
             <div className={`col-span-6 ${!isMobileView ? 'sm:col-span-3 sm:order-last md:order-none' : ''}`}>
               <label className={cargoLabelClass}>Weight (kg)</label>
               <input type="number" step="any" value={item.weight} onChange={(e) => updateItem(idx, 'weight', Number(e.target.value))} className={ic} inputMode="decimal" />
             </div>

             {/* Trash - Top right on mobile */}
             <div className={`col-span-2 ${!isMobileView ? 'sm:col-span-1' : ''} flex justify-end pb-1.5 sm:pb-2`}>
               <button 
                  onClick={() => removeItem(idx)} 
                  className={`text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ${isMobileView ? 'p-3' : 'p-2'}`}
                  disabled={items.length === 1}
               >
                  <Trash2 className={`${isMobileView ? 'w-6 h-6' : 'w-5 h-5'}`} />
               </button>
             </div>

             {/* Dimensions - Row 2 on mobile */}
             <div className={`col-span-4 ${!isMobileView ? 'sm:col-span-2' : ''}`}>
               <label className={cargoLabelClass}>L (cm)</label>
               <input type="number" step="any" value={item.length} onChange={(e) => updateItem(idx, 'length', Number(e.target.value))} className={ic} inputMode="decimal" />
             </div>
             <div className={`col-span-4 ${!isMobileView ? 'sm:col-span-2' : ''}`}>
               <label className={cargoLabelClass}>W (cm)</label>
               <input type="number" step="any" value={item.width} onChange={(e) => updateItem(idx, 'width', Number(e.target.value))} className={ic} inputMode="decimal" />
             </div>
             <div className={`col-span-4 ${!isMobileView ? 'sm:col-span-2' : ''}`}>
               <label className={cargoLabelClass}>H (cm)</label>
               <input type="number" step="any" value={item.height} onChange={(e) => updateItem(idx, 'height', Number(e.target.value))} className={ic} inputMode="decimal" />
             </div>
             
          </div>
        ))}
      </div>
    </div>
  );
};
