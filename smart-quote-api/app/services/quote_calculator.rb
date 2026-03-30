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

    # Packing & Docs = user-entered manualPackingCost only. No auto handling fee.
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

    # UPS Surge Fee (급증수수료) — auto-detect for Middle East / Israel destinations
    ups_surge_fee_result = nil
    if carrier == 'UPS'
      ups_surge_fee_result = Calculators::UpsSurgeFee.call(
        country: @input[:destinationCountry],
        billable_weight: billable_weight,
        fsc_percent: @input[:fscPercent] || DEFAULT_FSC_PERCENT
      )
    end

    # Manual surge: additional on top of system surcharges
    manual_surge_cost = @input[:manualSurgeCost] || 0
    ups_surge_total = ups_surge_fee_result ? ups_surge_fee_result[:total] : 0
    surge_cost = system_surcharge_total + manual_surge_cost + ups_surge_total

    # 5. Duty
    dest_duty = 0
    if @input[:incoterm] == 'DDP'
      dest_duty = @input[:dutyTaxEstimate] || 0
    end

    # 5a. Extra Pick-up in Seoul cost
    pickup_in_seoul = @input[:pickupInSeoulCost] || 0

    # 6. New Calculation Structure (synced with frontend calculationService.ts):
    #    Step 1: Base Rate (carrier tariff)
    #    Step 2: + Margin (on Base Rate only)
    #    Step 3: + FSC ((Base Rate + Margin) × FSC%)
    #    Step 4: + Add-ons (Packing, Seoul Pickup, Surcharges, Carrier Add-ons, Duty)
    #    = Final Quote

    exchange_rate = @input[:exchangeRate] || DEFAULT_EXCHANGE_RATE
    safe_margin_percent = [(@input[:marginPercent] || 15).to_f, 0].max
    base_rate = overseas_result[:intl_base]

    # Step 2: Margin on Base Rate
    base_with_margin = if safe_margin_percent < 100
                         base_rate / (1 - (safe_margin_percent / 100.0))
                       else
                         base_rate
                       end
    margin_amount = base_with_margin - base_rate

    # Step 3: FSC on (Base Rate + Margin) — EMAX has no FSC
    fsc_rate = carrier == 'EMAX' ? 0 : ((@input[:fscPercent] || 0) / 100.0)
    intl_fsc_new = (base_with_margin * fsc_rate).round

    # Step 4: Add-ons (no margin applied)
    add_on_total = packing_total + pickup_in_seoul + surge_cost + dest_duty + overseas_result[:intl_war_risk]

    # Collect term handling
    if ['EXW', 'FOB'].include?(@input[:incoterm])
      user_warnings << "Collect Term: International Freight calculated for reference but may be billed to Consignee/Partner."
    end

    # Final totals — costFsc is the actual FSC cost (without margin) paid to carrier
    cost_fsc = (base_rate * fsc_rate).round
    total_cost_amount = base_rate + cost_fsc + overseas_result[:intl_war_risk] + surge_cost + packing_total + dest_duty + pickup_in_seoul
    raw_quote_amount = base_with_margin + intl_fsc_new + add_on_total
    total_quote_amount = (raw_quote_amount / 100.0).ceil * 100
    total_quote_amount_usd = total_quote_amount / exchange_rate.to_f

    if safe_margin_percent < 10
      user_warnings << "Low Margin Alert: Profit margin is below 10%. Approval required."
    end

    {
      totalQuoteAmount: total_quote_amount,
      totalQuoteAmountUSD: total_quote_amount_usd,
      totalCostAmount: total_cost_amount,
      profitAmount: margin_amount,
      profitMargin: safe_margin_percent.round(2),
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
        handlingFees: 0,
        intlBase: overseas_result[:intl_base],
        intlFsc: intl_fsc_new,
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
