#!/usr/bin/env bash
# DESIGN.md Phase 2 — jways-*/accent-* → brand-blue-*/cyan-* 마이그레이션
# 1회성 스크립트. 완료 후 삭제 권장.
# BSD sed \b 미지원 → perl 사용 (macOS/Linux 공통 동작).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "▶ Phase 2 migration 시작"
echo "▶ 범위: src/ (docs/, tailwind.config.cjs 는 수동)"

TARGETS=(src)

count_legacy() {
  grep -rh "\bjways-[0-9]\|\baccent-[0-9]" "${TARGETS[@]}" \
    --include="*.tsx" --include="*.ts" --include="*.css" 2>/dev/null \
    | wc -l | tr -d ' '
}

# ─── Pre-flight ───
before=$(count_legacy)
echo "▶ 치환 전 총 legacy 토큰 사용: ${before}"

# 대상 파일 목록
FILES=$(find "${TARGETS[@]}" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \))

# ─── Step 1. accent-950 → cyan-900 (특수) ───
# cyan 팔레트에 950 스텝 없음. Step 3 보다 먼저.
echo "▶ Step 1: accent-950 → cyan-900"
echo "$FILES" | xargs perl -pi -e 's/\baccent-950\b/cyan-900/g'

# ─── Step 2. jways-* → brand-blue-* ───
echo "▶ Step 2: jways-{N} → brand-blue-{N}"
echo "$FILES" | xargs perl -pi -e 's/\bjways-(\d+)\b/brand-blue-$1/g'

# ─── Step 3. accent-* → cyan-* ───
echo "▶ Step 3: accent-{N} → cyan-{N}"
echo "$FILES" | xargs perl -pi -e 's/\baccent-(\d+)\b/cyan-$1/g'

# ─── Post-flight ───
remaining=$(count_legacy)
echo "▶ 치환 후 잔존: ${remaining}"

if [ "$remaining" != "0" ]; then
  echo "❌ 잔존 발견. 수동 점검 필요:"
  grep -rn "\bjways-[0-9]\|\baccent-[0-9]" "${TARGETS[@]}" \
    --include="*.tsx" --include="*.ts" --include="*.css" 2>/dev/null | head -30
  exit 1
fi

echo "✅ 전체 치환 완료: ${before}건"
