# Design: Dynamic Margin Rules

> PDCA Phase: **Design** | Created: 2026-03-08 | Level: Dynamic
> Plan Reference: `docs/01-plan/features/dynamic-margin-rules.plan.md`

---

## 1. System Architecture

### 1.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (React + Vite)                                      │
│                                                              │
│  ┌──────────────────────┐   ┌─────────────────────────────┐ │
│  │ QuoteCalculator.tsx   │   │ TargetMarginRulesWidget.tsx │ │
│  │ - useResolvedMargin() │   │ - useMarginRules()          │ │
│  │ - fallback logic      │   │ - CRUD UI (admin only)      │ │
│  └──────────┬───────────┘   └──────────┬──────────────────┘ │
│             │                           │                    │
│  ┌──────────▼───────────────────────────▼──────────────────┐ │
│  │ src/api/marginRuleApi.ts                                 │ │
│  │ - getMarginRules()    - resolveMargin()                  │ │
│  │ - createMarginRule()  - updateMarginRule()               │ │
│  │ - deleteMarginRule()                                     │ │
│  └──────────────────────────┬──────────────────────────────┘ │
└─────────────────────────────┼────────────────────────────────┘
                              │ HTTP (JWT Auth)
┌─────────────────────────────▼────────────────────────────────┐
│ Backend (Rails 8 API)                                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ Api::V1::MarginRulesController                           ││
│  │ - index (admin)  - create (admin)  - update (admin)      ││
│  │ - destroy (admin) - resolve (authenticated)              ││
│  └──────────────────────┬───────────────────────────────────┘│
│                         │                                    │
│  ┌──────────────────────▼───────────────────────────────────┐│
│  │ MarginRuleResolver (Service)                             ││
│  │ - resolve(email:, nationality:, weight:) → margin_%     ││
│  │ - Priority-ordered first-match-wins algorithm            ││
│  │ - Rails.cache with 5min TTL                              ││
│  └──────────────────────┬───────────────────────────────────┘│
│                         │                                    │
│  ┌──────────────────────▼───────────────────────────────────┐│
│  │ MarginRule (Model) ←→ PostgreSQL                         ││
│  │ - validations, scopes, active/inactive                   ││
│  └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Data Model Design

### 2.1 Database Schema

```sql
-- Migration: YYYYMMDDHHMMSS_create_margin_rules.rb
CREATE TABLE margin_rules (
  id            BIGSERIAL PRIMARY KEY,
  name          VARCHAR(100)   NOT NULL,
  rule_type     VARCHAR(20)    NOT NULL DEFAULT 'weight_based',
  priority      INTEGER        NOT NULL DEFAULT 0,
  match_email   VARCHAR(255),
  match_nationality VARCHAR(100),
  weight_min    DECIMAL(10,2),
  weight_max    DECIMAL(10,2),
  margin_percent DECIMAL(5,2)  NOT NULL,
  is_active     BOOLEAN        NOT NULL DEFAULT true,
  created_by    VARCHAR(255),
  created_at    TIMESTAMP      NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP      NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_margin_rules_active_priority ON margin_rules (is_active, priority DESC);
CREATE INDEX idx_margin_rules_email ON margin_rules (match_email) WHERE match_email IS NOT NULL;
```

### 2.2 Model Validations

```ruby
# app/models/margin_rule.rb
class MarginRule < ApplicationRecord
  RULE_TYPES = %w[flat weight_based].freeze

  validates :name, presence: true, length: { maximum: 100 }
  validates :rule_type, presence: true, inclusion: { in: RULE_TYPES }
  validates :priority, presence: true, numericality: { only_integer: true, in: 0..200 }
  validates :margin_percent, presence: true, numericality: { greater_than_or_equal_to: 5, less_than_or_equal_to: 50 }
  validates :weight_min, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :weight_max, numericality: { greater_than: 0 }, allow_nil: true

  validate :weight_range_consistency

  scope :active, -> { where(is_active: true) }
  scope :by_priority, -> { order(priority: :desc, id: :asc) }

  private

  def weight_range_consistency
    return unless weight_min && weight_max
    errors.add(:weight_max, "must be greater than weight_min") if weight_max <= weight_min
  end
end
```

### 2.3 Seed Data

```ruby
# db/seeds/margin_rules.rb
MarginRule.create!([
  { name: "용성종합물류 고정", rule_type: "flat", priority: 100,
    match_email: "admin@yslogic.co.kr", margin_percent: 19, created_by: "system" },
  { name: "인터블루 ≥20kg", rule_type: "weight_based", priority: 90,
    match_email: "ibas@inter-airsea.co.kr", weight_min: 20, margin_percent: 19, created_by: "system" },
  { name: "인터블루 <20kg", rule_type: "weight_based", priority: 90,
    match_email: "ibas@inter-airsea.co.kr", weight_min: 0, weight_max: 19.99, margin_percent: 24, created_by: "system" },
  { name: "한국 국적 ≥20kg", rule_type: "weight_based", priority: 50,
    match_nationality: "South Korea", weight_min: 20, margin_percent: 19, created_by: "system" },
  { name: "한국 국적 <20kg", rule_type: "weight_based", priority: 50,
    match_nationality: "South Korea", weight_min: 0, weight_max: 19.99, margin_percent: 24, created_by: "system" },
  { name: "기본 ≥20kg", rule_type: "weight_based", priority: 0,
    weight_min: 20, margin_percent: 24, created_by: "system" },
  { name: "기본 <20kg", rule_type: "weight_based", priority: 0,
    weight_min: 0, weight_max: 19.99, margin_percent: 32, created_by: "system" },
])
```

---

## 3. API Design

### 3.1 Endpoint Specifications

#### `GET /api/v1/margin_rules` (Admin only)

**Response** `200 OK`:
```json
{
  "rules": [
    {
      "id": 1,
      "name": "용성종합물류 고정",
      "ruleType": "flat",
      "priority": 100,
      "matchEmail": "admin@yslogic.co.kr",
      "matchNationality": null,
      "weightMin": null,
      "weightMax": null,
      "marginPercent": 19.0,
      "isActive": true,
      "createdBy": "system",
      "createdAt": "2026-03-08T00:00:00Z",
      "updatedAt": "2026-03-08T00:00:00Z"
    }
  ]
}
```

#### `POST /api/v1/margin_rules` (Admin only)

**Request**:
```json
{
  "name": "VIP Customer",
  "ruleType": "flat",
  "priority": 80,
  "matchEmail": "vip@example.com",
  "marginPercent": 15
}
```

**Response** `201 Created`: Same as single rule object.

**Validations**: margin_percent 5-50%, priority 0-200, name required.

#### `PUT /api/v1/margin_rules/:id` (Admin only)

**Request**: Partial update (only changed fields).

**Response** `200 OK`: Updated rule object.

#### `DELETE /api/v1/margin_rules/:id` (Admin only)

Soft delete: sets `is_active = false`.

**Response** `200 OK`: `{ "success": true }`

#### `GET /api/v1/margin_rules/resolve` (Authenticated)

**Query params**: `?email=user@example.com&nationality=South Korea&weight=25.5`

**Response** `200 OK`:
```json
{
  "marginPercent": 19.0,
  "matchedRule": {
    "id": 4,
    "name": "한국 국적 ≥20kg"
  },
  "fallback": false
}
```

**Fallback Response** (no rule matched):
```json
{
  "marginPercent": 24.0,
  "matchedRule": null,
  "fallback": true
}
```

### 3.2 JSON Key Convention

Backend uses `snake_case` → Frontend receives via serialization as `camelCase`.

Use `as_json` with key transformation in controller:

```ruby
def serialize_rule(rule)
  {
    id: rule.id,
    name: rule.name,
    ruleType: rule.rule_type,
    priority: rule.priority,
    matchEmail: rule.match_email,
    matchNationality: rule.match_nationality,
    weightMin: rule.weight_min&.to_f,
    weightMax: rule.weight_max&.to_f,
    marginPercent: rule.margin_percent.to_f,
    isActive: rule.is_active,
    createdBy: rule.created_by,
    createdAt: rule.created_at.iso8601,
    updatedAt: rule.updated_at.iso8601
  }
end
```

---

## 4. Service Layer Design

### 4.1 MarginRuleResolver

```ruby
# app/services/margin_rule_resolver.rb
class MarginRuleResolver
  CACHE_KEY = "margin_rules_active"
  CACHE_TTL = 5.minutes
  DEFAULT_MARGIN = 24.0

  def self.resolve(email:, nationality:, weight:)
    new.resolve(email: email, nationality: nationality, weight: weight)
  end

  def resolve(email:, nationality:, weight:)
    rules = cached_rules

    matched = rules.find do |rule|
      matches?(rule, email: email, nationality: nationality, weight: weight)
    end

    if matched
      { margin_percent: matched.margin_percent.to_f, matched_rule: matched, fallback: false }
    else
      { margin_percent: DEFAULT_MARGIN, matched_rule: nil, fallback: true }
    end
  end

  private

  def cached_rules
    Rails.cache.fetch(CACHE_KEY, expires_in: CACHE_TTL) do
      MarginRule.active.by_priority.to_a
    end
  end

  def matches?(rule, email:, nationality:, weight:)
    return false if rule.match_email.present? && rule.match_email != email
    return false if rule.match_nationality.present? && rule.match_nationality != nationality
    return false if rule.weight_min.present? && weight < rule.weight_min
    return false if rule.weight_max.present? && weight > rule.weight_max
    true
  end
end
```

### 4.2 Cache Invalidation

```ruby
# In MarginRulesController (after create/update/destroy)
Rails.cache.delete(MarginRuleResolver::CACHE_KEY)
```

---

## 5. Controller Design

### 5.1 MarginRulesController

```ruby
# app/controllers/api/v1/margin_rules_controller.rb
module Api
  module V1
    class MarginRulesController < ApplicationController
      include JwtAuthenticatable

      before_action :authenticate_user!
      before_action :require_admin!, except: [:resolve]
      before_action :set_margin_rule, only: [:update, :destroy]

      # GET /api/v1/margin_rules
      def index
        rules = MarginRule.by_priority
        render json: { rules: rules.map { |r| serialize_rule(r) } }
      end

      # POST /api/v1/margin_rules
      def create
        rule = MarginRule.new(margin_rule_params)
        rule.created_by = current_user.email

        if rule.save
          invalidate_cache!
          audit_log!("margin_rule.created", rule)
          render json: serialize_rule(rule), status: :created
        else
          render json: { error: { code: "VALIDATION_ERROR", messages: rule.errors.full_messages } },
                 status: :unprocessable_entity
        end
      end

      # PUT /api/v1/margin_rules/:id
      def update
        if @margin_rule.update(margin_rule_params)
          invalidate_cache!
          audit_log!("margin_rule.updated", @margin_rule)
          render json: serialize_rule(@margin_rule)
        else
          render json: { error: { code: "VALIDATION_ERROR", messages: @margin_rule.errors.full_messages } },
                 status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/margin_rules/:id (soft delete)
      def destroy
        @margin_rule.update!(is_active: false)
        invalidate_cache!
        audit_log!("margin_rule.deleted", @margin_rule)
        render json: { success: true }
      end

      # GET /api/v1/margin_rules/resolve
      def resolve
        result = MarginRuleResolver.resolve(
          email: params[:email],
          nationality: params[:nationality],
          weight: params[:weight].to_f
        )

        render json: {
          marginPercent: result[:margin_percent],
          matchedRule: result[:matched_rule] ? { id: result[:matched_rule].id, name: result[:matched_rule].name } : nil,
          fallback: result[:fallback]
        }
      end

      private

      def set_margin_rule
        @margin_rule = MarginRule.find(params[:id])
      end

      def margin_rule_params
        params.permit(:name, :rule_type, :priority, :match_email,
                       :match_nationality, :weight_min, :weight_max,
                       :margin_percent, :is_active)
      end

      def require_admin!
        unless current_user.role == "admin"
          render json: { error: { code: "FORBIDDEN", message: "Admin only" } }, status: :forbidden
        end
      end

      def invalidate_cache!
        Rails.cache.delete(MarginRuleResolver::CACHE_KEY)
      end

      def audit_log!(action, rule)
        AuditLog.create(
          user: current_user,
          action: action,
          resource_type: "MarginRule",
          resource_id: rule.id,
          metadata: { name: rule.name, margin_percent: rule.margin_percent.to_f },
          ip_address: request.remote_ip
        )
      rescue => e
        Rails.logger.error "[AUDIT] Failed: #{e.message}"
      end

      def serialize_rule(rule)
        {
          id: rule.id, name: rule.name, ruleType: rule.rule_type,
          priority: rule.priority, matchEmail: rule.match_email,
          matchNationality: rule.match_nationality,
          weightMin: rule.weight_min&.to_f, weightMax: rule.weight_max&.to_f,
          marginPercent: rule.margin_percent.to_f, isActive: rule.is_active,
          createdBy: rule.created_by,
          createdAt: rule.created_at.iso8601, updatedAt: rule.updated_at.iso8601
        }
      end
    end
  end
end
```

### 5.2 Routes Addition

```ruby
# config/routes.rb (inside api/v1 namespace)
resources :margin_rules, only: [:index, :create, :update, :destroy] do
  collection do
    get :resolve
  end
end
```

### 5.3 AuditLog Extension

Add margin rule actions to `AuditLog::ACTIONS`:
```ruby
ACTIONS = %w[
  quote.created quote.updated quote.deleted
  quote.status_changed quote.email_sent quote.exported
  margin_rule.created margin_rule.updated margin_rule.deleted
].freeze
```

---

## 6. Frontend Design

### 6.1 API Client (`src/api/marginRuleApi.ts`)

```typescript
import { request } from './apiClient';

export interface MarginRule {
  id: number;
  name: string;
  ruleType: 'flat' | 'weight_based';
  priority: number;
  matchEmail: string | null;
  matchNationality: string | null;
  weightMin: number | null;
  weightMax: number | null;
  marginPercent: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResolvedMargin {
  marginPercent: number;
  matchedRule: { id: number; name: string } | null;
  fallback: boolean;
}

export const getMarginRules = (): Promise<{ rules: MarginRule[] }> =>
  request('/api/v1/margin_rules');

export const createMarginRule = (data: Partial<MarginRule>): Promise<MarginRule> =>
  request('/api/v1/margin_rules', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateMarginRule = (id: number, data: Partial<MarginRule>): Promise<MarginRule> =>
  request(`/api/v1/margin_rules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteMarginRule = (id: number): Promise<{ success: boolean }> =>
  request(`/api/v1/margin_rules/${id}`, { method: 'DELETE' });

export const resolveMargin = (
  email: string,
  nationality: string,
  weight: number
): Promise<ResolvedMargin> =>
  request(`/api/v1/margin_rules/resolve?email=${encodeURIComponent(email)}&nationality=${encodeURIComponent(nationality)}&weight=${weight}`);
```

### 6.2 Hook (`src/features/dashboard/hooks/useMarginRules.ts`)

```typescript
import { useState, useEffect, useCallback } from 'react';
import { getMarginRules, MarginRule } from '@/api/marginRuleApi';

export function useMarginRules() {
  const [rules, setRules] = useState<MarginRule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMarginRules();
      setRules(data.rules);
    } catch {
      // silent — widget shows fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  return { rules, loading, refetch: fetchRules };
}
```

### 6.3 TargetMarginRulesWidget Upgrade

**기존**: Static hardcoded display
**변경**: Dynamic CRUD from API

```
Widget Layout:
┌──────────────────────────────────────────────┐
│ [%] TARGET MARGIN RULES          [+ Add] [↻] │
├──────────────────────────────────────────────┤
│ ▎ Priority 100 — Per-User Flat Override      │
│ ├ 용성종합물류 고정                            │
│ │ admin@yslogic.co.kr → 19%   [Edit] [Del]  │
│                                              │
│ ▎ Priority 90 — Per-User Weight-Based        │
│ ├ 인터블루 ≥20kg                              │
│ │ ibas@inter-airsea.co.kr, ≥20kg → 19%      │
│ ├ 인터블루 <20kg                              │
│ │ ibas@inter-airsea.co.kr, <20kg → 24%      │
│                                              │
│ ▎ Priority 50 — Nationality                  │
│ ├ 한국 국적 ≥20kg → 19%                      │
│ ├ 한국 국적 <20kg → 24%                      │
│                                              │
│ ▎ Priority 0 — Default                       │
│ ├ 기본 ≥20kg → 24%                           │
│ ├ 기본 <20kg → 32%                           │
├──────────────────────────────────────────────┤
│ Visibility: hidden for member role           │
└──────────────────────────────────────────────┘
```

**CRUD Interactions**:
- **Add**: Inline form at top (name, type, priority, conditions, margin%)
- **Edit**: Click row → inline edit mode (same as FscRateWidget pattern)
- **Delete**: Confirmation dialog → soft delete
- **Refresh**: Manual refetch button

### 6.4 QuoteCalculator Integration

**Before** (hardcoded, `QuoteCalculator.tsx:100-127`):
```typescript
// Remove FLAT_MARGIN_OVERRIDES and all if/else branches
```

**After** (API-based with fallback):
```typescript
// New hook in QuoteCalculator
const { data: resolvedMargin } = useResolvedMargin(
  user?.email, user?.nationality, result?.billableWeight
);

React.useEffect(() => {
  if (resolvedMargin && !hasManuallyChangedMargin.current) {
    const defaultMargin = resolvedMargin.marginPercent;
    if (input.marginPercent !== defaultMargin) {
      setInput(prev => ({ ...prev, marginPercent: defaultMargin }));
    }
  }
}, [resolvedMargin, input.marginPercent]);
```

**Fallback Logic** (if API fails):
```typescript
// Keep current hardcoded logic as fallback
function fallbackMargin(email?: string, nationality?: string, weight: number = 0): number {
  if (email === 'admin@yslogic.co.kr') return 19;
  if (email === 'ibas@inter-airsea.co.kr' || nationality === 'South Korea' || !nationality) {
    return weight >= 20 ? 19 : 24;
  }
  return weight >= 20 ? 24 : 32;
}
```

### 6.5 useResolvedMargin Hook

```typescript
import { useState, useEffect } from 'react';
import { resolveMargin, ResolvedMargin } from '@/api/marginRuleApi';

export function useResolvedMargin(
  email?: string, nationality?: string, weight?: number
) {
  const [data, setData] = useState<ResolvedMargin | null>(null);

  useEffect(() => {
    if (!email || weight === undefined) return;

    resolveMargin(email, nationality || '', weight)
      .then(setData)
      .catch(() => setData(null)); // fallback kicks in
  }, [email, nationality, weight]);

  return { data };
}
```

---

## 7. Implementation Order

```
Step 1: DB Migration + Model
  └─ create_margin_rules migration
  └─ MarginRule model with validations

Step 2: Service + Seed
  └─ MarginRuleResolver service
  └─ Seed data (7 rules from current hardcoded logic)

Step 3: Controller + Routes
  └─ MarginRulesController (CRUD + resolve)
  └─ Routes update
  └─ AuditLog ACTIONS extension

Step 4: Backend Tests
  └─ Model spec (validations, scopes)
  └─ Service spec (resolution algorithm)
  └─ Request spec (CRUD + resolve endpoints)

Step 5: Frontend API + Hooks
  └─ marginRuleApi.ts
  └─ useMarginRules hook
  └─ useResolvedMargin hook

Step 6: Widget Upgrade
  └─ TargetMarginRulesWidget → dynamic CRUD
  └─ Inline edit/add/delete UI

Step 7: QuoteCalculator Integration
  └─ Replace hardcoded logic
  └─ Fallback preservation
  └─ Update existing tests

Step 8: Validation
  └─ Migration validation (old vs new results)
  └─ E2E manual testing
```

---

## 8. Test Plan

### 8.1 Backend Tests

| Test | Description |
|------|-------------|
| `MarginRule` model | Validations: margin 5-50%, weight range, required fields |
| `MarginRuleResolver` | 7 seed rules resolve correctly; priority ordering; fallback |
| `MarginRulesController#index` | Returns all rules sorted by priority |
| `MarginRulesController#create` | Creates rule, invalidates cache, creates audit log |
| `MarginRulesController#update` | Updates rule, invalidates cache |
| `MarginRulesController#destroy` | Soft deletes (is_active=false) |
| `MarginRulesController#resolve` | Returns correct margin for email/nationality/weight combos |
| Admin guard | Non-admin gets 403 for CRUD endpoints |

### 8.2 Frontend Tests

| Test | Description |
|------|-------------|
| `marginRuleApi` | API calls with correct paths and methods |
| `TargetMarginRulesWidget` | Renders rules from API, handles CRUD |
| `QuoteCalculator` margin | Uses resolved margin, falls back on API error |

---

## 9. Error Handling

| Scenario | Frontend | Backend |
|----------|----------|---------|
| API timeout | Use fallback hardcoded logic | N/A |
| Invalid margin (< 5%) | Form validation prevents | Model validation rejects |
| Duplicate priority conflict | Warning in UI | Allowed (first-match-wins) |
| Delete last default rule | Confirmation warning | Allowed (fallback exists) |
| Unauthorized access | Redirect to login | 401/403 response |

---

## 10. Migration Safety

1. **Additive migration**: New table only, no existing table changes
2. **Backward compatible**: Frontend fallback keeps current behavior if API unavailable
3. **Rollback plan**: Drop `margin_rules` table, revert to hardcoded logic
4. **Zero-downtime**: Deploy backend first (seed data), then frontend
