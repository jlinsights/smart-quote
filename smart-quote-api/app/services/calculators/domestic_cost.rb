module Calculators
  class DomesticCost
    include Constants::Rates
    include Constants::BusinessRules

    def self.call(total_actual_weight:, total_cbm:, region_code:, is_jeju_pickup:, manual_domestic_cost: nil, item_count: 1)
      new(total_actual_weight, total_cbm, region_code, is_jeju_pickup, manual_domestic_cost, item_count).call
    end

    def initialize(total_actual_weight, total_cbm, region_code, is_jeju_pickup, manual_domestic_cost, item_count)
      @total_actual_weight = total_actual_weight
      @total_cbm = total_cbm
      @region_code = region_code
      @is_jeju_pickup = is_jeju_pickup
      @manual_domestic_cost = manual_domestic_cost
      @item_count = item_count
    end

    def call
      domestic_base = 0
      domestic_surcharge = 0
      truck_type = "Parcel/Small"
      warnings = []

      rates = DOMESTIC_RATES[@region_code] || DOMESTIC_RATES['A']

      tier_index = TRUCK_TIER_LIMITS.find_index do |limit|
        @total_actual_weight <= limit[:maxWeight] && @total_cbm <= limit[:maxCBM]
      end

      if tier_index.nil?
        tier_index = TRUCK_TIER_LIMITS.length - 1
        truck_type = "11t Truck (Overweight)"
        warnings << "Cargo exceeds 11t. Multiple trucks may be required. Quoted at max single truck rate."
      else
        truck_type = TRUCK_TIER_LIMITS[tier_index][:label]
      end

      selected_rate = rates[tier_index]

      if @manual_domestic_cost && @manual_domestic_cost > 0
        domestic_base = @manual_domestic_cost
        truck_type = "#{truck_type} (Manual Rate)"
      else
        if selected_rate == 0
          upgraded_index = -1
          ((tier_index + 1)...rates.length).each do |i|
            if rates[i] > 0
              selected_rate = rates[i]
              upgraded_index = i
              break
            end
          end

          if upgraded_index != -1
            domestic_base = selected_rate
            truck_type = "#{TRUCK_TIER_LIMITS[upgraded_index][:label]} (Auto-Upgrade)"
            warnings << "Standard rate unavailable for Region #{@region_code}. Defaulted to #{TRUCK_TIER_LIMITS[upgraded_index][:label]}. Please negotiate and enter 'Domestic Cost' manually."
            tier_index = upgraded_index
          else
            warnings << "No valid domestic rate found for Region #{@region_code}."
          end
        else
          domestic_base = selected_rate
        end
      end

      if @is_jeju_pickup
        if tier_index >= 2
          domestic_surcharge = domestic_base * 1.0
          warnings << "Jeju/Island Pickup: 100% Surcharge applied for ferry and remote trucking."
        else
          domestic_surcharge = 3000 * @item_count
          domestic_surcharge = 50000 if domestic_surcharge == 0
          warnings << "Jeju/Island Pickup: Parcel surcharge applied."
        end
      end

      {
        domestic_base: domestic_base,
        domestic_surcharge: domestic_surcharge,
        truck_type: truck_type,
        warnings: warnings
      }
    end
  end
end
