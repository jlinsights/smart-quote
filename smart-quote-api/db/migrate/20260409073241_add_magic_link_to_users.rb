class AddMagicLinkToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :magic_link_token, :string
    add_index :users, :magic_link_token, unique: true
    add_column :users, :magic_link_token_expires_at, :datetime
  end
end
