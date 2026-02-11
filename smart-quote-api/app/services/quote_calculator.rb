class QuoteCalculator
  include Constants::Rates
  include Constants::BusinessRules

  def self.call(input)
    new(input).call
  end

  def initialize(input)
    # input is expected to be a Hash with symbol keys, converting from params if needed
    @input = input.deep_symbolize_keys
  end

  def call
    # 1. Calculate Item Costs
    item_result = Calculators::ItemCost.call(
      items: @input[:items],
      packing_type: @input[:packingType] || 'NONE',
      manual_packing_cost: @input[:manualPackingCost]
    )

    packing_fumigation_cost = 0
    if (@input[:packingType] || 'NONE') != 'NONE'
      packing_fumigation_cost = FUMIGATION_FEE
    end

    final_handling_fee = HANDLING_FEE
    if @input[:manualPackingCost] && @input[:manualPackingCost] >= 0
      packing_fumigation_cost = 0
      final_handling_fee = 0
    end

    packing_total = item_result[:packing_material_cost] + item_result[:packing_labor_cost] + packing_fumigation_cost

    # 2. Billable Weight
    billable_weight = [item_result[:total_actual_weight], item_result[:total_packed_volumetric_weight]].max
    user_warnings = item_result[:warnings].dup

    if item_result[:total_packed_volumetric_weight] > item_result[:total_actual_weight] * 1.2
      user_warnings << "High Volumetric Weight Detected (>20% over actual). Consider Repacking."
    end

    # 3. Domestic Costs
    is_jeju_pickup = @input[:isJejuPickup] || false
    domestic_region_code = @input[:domesticRegionCode] || 'A'
    total_items_count = @input[:items].sum { |i| i[:quantity].to_i }
    
    domestic_result = Calculators::DomesticCost.call(
      total_actual_weight: item_result[:total_actual_weight],
      total_cbm: item_result[:total_cbm],
      region_code: domestic_region_code,
      is_jeju_pickup: is_jeju_pickup,
      manual_domestic_cost: @input[:manualDomesticCost],
      item_count: total_items_count
    )
    user_warnings.concat(domestic_result[:warnings])

    # 4. UPS Costs
    ups_result = Calculators::UpsCost.call(
      billable_weight: billable_weight, 
      country: @input[:destinationCountry], 
      fsc_percent: @input[:fscPercent] || DEFAULT_FSC_PERCENT
    )
    ups_total = ups_result[:ups_base] + ups_result[:ups_fsc] + ups_result[:ups_war_risk] + item_result[:ups_surge_cost]

    # 5. Duty
    dest_duty = 0
    if @input[:incoterm] == 'DDP'
      dest_duty = @input[:dutyTaxEstimate] || 0
    end

    # 6. Totals
    domestic_total = domestic_result[:domestic_base] + domestic_result[:domestic_surcharge]
    total_cost_amount = domestic_total + packing_total + final_handling_fee + ups_total + dest_duty

    quote_basis_cost = 0
    if ['EXW', 'FOB'].include?(@input[:incoterm])
      quote_basis_cost = domestic_total + packing_total + final_handling_fee
      user_warnings << "Collect Term: International Freight calculated for reference but may be billed to Consignee/Partner."
    else
      quote_basis_cost = total_cost_amount
    end

    # 7. Margin & Revenue
    margin_percent = @input[:marginPercent] || INITIAL_MARGIN
    safe_margin_percent = [ [margin_percent, 0].max, 99 ].min
    margin_rate = safe_margin_percent / 100.0

    target_revenue = 0
    if margin_rate < 1
      target_revenue = quote_basis_cost / (1 - margin_rate)
    else
      target_revenue = quote_basis_cost * 2
      user_warnings << "Invalid margin rate. Defaulted to markup."
    end

    margin_amount = target_revenue - quote_basis_cost
    total_quote_amount = (target_revenue / 100.0).ceil * 100

    exchange_rate = @input[:exchangeRate] || DEFAULT_EXCHANGE_RATE
    total_quote_amount_usd = total_quote_amount / exchange_rate.to_f

    if margin_percent < 10
      user_warnings << "Low Margin Alert: Profit margin is below 10%. Approval required."
    end

    {
      totalQuoteAmount: total_quote_amount,
      totalQuoteAmountUSD: total_quote_amount_usd,
      totalCostAmount: total_cost_amount,
      profitAmount: margin_amount,
      profitMargin: margin_percent,
      currency: 'KRW',
      totalActualWeight: item_result[:total_actual_weight],
      totalVolumetricWeight: item_result[:total_packed_volumetric_weight],
      billableWeight: billable_weight,
      appliedZone: ups_result[:applied_zone],
      transitTime: ups_result[:transit_time],
      domesticTruckType: domestic_result[:truck_type],
      isFreightMode: domestic_result[:truck_type].include?("Truck"),
      warnings: user_warnings,
      breakdown: {
        domesticBase: domestic_result[:domestic_base],
        domesticSurcharge: domestic_result[:domestic_surcharge],
        packingMaterial: item_result[:packing_material_cost],
        packingLabor: item_result[:packing_labor_cost],
        packingFumigation: packing_fumigation_cost,
        handlingFees: final_handling_fee,
        upsBase: ups_result[:ups_base],
        upsFsc: ups_result[:ups_fsc],
        upsWarRisk: ups_result[:ups_war_risk],
        upsSurge: item_result[:ups_surge_cost],
        destDuty: dest_duty,
        totalCost: total_cost_amount
      }
    }
  end
end
