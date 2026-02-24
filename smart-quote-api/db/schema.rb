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

ActiveRecord::Schema[8.0].define(version: 2026_02_14_000001) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "quotes", force: :cascade do |t|
    t.string "reference_no", limit: 20, null: false
    t.string "origin_country", limit: 3, default: "KR", null: false
    t.string "destination_country", limit: 3, null: false
    t.string "destination_zip", limit: 20
    t.string "domestic_region_code", limit: 1, default: "A", null: false
    t.boolean "is_jeju_pickup", default: false
    t.string "incoterm", limit: 5, null: false
    t.string "packing_type", limit: 20, default: "NONE", null: false
    t.decimal "margin_percent", precision: 5, scale: 2, null: false
    t.decimal "duty_tax_estimate", precision: 12, default: "0"
    t.decimal "exchange_rate", precision: 10, scale: 2, null: false
    t.decimal "fsc_percent", precision: 5, scale: 2, null: false
    t.decimal "manual_domestic_cost", precision: 12
    t.decimal "manual_packing_cost", precision: 12
    t.jsonb "items", null: false
    t.decimal "total_quote_amount", precision: 15, null: false
    t.decimal "total_quote_amount_usd", precision: 12, scale: 2, null: false
    t.decimal "total_cost_amount", precision: 15, null: false
    t.decimal "profit_amount", precision: 15, null: false
    t.decimal "profit_margin", precision: 5, scale: 2, null: false
    t.decimal "billable_weight", precision: 10, scale: 2, null: false
    t.string "applied_zone", limit: 50
    t.string "domestic_truck_type", limit: 50
    t.jsonb "breakdown", null: false
    t.jsonb "warnings", default: []
    t.string "status", limit: 20, default: "draft"
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_at"], name: "index_quotes_on_created_at", order: :desc
    t.index ["destination_country"], name: "index_quotes_on_destination_country"
    t.index ["reference_no"], name: "index_quotes_on_reference_no", unique: true
    t.index ["status"], name: "index_quotes_on_status"
  end
end
