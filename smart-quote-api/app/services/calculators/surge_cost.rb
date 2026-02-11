module Calculators
  class SurgeCost
    include Constants::BusinessRules
    include Constants::Rates

    def self.call(length:, width:, height:, weight:, packing_type:, item_index:)
      new(length, width, height, weight, packing_type, item_index).call
    end

    def initialize(length, width, height, weight, packing_type, item_index)
      @length = length
      @width = width
      @height = height
      @weight = weight
      @packing_type = packing_type
      @item_index = item_index
    end

    def call
      surge_cost = 0
      warnings = []

      sorted_dims = [@length, @width, @height].sort.reverse
      longest = sorted_dims[0]
      second_longest = sorted_dims[1]
      actual_girth = longest + (2 * second_longest) + (2 * sorted_dims[2])

      package_surge_applied = false
      surge_reason = ""

      # Over Max Limits
      if longest > SURGE_THRESHOLDS[:MAX_LIMIT_LENGTH_CM] || @weight > 70 || actual_girth > SURGE_THRESHOLDS[:MAX_LIMIT_GIRTH_CM]
        surge_cost += SURGE_RATES[:OVER_MAX]
        warnings << "Box ##{@item_index + 1}: Exceeds Max Limits (L>#{SURGE_THRESHOLDS[:MAX_LIMIT_LENGTH_CM]}cm or >70kg). Heavy penalty applied."
        package_surge_applied = true
      elsif actual_girth > SURGE_THRESHOLDS[:LPS_LENGTH_GIRTH_CM]
        surge_cost += SURGE_RATES[:LARGE_PACKAGE]
        surge_reason = "Large Package (L+Girth > 300cm)"
        package_surge_applied = true
      end

      if !package_surge_applied || surge_reason.include?("Large Package")
        if @weight > SURGE_THRESHOLDS[:AHS_WEIGHT_KG]
          surge_cost += SURGE_RATES[:AHS_WEIGHT]
          if !package_surge_applied
            surge_reason = "AHS Weight (>25kg)"
          else
            surge_reason += " + AHS Weight"
          end
          package_surge_applied = true
        elsif !surge_reason.include?("Large Package")
          if longest > SURGE_THRESHOLDS[:AHS_DIM_LONG_SIDE_CM] || second_longest > SURGE_THRESHOLDS[:AHS_DIM_SECOND_SIDE_CM]
            surge_cost += SURGE_RATES[:AHS_DIMENSION]
            surge_reason = "AHS Dim (L>122 or W>76)"
            package_surge_applied = true
          elsif ['WOODEN_BOX', 'SKID'].include?(@packing_type) # Assuming packing_type is string
             surge_cost += SURGE_RATES[:AHS_DIMENSION]
             surge_reason = "AHS Packing (Wood/Skid)"
             package_surge_applied = true
          end
        end
      end

      if package_surge_applied && warnings.empty?
        warnings << "Box ##{@item_index + 1}: #{surge_reason} applied."
      end

      { surge_cost: surge_cost, warnings: warnings }
    end
  end
end
