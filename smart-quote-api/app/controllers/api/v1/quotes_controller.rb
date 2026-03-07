require "csv"

module Api
  module V1
    class QuotesController < ApplicationController
      include JwtAuthenticatable

      before_action :authenticate_user!, except: [ :calculate ]

      # POST /api/v1/quotes/calculate (public - stateless)
      def calculate
        input = clean_params
        result = QuoteCalculator.call(input)
        render json: result
      end

      # POST /api/v1/quotes (calculate + save)
      def create
        input = clean_params
        result = QuoteCalculator.call(input)

        quote = current_user.quotes.new(
          **input_attributes(input),
          **result_attributes(result),
          items: input["items"] || input[:items],
          breakdown: result[:breakdown],
          warnings: result[:warnings] || [],
          notes: params[:notes],
          customer_id: params[:customerId]
        )

        if quote.save
          render json: quote_detail(quote), status: :created
        else
          render json: { error: { code: "VALIDATION_ERROR", message: quote.errors.full_messages.join(", ") } }, status: :unprocessable_entity
        end
      end

      # GET /api/v1/quotes
      def index
        quotes = scoped_quotes
                      .search_text(params[:q])
                      .by_destination(params[:destination_country])
                      .by_date_range(params[:date_from], params[:date_to])
                      .by_status(params[:status])
                      .page(params[:page] || 1)
                      .per([ (params[:per_page] || 20).to_i, 100 ].min)

        render json: {
          quotes: quotes.map { |q| quote_summary(q) },
          pagination: {
            currentPage: quotes.current_page,
            totalPages: quotes.total_pages,
            totalCount: quotes.total_count,
            perPage: quotes.limit_value
          }
        }
      end

      # GET /api/v1/quotes/:id
      def show
        quote = scoped_quotes.find(params[:id])
        render json: quote_detail(quote)
      rescue ActiveRecord::RecordNotFound
        render json: { error: { code: "NOT_FOUND", message: "Quote not found" } }, status: :not_found
      end

      # PATCH /api/v1/quotes/:id (status update only)
      def update
        quote = scoped_quotes.find(params[:id])
        permitted = params.permit(:status, :notes, :customer_id)

        if permitted[:status].present?
          unless %w[draft sent accepted rejected].include?(permitted[:status])
            return render json: { error: { code: "INVALID_STATUS", message: "Invalid status" } }, status: :unprocessable_entity
          end
        end

        if quote.update(permitted.to_h.transform_keys { |k| k.to_s.underscore })
          render json: quote_detail(quote)
        else
          render json: { error: { code: "VALIDATION_ERROR", message: quote.errors.full_messages.join(", ") } }, status: :unprocessable_entity
        end
      rescue ActiveRecord::RecordNotFound
        render json: { error: { code: "NOT_FOUND", message: "Quote not found" } }, status: :not_found
      end

      # POST /api/v1/quotes/:id/send_email
      def send_email
        quote = scoped_quotes.find(params[:id])
        email = params[:recipientEmail]
        name = params[:recipientName] || "Customer"
        message = params[:message]

        unless email.present? && email.match?(URI::MailTo::EMAIL_REGEXP)
          return render json: { error: { code: "INVALID_EMAIL", message: "Valid email required" } }, status: :unprocessable_entity
        end

        QuoteMailer.send_quote(quote, email, recipient_name: name, message: message).deliver_later
        quote.update(status: "sent") if quote.status == "draft"

        render json: { success: true, message: "Quote sent to #{email}" }
      rescue ActiveRecord::RecordNotFound
        render json: { error: { code: "NOT_FOUND", message: "Quote not found" } }, status: :not_found
      end

      # DELETE /api/v1/quotes/:id
      def destroy
        scoped_quotes.find(params[:id]).destroy
        head :no_content
      rescue ActiveRecord::RecordNotFound
        render json: { error: { code: "NOT_FOUND", message: "Quote not found" } }, status: :not_found
      end

      # GET /api/v1/quotes/export.csv
      def export
        quotes = scoped_quotes
                      .search_text(params[:q])
                      .by_destination(params[:destination_country])
                      .by_date_range(params[:date_from], params[:date_to])
                      .by_status(params[:status])

        csv_data = CSV.generate(headers: true) do |csv|
          csv << [ "Reference No", "Date", "Destination", "Incoterm", "Billable Weight (kg)",
                   "Total Cost (KRW)", "Quote Amount (KRW)", "Quote Amount (USD)", "Margin %", "Status" ]

          quotes.find_each do |q|
            csv << [
              q.reference_no,
              q.created_at.strftime("%Y-%m-%d"),
              q.destination_country,
              q.incoterm,
              q.billable_weight.to_f,
              q.total_cost_amount.to_i,
              q.total_quote_amount.to_i,
              q.total_quote_amount_usd.to_f.round(2),
              q.profit_margin.to_f,
              q.status
            ]
          end
        end

        send_data csv_data, filename: "quotes-#{Date.current}.csv", type: "text/csv"
      end

      private

      def scoped_quotes
        if current_user.role == "admin"
          Quote.recent
        else
          current_user.quotes.recent
        end
      end

      def clean_params
        params.permit(
          :originCountry, :destinationCountry, :destinationZip,
          :domesticRegionCode, :isJejuPickup,
          :incoterm, :packingType,
          :marginPercent, :dutyTaxEstimate,
          :exchangeRate, :fscPercent,
          :manualDomesticCost, :manualPackingCost, :manualSurgeCost,
          :overseasCarrier, :customerId,
          items: [ :id, :name, :quantity, :weight, :length, :width, :height ]
        ).to_h
      end

      def input_attributes(input)
        {
          origin_country: input["originCountry"] || input[:originCountry] || "KR",
          destination_country: input["destinationCountry"] || input[:destinationCountry],
          destination_zip: input["destinationZip"] || input[:destinationZip],
          domestic_region_code: input["domesticRegionCode"] || input[:domesticRegionCode] || "A",
          is_jeju_pickup: input["isJejuPickup"] || input[:isJejuPickup] || false,
          incoterm: input["incoterm"] || input[:incoterm],
          packing_type: input["packingType"] || input[:packingType] || "NONE",
          margin_percent: input["marginPercent"] || input[:marginPercent] || 15,
          duty_tax_estimate: input["dutyTaxEstimate"] || input[:dutyTaxEstimate] || 0,
          exchange_rate: input["exchangeRate"] || input[:exchangeRate],
          fsc_percent: input["fscPercent"] || input[:fscPercent],
          manual_domestic_cost: input["manualDomesticCost"] || input[:manualDomesticCost],
          manual_packing_cost: input["manualPackingCost"] || input[:manualPackingCost]
        }
      end

      def result_attributes(result)
        {
          total_quote_amount: result[:totalQuoteAmount],
          total_quote_amount_usd: result[:totalQuoteAmountUSD],
          total_cost_amount: result[:totalCostAmount],
          profit_amount: result[:profitAmount],
          profit_margin: result[:profitMargin],
          billable_weight: result[:billableWeight],
          applied_zone: result[:appliedZone],
          domestic_truck_type: result[:domesticTruckType]
        }
      end

      def quote_summary(quote)
        {
          id: quote.id,
          referenceNo: quote.reference_no,
          destinationCountry: quote.destination_country,
          totalQuoteAmount: quote.total_quote_amount.to_i,
          totalQuoteAmountUsd: quote.total_quote_amount_usd.to_f.round(2),
          profitMargin: quote.profit_margin.to_f,
          billableWeight: quote.billable_weight.to_f,
          domesticTruckType: quote.domestic_truck_type,
          status: quote.status,
          customerName: quote.customer&.company_name,
          createdAt: quote.created_at.iso8601
        }
      end

      def quote_detail(quote)
        {
          id: quote.id,
          referenceNo: quote.reference_no,
          status: quote.status,
          notes: quote.notes,
          createdAt: quote.created_at.iso8601,
          updatedAt: quote.updated_at.iso8601,
          # Input
          originCountry: quote.origin_country,
          destinationCountry: quote.destination_country,
          destinationZip: quote.destination_zip,
          domesticRegionCode: quote.domestic_region_code,
          isJejuPickup: quote.is_jeju_pickup,
          incoterm: quote.incoterm,
          packingType: quote.packing_type,
          marginPercent: quote.margin_percent.to_f,
          dutyTaxEstimate: quote.duty_tax_estimate.to_i,
          exchangeRate: quote.exchange_rate.to_f,
          fscPercent: quote.fsc_percent.to_f,
          manualDomesticCost: quote.manual_domestic_cost&.to_i,
          manualPackingCost: quote.manual_packing_cost&.to_i,
          items: quote.items,
          # Result
          totalQuoteAmount: quote.total_quote_amount.to_i,
          totalQuoteAmountUSD: quote.total_quote_amount_usd.to_f.round(2),
          totalCostAmount: quote.total_cost_amount.to_i,
          profitAmount: quote.profit_amount.to_i,
          profitMargin: quote.profit_margin.to_f,
          billableWeight: quote.billable_weight.to_f,
          appliedZone: quote.applied_zone,
          domesticTruckType: quote.domestic_truck_type,
          warnings: quote.warnings,
          breakdown: quote.breakdown,
          customerId: quote.customer_id,
          customerName: quote.customer&.company_name
        }
      end
    end
  end
end
