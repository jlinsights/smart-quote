/**
 * Chart color constants — SVG/Canvas 등 Tailwind 클래스로 접근 불가한 영역 전용.
 * 값은 tailwind.config.cjs 의 토큰과 동일하게 유지한다.
 *
 * 참조: docs/02-design/DESIGN.md §9 Charts
 */
export const CHART_COLORS = {
  /** BridgeLogis brand-blue DEFAULT (#1D6FD1) — UPS, 주요 라인 */
  brandBlue: '#1D6FD1',
  /** BridgeLogis gold DEFAULT (#E8A838) — DHL, Jet Fuel 등 2차 라인 */
  gold: '#E8A838',
  /** Semantic warning (amber-500, #f59e0b) — Jet Fuel trend (주의·변동) */
  warning: '#f59e0b',
  /** Semantic success (emerald-500, #10b981) */
  success: '#10b981',
  /** Semantic destructive (red-500, #ef4444) */
  destructive: '#ef4444',
} as const;

export type ChartColor = (typeof CHART_COLORS)[keyof typeof CHART_COLORS];
