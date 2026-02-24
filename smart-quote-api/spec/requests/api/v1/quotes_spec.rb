require "rails_helper"

RSpec.describe "Api::V1::Quotes", type: :request do
  let(:calculator_result) do
    {
      totalQuoteAmount: 1_500_000,
      totalQuoteAmountUSD: 1_150.50,
      totalCostAmount: 1_200_000,
      profitAmount: 300_000,
      profitMargin: 20.0,
      billableWeight: 15.5,
      appliedZone: "Z5",
      domesticTruckType: "1t Truck",
      breakdown: {
        domesticBase: 50_000,
        domesticSurcharge: 0,
        packingMaterial: 30_000,
        packingLabor: 20_000,
        packingFumigation: 10_000,
        handlingFees: 15_000,
        upsBase: 800_000,
        upsFsc: 120_000,
        upsWarRisk: 5_000,
        upsSurge: 10_000,
        destDuty: 0,
        totalCost: 1_060_000
      },
      warnings: []
    }
  end

  let(:valid_params) do
    {
      destinationCountry: "US",
      destinationZip: "10001",
      domesticRegionCode: "A",
      incoterm: "FOB",
      packingType: "NONE",
      marginUSD: 50.0,
      exchangeRate: 1300.0,
      fscPercent: 27.5,
      items: [
        {
          description: "Electronic Parts",
          quantity: 2,
          weightPerItem: 5.0,
          lengthCm: 40,
          widthCm: 30,
          heightCm: 20
        }
      ]
    }
  end

  before do
    allow(QuoteCalculator).to receive(:call).and_return(calculator_result)
  end

  def json
    JSON.parse(response.body)
  end

  describe "POST /api/v1/quotes" do
    it "creates a quote and returns 201" do
      post "/api/v1/quotes", params: valid_params, as: :json

      expect(response).to have_http_status(:created)
      expect(json["referenceNo"]).to match(/\ASQ-\d{4}-\d{4}\z/)
      expect(json["destinationCountry"]).to eq("US")
      expect(json["totalQuoteAmount"]).to eq(1_500_000)
      expect(json["totalQuoteAmountUSD"]).to eq(1_150.5)
      expect(json["totalCostAmount"]).to eq(1_200_000)
      expect(json["profitAmount"]).to eq(300_000)
      expect(json["appliedZone"]).to eq("Z5")
      expect(json["breakdown"]).to be_present
      expect(json["status"]).to eq("draft")
    end

    it "calls QuoteCalculator with input params" do
      post "/api/v1/quotes", params: valid_params, as: :json

      expect(QuoteCalculator).to have_received(:call)
    end

    context "when validation fails" do
      it "returns 422 with error details" do
        invalid_result = calculator_result.merge(totalQuoteAmount: nil, totalCostAmount: nil)
        allow(QuoteCalculator).to receive(:call).and_return(invalid_result)

        post "/api/v1/quotes", params: valid_params.merge(incoterm: "INVALID"), as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["error"]["code"]).to eq("VALIDATION_ERROR")
        expect(json["error"]["message"]).to be_present
      end
    end
  end

  describe "GET /api/v1/quotes" do
    before do
      create_list(:quote, 3)
    end

    it "returns paginated list of quotes" do
      get "/api/v1/quotes"

      expect(response).to have_http_status(:ok)
      expect(json["quotes"].length).to eq(3)
      expect(json["pagination"]).to include(
        "currentPage" => 1,
        "totalCount" => 3
      )
    end

    it "supports per_page parameter" do
      get "/api/v1/quotes", params: { per_page: 2 }

      expect(json["quotes"].length).to eq(2)
      expect(json["pagination"]["totalPages"]).to eq(2)
    end

    context "with filters" do
      it "filters by destination_country" do
        create(:quote, destination_country: "JP")

        get "/api/v1/quotes", params: { destination_country: "JP" }

        expect(json["quotes"].length).to eq(1)
        expect(json["quotes"].first["destinationCountry"]).to eq("JP")
      end

      it "filters by status" do
        create(:quote, :sent)

        get "/api/v1/quotes", params: { status: "sent" }

        json["quotes"].each do |q|
          expect(q["status"]).to eq("sent")
        end
      end

      it "filters by date range" do
        create(:quote, created_at: 30.days.ago)

        get "/api/v1/quotes", params: {
          date_from: 2.days.ago.to_date.to_s,
          date_to: Date.current.to_s
        }

        expect(json["quotes"].length).to eq(3)
      end

      it "searches by text query" do
        target = create(:quote, destination_country: "JP")

        get "/api/v1/quotes", params: { q: "JP" }

        refs = json["quotes"].map { |q| q["referenceNo"] }
        expect(refs).to include(target.reference_no)
      end
    end
  end

  describe "GET /api/v1/quotes/:id" do
    it "returns the quote detail" do
      quote = create(:quote)

      get "/api/v1/quotes/#{quote.id}"

      expect(response).to have_http_status(:ok)
      expect(json["id"]).to eq(quote.id)
      expect(json["referenceNo"]).to eq(quote.reference_no)
      expect(json["items"]).to be_present
      expect(json["breakdown"]).to be_present
    end

    it "returns 404 when quote not found" do
      get "/api/v1/quotes/0"

      expect(response).to have_http_status(:not_found)
      expect(json["error"]["code"]).to eq("NOT_FOUND")
    end
  end

  describe "DELETE /api/v1/quotes/:id" do
    it "deletes the quote and returns 204" do
      quote = create(:quote)

      expect {
        delete "/api/v1/quotes/#{quote.id}"
      }.to change(Quote, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end

    it "returns 404 when quote not found" do
      delete "/api/v1/quotes/0"

      expect(response).to have_http_status(:not_found)
      expect(json["error"]["code"]).to eq("NOT_FOUND")
    end
  end

  describe "GET /api/v1/quotes/export" do
    before do
      create_list(:quote, 3)
    end

    it "returns CSV data" do
      get "/api/v1/quotes/export"

      expect(response).to have_http_status(:ok)
      expect(response.content_type).to include("text/csv")

      csv_lines = response.body.split("\n")
      expect(csv_lines.first).to include("Reference No")
      expect(csv_lines.length).to eq(4) # header + 3 rows
    end

    it "applies filters to export" do
      create(:quote, destination_country: "JP")

      get "/api/v1/quotes/export", params: { destination_country: "JP" }

      csv_lines = response.body.split("\n")
      expect(csv_lines.length).to eq(2) # header + 1 JP row
      expect(csv_lines.last).to include("JP")
    end
  end
end
