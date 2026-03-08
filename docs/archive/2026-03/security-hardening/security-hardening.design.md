# Design: security-hardening

> Technical specification for security hardening and error handling improvements

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│ BEFORE (Current)                                                    │
│                                                                     │
│ resolveMargin ──GET──> /resolve?email=PII&weight=X ──> Controller  │
│ CRUD catch {} ──> silent failure (no user feedback)                 │
│ useMarginRules catch {} ──> empty state (no error indicator)        │
│ QuoteCalculator ──> hardcoded admin@yslogic, ibas@inter-airsea     │
│ exchangeRateApi ──> (import.meta as any).env                        │
├─────────────────────────────────────────────────────────────────────┤
│ AFTER (Target)                                                      │
│                                                                     │
│ resolveMargin ──POST──> /resolve body:{email,nationality,weight}   │
│ CRUD catch(e) ──> toast('error', message) ──> user sees feedback   │
│ useMarginRules ──> { rules, loading, error, refetch }              │
│ QuoteCalculator ──> fallback uses generic defaults (no emails)      │
│ exchangeRateApi ──> import.meta.env.VITE_* (typed)                 │
└─────────────────────────────────────────────────────────────────────┘
```

## 2. Detailed Design

### 2.1 H1: resolveMargin GET → POST

**Frontend: `src/api/marginRuleApi.ts`**

```typescript
// BEFORE
export const resolveMargin = (
  email: string, nationality: string, weight: number
): Promise<ResolvedMargin> =>
  request(`/api/v1/margin_rules/resolve?email=${encodeURIComponent(email)}&nationality=${encodeURIComponent(nationality)}&weight=${weight}`);

// AFTER
export const resolveMargin = (
  email: string, nationality: string, weight: number
): Promise<ResolvedMargin> =>
  request('/api/v1/margin_rules/resolve', {
    method: 'POST',
    body: JSON.stringify({ email, nationality, weight }),
  });
```

**Frontend: `src/features/dashboard/hooks/useResolvedMargin.ts`**

No change needed — it already calls `resolveMargin()` without knowing HTTP method.

**Backend: `smart-quote-api/config/routes.rb`**

```ruby
# BEFORE
resources :margin_rules, only: [:index, :create, :update, :destroy] do
  collection do
    get :resolve
  end
end

# AFTER — support both GET (deprecated) and POST
resources :margin_rules, only: [:index, :create, :update, :destroy] do
  collection do
    get :resolve   # deprecated, kept for backward compat
    post :resolve  # preferred — PII in body
  end
end
```

**Backend: `margin_rules_controller.rb` resolve action**

```ruby
# BEFORE
def resolve
  result = MarginRuleResolver.resolve(
    email: params[:email],
    nationality: params[:nationality],
    weight: params[:weight].to_f
  )
  ...
end

# AFTER — extract from body or query params, validate
def resolve
  resolve_params = resolve_input_params
  result = MarginRuleResolver.resolve(
    email: resolve_params[:email],
    nationality: resolve_params[:nationality],
    weight: resolve_params[:weight].to_f
  )
  ...
end

private

def resolve_input_params
  permitted = params.permit(:email, :nationality, :weight)

  unless permitted[:email].present?
    render json: { error: { code: "VALIDATION_ERROR", message: "email is required" } },
           status: :unprocessable_entity and return
  end

  unless permitted[:weight].present? && permitted[:weight].to_f > 0
    render json: { error: { code: "VALIDATION_ERROR", message: "weight must be a positive number" } },
           status: :unprocessable_entity and return
  end

  permitted
end
```

### 2.2 H2: Error Feedback for Admin CRUD

**File: `src/features/admin/components/TargetMarginRulesWidget.tsx`**

Pattern: Use existing `useToast` hook (same as `CustomerManagement.tsx`).

```typescript
// Add import
import { useToast } from '@/components/ui/Toast';

// Inside component
const { toast } = useToast();

// handleSave — BEFORE
} catch {
  // silent
}

// handleSave — AFTER
} catch (e) {
  const msg = e instanceof Error ? e.message : 'Failed to save rule';
  toast('error', msg);
}

// handleDelete — BEFORE
} catch {
  // silent
}

// handleDelete — AFTER
} catch (e) {
  const msg = e instanceof Error ? e.message : 'Failed to delete rule';
  toast('error', msg);
}
```

### 2.3 H3: Error State in useMarginRules

**File: `src/features/dashboard/hooks/useMarginRules.ts`**

```typescript
// BEFORE
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

// AFTER
export function useMarginRules() {
  const [rules, setRules] = useState<MarginRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMarginRules();
      setRules(data.rules);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);
  return { rules, loading, error, refetch: fetchRules };
}
```

**Widget UI indicator** in `TargetMarginRulesWidget.tsx`:

```typescript
// Destructure error from hook
const { rules, loading, error, refetch } = useMarginRules();

// Show inline error below header if fetch failed
{error && (
  <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
    <XCircle className="w-3.5 h-3.5" />
    <span>{error}</span>
    <button onClick={refetch} className="underline hover:no-underline ml-auto">Retry</button>
  </div>
)}
```

### 2.4 H4: Backend Input Validation

**File: `margin_rules_controller.rb`**

Add `before_action :validate_resolve_params!, only: [:resolve]`:

```ruby
before_action :validate_resolve_params!, only: [:resolve]

private

def validate_resolve_params!
  unless params[:email].present?
    render json: { error: { code: "VALIDATION_ERROR", message: "email is required" } },
           status: :unprocessable_entity and return
  end

  weight = params[:weight]
  unless weight.present? && weight.to_s.match?(/\A\d+(\.\d+)?\z/) && weight.to_f > 0
    render json: { error: { code: "VALIDATION_ERROR", message: "weight must be a positive number" } },
           status: :unprocessable_entity and return
  end
end
```

### 2.5 H5: Remove Hardcoded Emails from Frontend

**File: `src/pages/QuoteCalculator.tsx` (lines 117-127)**

```typescript
// BEFORE — hardcoded email-based fallback
if (email === 'admin@yslogic.co.kr') {
  defaultMargin = 19;
} else if (email === 'ibas@inter-airsea.co.kr' || isKorean) {
  defaultMargin = weight >= 20 ? 19 : 24;
} else {
  defaultMargin = weight >= 20 ? 24 : 32;
}

// AFTER — generic nationality-based fallback (no emails)
if (isKorean) {
  defaultMargin = weight >= 20 ? 19 : 24;
} else {
  defaultMargin = weight >= 20 ? 24 : 32;
}
```

Rationale: The DB-driven `MarginRuleResolver` already has per-user rules (P100). The fallback only triggers when the API is unreachable. Using nationality-based defaults is sufficient and avoids leaking admin emails.

### 2.6 H6: Fix import.meta Type Declaration

**File: `src/vite-env.d.ts`**

```typescript
// BEFORE
/// <reference types="vite/client" />

// AFTER
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_OPEN_EXCHANGE_APP_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

**File: `src/api/exchangeRateApi.ts`**

```typescript
// BEFORE
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const appId = (import.meta as any).env.VITE_OPEN_EXCHANGE_APP_ID;

// AFTER
const appId = import.meta.env.VITE_OPEN_EXCHANGE_APP_ID;
```

Remove the `eslint-disable-next-line` comment as well.

## 3. Implementation Order

```
Step 1: vite-env.d.ts — Add ImportMetaEnv type declaration
Step 2: exchangeRateApi.ts — Remove (import.meta as any) cast + eslint comment
Step 3: marginRuleApi.ts — Change resolveMargin to POST
Step 4: routes.rb — Add POST resolve route (keep GET for backward compat)
Step 5: margin_rules_controller.rb — Add validate_resolve_params! before_action
Step 6: useMarginRules.ts — Add error state
Step 7: TargetMarginRulesWidget.tsx — Add useToast, error feedback, error indicator
Step 8: QuoteCalculator.tsx — Remove hardcoded emails from fallback
Step 9: marginRuleApi.test.ts — Update resolve test to POST
Step 10: TargetMarginRulesWidget.test.tsx — Add error feedback test
```

## 4. Test Plan

### Updated Tests

| Test File | Changes |
|-----------|---------|
| `src/api/__tests__/marginRuleApi.test.ts` | Change resolve test: expect POST with body instead of GET with query |
| `src/features/admin/components/__tests__/TargetMarginRulesWidget.test.tsx` | Add test: CRUD failure shows toast error message |

### Manual Verification

1. Trigger resolve with valid user → margin resolved via POST body
2. Disconnect backend → CRUD operations show toast error
3. Disconnect backend → useMarginRules shows error indicator + retry button
4. Build → check no `admin@yslogic` or `ibas@inter-airsea` in JS output
5. TypeScript → `import.meta.env.VITE_*` autocompletes without `as any`

## 5. Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | `resolveMargin` uses POST with body `{email, nationality, weight}` | Test + network tab |
| AC-2 | Backend validates email (required) and weight (positive number) | Test + 422 response |
| AC-3 | CRUD failure in TargetMarginRulesWidget shows toast error | Test + manual |
| AC-4 | `useMarginRules` returns `error` string on fetch failure | Test |
| AC-5 | Widget shows error indicator with retry button | Manual |
| AC-6 | No hardcoded email addresses in frontend bundle | `grep` on build output |
| AC-7 | `import.meta.env` fully typed, no `as any` | `tsc --noEmit` |
| AC-8 | All 208+ existing tests pass | `npx vitest run` |
| AC-9 | Production build succeeds | `npm run build` |
