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
    carrier = @input[:overseasCarrier] || 'UPS'
    volumetric_divisor = carrier == 'EMAX' ? 6000 : 5000

    # 1. Calculate Item Costs
    item_result = Calculators::ItemCost.call(
      items: @input[:items],
      packing_type: @input[:packingType] || 'NONE',
      manual_packing_cost: @input[:manualPackingCost],
      volumetric_divisor: volumetric_divisor
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

    # 3. Domestic Costs (Removed per User Request)
    # 4. Overseas Carrier Costs
    overseas_result = if carrier == 'DHL'
                        Calculators::DhlCost.call(
                          billable_weight: billable_weight, 
                          country: @input[:destinationCountry], 
                          fsc_percent: @input[:fscPercent] || DEFAULT_FSC_PERCENT
                        )
                      elsif carrier == 'EMAX'
                        Calculators::EmaxCost.call(
                          billable_weight: billable_weight, 
                          country: @input[:destinationCountry]
                        )
                      else
                        Calculators::UpsCost.call(
                          billable_weight: billable_weight, 
                          country: @input[:destinationCountry], 
                          fsc_percent: @input[:fscPercent] || DEFAULT_FSC_PERCENT
                        )
                      end

    overseas_total = overseas_result[:intl_base] + overseas_result[:intl_fsc] + overseas_result[:intl_war_risk] + item_result[:ups_surge_cost]

    # 5. Duty
    dest_duty = 0
    if @input[:incoterm] == 'DDP'
      dest_duty = @input[:dutyTaxEstimate] || 0
    end

    # 6. Totals
    total_cost_amount = packing_total + final_handling_fee + overseas_total + dest_duty

    quote_basis_cost = 0
    if ['EXW', 'FOB'].include?(@input[:incoterm])
      quote_basis_cost = packing_total + final_handling_fee
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
      appliedZone: overseas_result[:applied_zone],
      transitTime: overseas_result[:transit_time],
      domesticTruckType: "N/A",
      isFreightMode: false,
      warnings: user_warnings,
      breakdown: {
        domesticBase: 0,
        domesticSurcharge: 0,
        packingMaterial: item_result[:packing_material_cost],
        packingLabor: item_result[:packing_labor_cost],
        packingFumigation: packing_fumigation_cost,
        handlingFees: final_handling_fee,
        upsBase: overseas_result[:intl_base],
        upsFsc: overseas_result[:intl_fsc],
        upsWarRisk: overseas_result[:intl_war_risk],
        upsSurge: item_result[:ups_surge_cost],
        destDuty: dest_duty,
        totalCost: total_cost_amount
      }
    }
  end
end
