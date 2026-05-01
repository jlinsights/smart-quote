#!/usr/bin/env node
/**
 * pillar-patch.mjs — Pillar MDX auto-patcher
 *
 * 사용법:
 *   node scripts/pillar-patch.mjs                              # 모든 pillar 디렉터리에 적용
 *   node scripts/pillar-patch.mjs --dir=output/phase3/pillars  # 특정 디렉터리만
 *   node scripts/pillar-patch.mjs --dry-run                    # 변경 없이 미리보기만
 *
 * 동작:
 *   1. AI 생성 표기 키워드가 없으면 본문 끝에 lang에 맞는 표기 자동 삽입
 *   2. Disclaimer 키워드가 없으면 lang에 맞는 표준 면책 블록 자동 삽입
 *   3. 내부 링크 < 6 인 경우, 같은 디렉터리의 다른 pillar 슬러그 후보를 스캔하여
 *      "함께 읽으면 좋은 인사이트" 섹션을 본문 끝에 추가 (중복 추가 방지)
 *
 * 주의:
 *   - frontmatter 누락이나 H2/본문 길이 부족은 자동 패치하지 않음 (수동 작업 필요)
 *   - 패치 후에는 반드시 `node scripts/pillar-validate.mjs` 로 재검증할 것
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

const args = process.argv.slice(2);
const flagDir = args.find((a) => a.startsWith('--dir='))?.split('=')[1];
const flagDryRun = args.includes('--dry-run');

const DEFAULT_DIRS = [
  'output/phase3/pillars',
  'apps/insights/content/ko',
  'apps/insights/content/en',
];

const targetDirs = flagDir
  ? [flagDir]
  : DEFAULT_DIRS.filter((d) => existsSync(join(REPO_ROOT, d)));

if (targetDirs.length === 0) {
  console.error('❌ No pillar directories found.');
  process.exit(2);
}

function collectMdxFiles(rootDir) {
  const found = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const cur = stack.pop();
    const abs = join(REPO_ROOT, cur);
    if (!existsSync(abs)) continue;
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(abs)) stack.push(join(cur, entry));
    } else if (extname(abs) === '.mdx') {
      found.push(cur);
    }
  }
  return found;
}

function parseFrontmatter(text) {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return { frontmatter: null, body: text, raw: text };
  const fmRaw = match[1];
  const body = match[2];
  const fm = {};
  for (const line of fmRaw.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (!m) continue;
    let [, key, val] = m;
    val = val.trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    fm[key] = val;
  }
  return { frontmatter: fm, body, fmRaw };
}

const AI_KO = '\n> 본 콘텐츠는 일부 AI 도구를 활용해 작성된 뒤 BridgeLogis 운영팀이 검수했습니다.\n';
const AI_EN = '\n> This content was drafted with the assistance of AI tools and reviewed by the BridgeLogis operations team.\n';

const DISCLAIMER_KO = `
## 안내

본 콘텐츠는 BridgeLogis(Goodman GLS / J-Ways)가 일반 정보 제공 목적으로 작성한 자료이며,
운임·환율·관세·요율은 실시간 변동 가능합니다. 실제 의사결정 시 IATA·ICAO·관세청 등
공식 출처와 자격을 갖춘 전문가 검토를 병행하시기 바랍니다.
`;

const DISCLAIMER_EN = `
## Notice

This article is published by BridgeLogis (Goodman GLS / J-Ways) for general information
purposes. Rates, FX, duties, and surcharges may change in real time and figures are for
reference only. Please cross-check with official sources (IATA, ICAO, Korea Customs Service)
and qualified experts before making operational decisions.
`;

function buildRelatedSection(currentSlug, otherSlugs, lang) {
  if (otherSlugs.length === 0) return '';
  const heading = lang === 'en' ? '## Related Insights' : '## 함께 읽으면 좋은 인사이트';
  const items = otherSlugs
    .filter((s) => s !== currentSlug)
    .slice(0, 6)
    .map((slug) => {
      const linkText = slug.replace(/-/g, ' ');
      return `- [${linkText}](/pillars/${slug})`;
    })
    .join('\n');
  return `\n\n${heading}\n\n${items}\n`;
}

const allFiles = targetDirs.flatMap(collectMdxFiles).sort();
const allSlugsByDir = new Map();
for (const f of allFiles) {
  const text = readFileSync(join(REPO_ROOT, f), 'utf-8');
  const { frontmatter } = parseFrontmatter(text);
  if (!frontmatter?.slug) continue;
  const dir = f.split('/').slice(0, -1).join('/');
  if (!allSlugsByDir.has(dir)) allSlugsByDir.set(dir, []);
  allSlugsByDir.get(dir).push(frontmatter.slug);
}

let patchedCount = 0;
let skippedCount = 0;

for (const fileRel of allFiles) {
  const abs = join(REPO_ROOT, fileRel);
  const text = readFileSync(abs, 'utf-8');
  const { frontmatter: fm, body } = parseFrontmatter(text);
  if (!fm) {
    console.log(`⏭  SKIP (no frontmatter): ${fileRel}`);
    skippedCount += 1;
    continue;
  }
  const lang = fm.lang ?? 'ko';
  let newBody = body;
  const changes = [];

  // 1. AI 표기
  const hasAi =
    lang === 'en'
      ? /AI\s*tools?|assisted\s*by\s*AI/i.test(newBody)
      : /AI\s*도구를?\s*활용|일부\s*AI/i.test(newBody);
  if (!hasAi) {
    newBody += lang === 'en' ? AI_EN : AI_KO;
    changes.push('AI notice');
  }

  // 2. Disclaimer
  const hasDisclaimer =
    lang === 'en'
      ? /\bDisclaimer\b|\bNotice\b|for\s*reference\s*only/i.test(newBody)
      : /면책|안내|참고용|실시간\s*변동/.test(newBody);
  if (!hasDisclaimer) {
    newBody += lang === 'en' ? DISCLAIMER_EN : DISCLAIMER_KO;
    changes.push('Disclaimer');
  }

  // 3. 내부 링크
  const internalLinkCount = (
    newBody.match(/\]\((\/pillars\/[a-z0-9-]+|\/quote(\?[^)]*)?|\/insights\/[a-z0-9-]+|\/dashboard)/g) ?? []
  ).length;
  if (internalLinkCount < 6) {
    const dir = fileRel.split('/').slice(0, -1).join('/');
    const dirSlugs = allSlugsByDir.get(dir) ?? [];
    const related = buildRelatedSection(fm.slug, dirSlugs, lang);
    if (related && !newBody.includes('함께 읽으면 좋은 인사이트') && !newBody.includes('Related Insights')) {
      newBody += related;
      changes.push(`+RelatedPillars (${Math.min(6, dirSlugs.length - 1)} links)`);
    }
  }

  if (changes.length === 0) {
    console.log(`✅ NO-OP: ${fileRel}`);
    skippedCount += 1;
    continue;
  }

  const newText = `---\n${text.match(/^---\s*\n([\s\S]*?)\n---/)?.[1] ?? ''}\n---\n${newBody}`;

  if (flagDryRun) {
    console.log(`🔄 (dry-run) ${fileRel}: ${changes.join(', ')}`);
  } else {
    writeFileSync(abs, newText, 'utf-8');
    console.log(`✏️  PATCH ${fileRel}: ${changes.join(', ')}`);
  }
  patchedCount += 1;
}

console.log(
  `\n📊 Summary: ${patchedCount} ${flagDryRun ? 'would-patch' : 'patched'} / ${skippedCount} skipped (total ${allFiles.length})\n`
);
process.exit(0);
