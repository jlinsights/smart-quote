class Quote < ApplicationRecord
  VALID_INCOTERMS = %w[EXW FOB C&F CIF DAP DDP].freeze
  VALID_PACKING_TYPES = %w[NONE WOODEN_BOX SKID VACUUM].freeze
  VALID_STATUSES = %w[draft sent accepted rejected].freeze

  validates :reference_no, presence: true, uniqueness: true
  validates :destination_country, presence: true, length: { maximum: 3 }
  validates :incoterm, presence: true, inclusion: { in: VALID_INCOTERMS }
  validates :packing_type, presence: true, inclusion: { in: VALID_PACKING_TYPES }
  validates :margin_percent, presence: true, numericality: { greater_than_or_equal_to: 0, less_than: 100 }
  validates :total_quote_amount, presence: true
  validates :total_cost_amount, presence: true
  validates :items, presence: true
  validates :breakdown, presence: true
  validates :status, inclusion: { in: VALID_STATUSES }

  scope :recent, -> { order(created_at: :desc) }
  scope :by_destination, ->(country) { where(destination_country: country) if country.present? }
  scope :by_status, ->(status) { where(status: status) if status.present? }
  scope :by_date_range, ->(from, to) {
    scope = all
    scope = scope.where("created_at >= ?", from) if from.present?
    scope = scope.where("created_at <= ?", Date.parse(to.to_s).end_of_day) if to.present?
    scope
  }
  scope :search_text, ->(q) {
    where("reference_no ILIKE :q OR destination_country ILIKE :q", q: "%#{q}%") if q.present?
  }

  before_validation :generate_reference_no, on: :create

  private

  def generate_reference_no
    return if reference_no.present?

    year = Time.current.year
    last = self.class.where("reference_no LIKE ?", "SQ-#{year}-%").order(:reference_no).last
    seq = last ? last.reference_no.split("-").last.to_i + 1 : 1
    self.reference_no = "SQ-#{year}-#{seq.to_s.rjust(4, '0')}"
  end
end
