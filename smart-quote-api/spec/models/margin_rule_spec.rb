require "rails_helper"

RSpec.describe MarginRule, type: :model do
  describe "validations" do
    it { should validate_presence_of(:name) }
    it { should validate_length_of(:name).is_at_most(100) }
    it { should validate_presence_of(:rule_type) }
    it { should validate_inclusion_of(:rule_type).in_array(%w[flat weight_based]) }
    it { should validate_presence_of(:priority) }
    it { should validate_numericality_of(:priority).only_integer.is_greater_than_or_equal_to(0).is_less_than_or_equal_to(200) }
    it { should validate_presence_of(:margin_percent) }
    it { should validate_numericality_of(:margin_percent).is_greater_than_or_equal_to(5).is_less_than_or_equal_to(50) }
    it { should validate_numericality_of(:weight_min).is_greater_than_or_equal_to(0).allow_nil }
    it { should validate_numericality_of(:weight_max).is_greater_than(0).allow_nil }

    describe "weight_range_consistency" do
      it "is valid when weight_max > weight_min" do
        rule = build(:margin_rule, weight_min: 0, weight_max: 20)
        expect(rule).to be_valid
      end

      it "is invalid when weight_max <= weight_min" do
        rule = build(:margin_rule, weight_min: 20, weight_max: 10)
        expect(rule).not_to be_valid
        expect(rule.errors[:weight_max]).to include("must be greater than weight_min")
      end

      it "is invalid when weight_max equals weight_min" do
        rule = build(:margin_rule, weight_min: 20, weight_max: 20)
        expect(rule).not_to be_valid
      end

      it "allows nil weight_min and weight_max" do
        rule = build(:margin_rule, weight_min: nil, weight_max: nil)
        expect(rule).to be_valid
      end
    end

    describe "margin_percent range" do
      it "rejects margin below 5%" do
        rule = build(:margin_rule, margin_percent: 4)
        expect(rule).not_to be_valid
      end

      it "rejects margin above 50%" do
        rule = build(:margin_rule, margin_percent: 51)
        expect(rule).not_to be_valid
      end

      it "accepts margin at boundaries" do
        expect(build(:margin_rule, margin_percent: 5)).to be_valid
        expect(build(:margin_rule, margin_percent: 50)).to be_valid
      end
    end
  end

  describe "scopes" do
    let!(:active_rule) { create(:margin_rule, is_active: true, priority: 100) }
    let!(:inactive_rule) { create(:margin_rule, :inactive, priority: 50) }
    let!(:low_priority) { create(:margin_rule, is_active: true, priority: 0) }

    describe ".active" do
      it "returns only active rules" do
        expect(MarginRule.active).to include(active_rule, low_priority)
        expect(MarginRule.active).not_to include(inactive_rule)
      end
    end

    describe ".by_priority" do
      it "returns rules ordered by priority desc" do
        rules = MarginRule.by_priority
        expect(rules.first.priority).to be >= rules.last.priority
      end
    end
  end
end
