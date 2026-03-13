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
      volumetric_divisor: volumetric_divisor,
      carrier: carrier
    )

    packing_fumigation_cost = 0
    if (@input[:packingType] || 'NONE') != 'NONE'
      packing_fumigation_cost = FUMIGATION_FEE
    end

    final_handling_fee = 0
    # Packing & Docs = user-entered manualPackingCost only. No auto handling fee.
    # When manualPackingCost is set: material=override, labor=0, fumigation=0, handling=0
    # When manualPackingCost is empty: material=auto, labor=auto, fumigation=auto, handling=0
    if @input[:manualPackingCost] && @input[:manualPackingCost] >= 0
      packing_fumigation_cost = 0
    end

    packing_total = item_result[:packing_material_cost] + item_result[:packing_labor_cost] + packing_fumigation_cost

    # 2. Billable Weight
    billable_weight = [item_result[:total_actual_weight], item_result[:total_packed_volumetric_weight]].max
    user_warnings = item_result[:warnings].dup

    if item_result[:total_packed_volumetric_weight] > item_result[:total_actual_weight] * 1.2
      user_warnings << "High Volumetric Weight Detected (>20% over actual). Consider Repacking."
    end

    # EMAX only services CN/VN routes from Korea
    if carrier == 'EMAX' && !['CN', 'VN'].include?(@input[:destinationCountry])
      user_warnings << "EMAX only services China (CN) and Vietnam (VN). Using VN fallback rate — verify with carrier."
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

    # System surcharges from DB (War Risk, PSS, EBS, etc.)
    surcharge_result = SurchargeResolver.calculate_total(
      carrier: carrier,
      country: @input[:destinationCountry],
      zone: overseas_result[:applied_zone],
      intl_base: overseas_result[:intl_base]
    )
    system_surcharge_total = surcharge_result[:total]

    # Manual surge: additional on top of system surcharges
    manual_surge_cost = @input[:manualSurgeCost] || 0
    surge_cost = system_surcharge_total + manual_surge_cost
    overseas_total = overseas_result[:intl_base] + overseas_result[:intl_fsc] + overseas_result[:intl_war_risk] + surge_cost

    # 5. Duty
    dest_duty = 0
    if @input[:incoterm] == 'DDP'
      dest_duty = @input[:dutyTaxEstimate] || 0
    end

    # 5a. Extra Pick-up in Seoul cost
    pickup_in_seoul = @input[:pickupInSeoulCost] || 0

    # 6. Totals
    total_cost_amount = packing_total + final_handling_fee + overseas_total + dest_duty + pickup_in_seoul

    quote_basis_cost = 0
    if ['EXW', 'FOB'].include?(@input[:incoterm])
      quote_basis_cost = packing_total + final_handling_fee
      user_warnings << "Collect Term: International Freight calculated for reference but may be billed to Consignee/Partner."
    else
      quote_basis_cost = total_cost_amount
    end

    # 7. Margin & Revenue (%-based, aligned with frontend calculationService.ts)
    exchange_rate = @input[:exchangeRate] || DEFAULT_EXCHANGE_RATE
    safe_margin_percent = [(@input[:marginPercent] || 15).to_f, 0].max

    # Revenue = Cost / (1 - margin%/100)
    target_revenue = if safe_margin_percent < 100
                       quote_basis_cost / (1 - (safe_margin_percent / 100.0))
                     else
                       quote_basis_cost
                     end

    margin_amount = target_revenue - quote_basis_cost
    total_quote_amount = (target_revenue / 100.0).ceil * 100
    total_quote_amount_usd = total_quote_amount / exchange_rate.to_f

    # Derive effective margin % (recalculated after rounding)
    effective_margin_percent = total_quote_amount > 0 ? ((total_quote_amount - quote_basis_cost) / total_quote_amount.to_f) * 100 : 0

    if effective_margin_percent < 10
      user_warnings << "Low Margin Alert: Profit margin is below 10%. Approval required."
    end

    {
      totalQuoteAmount: total_quote_amount,
      totalQuoteAmountUSD: total_quote_amount_usd,
      totalCostAmount: total_cost_amount,
      profitAmount: margin_amount,
      profitMargin: effective_margin_percent.round(2),
      currency: 'KRW',
      totalActualWeight: item_result[:total_actual_weight],
      totalVolumetricWeight: item_result[:total_packed_volumetric_weight],
      billableWeight: billable_weight,
      appliedZone: overseas_result[:applied_zone],
      transitTime: overseas_result[:transit_time],
      carrier: carrier,
      warnings: user_warnings,
      breakdown: {
        packingMaterial: item_result[:packing_material_cost],
        packingLabor: item_result[:packing_labor_cost],
        packingFumigation: packing_fumigation_cost,
        handlingFees: final_handling_fee,
        intlBase: overseas_result[:intl_base],
        intlFsc: overseas_result[:intl_fsc],
        intlWarRisk: overseas_result[:intl_war_risk],
        intlSurge: surge_cost,
        intlManualSurge: manual_surge_cost,
        intlSystemSurcharge: system_surcharge_total,
        appliedSurcharges: surcharge_result[:applied].map { |s|
          { code: s[:code], name: s[:name], nameKo: s[:name_ko], amount: s[:applied_amount], chargeType: s[:charge_type], sourceUrl: s[:source_url] }
        },
        pickupInSeoul: pickup_in_seoul,
        destDuty: dest_duty,
        totalCost: total_cost_amount
      }
    }
  end
end
