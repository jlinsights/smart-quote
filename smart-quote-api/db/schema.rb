# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2026_03_05_133210) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "quotes", force: :cascade do |t|
    t.string "reference_no"
    t.string "status", default: "draft"
    t.text "notes"
    t.string "origin_country", default: "KR"
    t.string "destination_country"
    t.string "destination_zip"
    t.string "domestic_region_code"
    t.boolean "is_jeju_pickup"
    t.string "incoterm"
    t.string "packing_type"
    t.decimal "margin_percent"
    t.decimal "duty_tax_estimate"
    t.decimal "exchange_rate"
    t.decimal "fsc_percent"
    t.decimal "manual_domestic_cost"
    t.decimal "manual_packing_cost"
    t.jsonb "items"
    t.decimal "total_quote_amount"
    t.decimal "total_quote_amount_usd"
    t.decimal "total_cost_amount"
    t.decimal "profit_amount"
    t.decimal "profit_margin"
    t.decimal "billable_weight"
    t.string "applied_zone"
    t.string "domestic_truck_type"
    t.jsonb "warnings"
    t.jsonb "breakdown"
    t.bigint "user_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["reference_no"], name: "index_quotes_on_reference_no"
    t.index ["user_id"], name: "index_quotes_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "email"
    t.string "password_digest"
    t.string "name"
    t.string "company"
    t.string "nationality"
    t.string "role"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email"
  end

  add_foreign_key "quotes", "users"
end
