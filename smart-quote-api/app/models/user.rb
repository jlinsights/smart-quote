class User < ApplicationRecord
  has_secure_password

  has_many :quotes, dependent: :nullify
  has_many :customers, dependent: :nullify

  validates :email, presence: true,
                    uniqueness: { case_sensitive: false },
                    format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :role, presence: true, inclusion: { in: %w[admin user member] }
  validate :networks_must_be_valid

  VALID_NETWORKS = %w[WCA MPL EAN JCtrans].freeze

  after_initialize :set_default_role, if: :new_record?
  validates :password, length: { minimum: 6 }, if: :password_required?

  before_save :downcase_email

  def generate_magic_link_token!
    self.magic_link_token = SecureRandom.urlsafe_base64(32)
    self.magic_link_token_expires_at = 15.minutes.from_now
    save!
    magic_link_token
  end

  def magic_link_valid?(token)
    magic_link_token.present? &&
      magic_link_token == token &&
      magic_link_token_expires_at > Time.current
  end

  def consume_magic_link_token!
    update!(magic_link_token: nil, magic_link_token_expires_at: nil)
  end

  private

  def set_default_role
    self.role ||= "user"
  end

  def downcase_email
    self.email = email.downcase.strip
  end

  def password_required?
    new_record? || password.present?
  end

  def networks_must_be_valid
    return if networks.blank?

    invalid = networks - VALID_NETWORKS
    if invalid.any?
      errors.add(:networks, "contains invalid values: #{invalid.join(', ')}")
    end
  end
end
