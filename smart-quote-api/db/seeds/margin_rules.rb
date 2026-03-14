return if MarginRule.exists?

MarginRule.create!([
  { name: "용성종합물류 고정", rule_type: "flat", priority: 100,
    match_email: "admin@yslogic.co.kr", margin_percent: 19, created_by: "system" },
  { name: "인터블루 ≥20kg", rule_type: "weight_based", priority: 90,
    match_email: "ibas@inter-airsea.co.kr", weight_min: 20, margin_percent: 19, created_by: "system" },
  { name: "인터블루 <20kg", rule_type: "weight_based", priority: 90,
    match_email: "ibas@inter-airsea.co.kr", weight_min: 0, weight_max: 19.99, margin_percent: 24, created_by: "system" },
  { name: "한국 국적 ≥20kg", rule_type: "weight_based", priority: 50,
    match_nationality: "KR", weight_min: 20, margin_percent: 19, created_by: "system" },
  { name: "한국 국적 <20kg", rule_type: "weight_based", priority: 50,
    match_nationality: "KR", weight_min: 0, weight_max: 19.99, margin_percent: 24, created_by: "system" },
  { name: "기본 ≥20kg", rule_type: "weight_based", priority: 0,
    weight_min: 20, margin_percent: 24, created_by: "system" },
  { name: "기본 <20kg", rule_type: "weight_based", priority: 0,
    weight_min: 0, weight_max: 19.99, margin_percent: 32, created_by: "system" },
])

Rails.logger.info "[SEED] Created #{MarginRule.count} margin rules"
