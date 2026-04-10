class AddMagicLinkDigestToUsers < ActiveRecord::Migration[8.0]
  def change
    # Invalidate any in-flight plaintext tokens before switching to digest storage.
    # The TTL is 15 minutes, so at most a handful of active tokens are affected.
    reversible do |dir|
      dir.up do
        execute <<~SQL.squish
          UPDATE users
          SET magic_link_token = NULL,
              magic_link_token_expires_at = NULL
          WHERE magic_link_token IS NOT NULL
        SQL
      end
    end

    add_column :users, :magic_link_token_digest, :string
    add_index  :users, :magic_link_token_digest, unique: true
  end
end
