class FixInterblueMarginToZero < ActiveRecord::Migration[8.0]
  def up
    # 인터블루에어엔씨 — 원가 공개 (margin 0%) 규칙 upsert
    # Model validation이 수정되었으므로 직접 update/insert 가능
    existing = MarginRule.find_by(match_email: "ibas@inter-airsea.co.kr")

    if existing
      existing.update_columns(margin_percent: 0)
      Rails.logger.info "[MIGRATION] Updated 인터블루 margin_percent to 0 (id=#{existing.id})"
    else
      MarginRule.create!(
        name: "인터블루 고정",
        rule_type: "flat",
        priority: 100,
        match_email: "ibas@inter-airsea.co.kr",
        margin_percent: 0,
        created_by: "system"
      )
      Rails.logger.info "[MIGRATION] Created 인터블루 margin rule with margin_percent=0"
    end
  end

  def down
    # 롤백 시 margin_percent를 5(최솟값)로 복원 — 비즈니스 판단 필요
    rule = MarginRule.find_by(match_email: "ibas@inter-airsea.co.kr")
    rule&.update_columns(margin_percent: 5)
  end
end
