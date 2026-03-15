module Api
  module V1
    class ChatController < ApplicationController
      include JwtAuthenticatable
      before_action :authenticate_user!

      # POST /api/v1/chat
      def create
        messages = params.permit(messages: [:role, :content]).fetch(:messages, []).map(&:to_h)

        return render json: { error: { message: "Messages required" } }, status: :unprocessable_entity if messages.empty?

        api_key = ENV["ANTHROPIC_API_KEY"]
        unless api_key.present?
          Rails.logger.error "[CHAT] ANTHROPIC_API_KEY not configured"
          return render json: { error: { message: "AI service not configured. Please set ANTHROPIC_API_KEY." } }, status: :service_unavailable
        end

        # Build system prompt with logistics context
        system_prompt = build_system_prompt

        client = Anthropic::Client.new(api_key: api_key)

        response = client.messages.create(
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          system_: system_prompt,
          messages: messages.map { |m| { role: m["role"] || m[:role], content: m["content"] || m[:content] } }
        )

        reply = response.content&.first&.text || "No response generated"

        render json: { reply: reply }
      rescue Anthropic::Errors::Error => e
        Rails.logger.error "[CHAT] Anthropic error (#{e.class}): #{e.message}"
        render json: { error: { message: "AI service error: #{e.message.truncate(200)}" } }, status: :service_unavailable
      rescue StandardError => e
        Rails.logger.error "[CHAT] #{e.class}: #{e.message}\n#{e.backtrace&.first(5)&.join("\n")}"
        render json: { error: { message: "Chat service error: #{e.message.truncate(200)}" } }, status: :internal_server_error
      end

      private

      def build_system_prompt
        user_lang = current_user.nationality == "KR" ? "Korean" : "the user's language"
        <<~PROMPT
          You are Smart Quote Assistant, an AI customer support agent for Goodman GLS & J-Ways international logistics company.

          Your role:
          - Help users with international shipping quotes (UPS, DHL, EMAX carriers)
          - Answer questions about shipping zones, rates, packing, surcharges, and incoterms
          - Explain how to use the Smart Quote System features
          - Provide general logistics knowledge (customs, HS codes, shipping terms)
          - Be friendly, professional, and concise

          Context:
          - User: #{current_user.name || current_user.email} (#{current_user.company || 'individual'})
          - Role: #{current_user.role}
          - Supported carriers: UPS (Z1-Z10 zones), DHL (Z1-Z8 zones), EMAX (CN, VN)
          - Origin: South Korea (KR)
          - System features: Quote calculator, carrier comparison, PDF export, quote history

          Contact Information (provide when user asks about booking, pickup, actual shipment, wants to speak to a person, or needs direct assistance):
          - Account Manager: Charlie Lee (이창희 대리) — charlie@goodmangls.com
          - Office: 서울 강서구 화곡로68길 82(등촌동, 강서아이티밸리) 309호
          - Office Hours: Mon-Fri 09:00-18:00 KST

          Rules:
          - Respond in #{user_lang} by default, but match the language the user writes in
          - Keep responses concise (under 200 words unless detailed explanation requested)
          - If asked about specific rates or prices, direct them to use the quote calculator
          - Never make up shipping rates or delivery times
          - For account issues, suggest contacting the admin team
          - When user asks about actual booking, pickup scheduling, shipment arrangement, customs clearance help, or wants to talk to someone directly, provide Charlie Lee's contact info
          - Always include both name and email when sharing contact
        PROMPT
      end
    end
  end
end
