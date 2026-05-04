#!/usr/bin/env node
/**
 * pillar-validate.mjs — 12-point Pillar MDX validator
 *
 * 사용법:
 *   node scripts/pillar-validate.mjs                              # 기본 (output/phase3/pillars + apps/insights/content 모두 검사)
 *   node scripts/pillar-validate.mjs --dir=output/phase3/pillars  # 특정 디렉터리만
 *   node scripts/pillar-validate.mjs --strict                     # 경고도 실패로 처리
 *   node scripts/pillar-validate.mjs --json                       # JSON 결과만 출력
 *
 * 검증 규칙(12점):
 *   1. frontmatter 블록 존재
 *   2. title 필수
 *   3. description 필수 + 길이 ≤ 200자
 *   4. slug 필수 (kebab-case)
 *   5. pubDate 필수 (YYYY-WNN 또는 YYYY-MM-DD)
 *   6. category 필수
 *   7. lang 필수 (ko 또는 en)
 *   8. H2 ≥ 7개
 *   9. 내부 링크 ≥ 6개 ([text](/pillars/... 또는 /quote 또는 /insights/...)
 *  10. AI 생성 표기 키워드 포함 (한국어 'AI 도구를 활용' / 영어 'AI tools')
 *  11. Disclaimer 키워드 포함 (한국어 '면책' 또는 '안내' / 영어 'Disclaimer' 또는 'Notice')
 *  12. 본문 텍스트 ≥ 1500자 (한국어) / ≥ 800단어 (영어)
 *
 * Exit codes:
 *   0 — all PASS
 *   1 — at least one file FAIL
 *   2 — no MDX files found
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, basename, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

const args = process.argv.slice(2);
const flagDir = args.find((a) => a.startsWith('--dir='))?.split('=')[1];
const flagStrict = args.includes('--strict');
const flagJson = args.includes('--json');

const DEFAULT_DIRS = [
  'output/phase3/pillars',
  'apps/insights/content/ko',
  'apps/insights/content/en',
];

const targetDirs = flagDir
  ? [flagDir]
  : DEFAULT_DIRS.filter((d) => existsSync(join(REPO_ROOT, d)));

if (targetDirs.length === 0) {
  console.error('❌ No pillar directories found. Tried:', DEFAULT_DIRS);
  process.exit(2);
}

/* ───────────────────────── 파일 수집 ───────────────────────── */

function collectMdxFiles(rootDir) {
  const found = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const cur = stack.pop();
    const abs = join(REPO_ROOT, cur);
    if (!existsSync(abs)) continue;
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(abs)) {
        stack.push(join(cur, entry));
      }
    } else if (extname(abs) === '.mdx') {
      found.push(cur);
    }
  }
  return found;
}

const files = targetDirs.flatMap(collectMdxFiles).sort();

if (files.length === 0) {
  console.error('❌ No .mdx files found in:', targetDirs);
  process.exit(2);
}

/* ───────────────────────── frontmatter 파서 ───────────────────────── */

function parseFrontmatter(text) {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return { frontmatter: null, body: text };
  const fmRaw = match[1];
  const body = match[2];
  const fm = {};
  for (const line of fmRaw.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (!m) continue;
    let [, key, val] = m;
    val = val.trim();
    // 따옴표 제거
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    fm[key] = val;
  }

  // 동의어 매핑 — output/phase3/pillars 표준 키와 호환
  // description ← description || summary
  if (!fm.description && fm.summary) fm.description = fm.summary;
  // pubDate ← pubDate || date || publishedAt (날짜 부분만)
  if (!fm.pubDate) {
    if (fm.date) fm.pubDate = fm.date;
    else if (fm.publishedAt) fm.pubDate = fm.publishedAt.split('T')[0];
  }
  // category ← category || topic
  if (!fm.category && fm.topic) fm.category = fm.topic;
  // lang ← lang || inLanguage (ko-KR → ko, en-US → en)
  if (!fm.lang && fm.inLanguage) {
    const code = fm.inLanguage.toLowerCase().split(/[-_]/)[0];
    if (code === 'ko' || code === 'en') fm.lang = code;
  }

  return { frontmatter: fm, body };
}

/* ───────────────────────── 12-point 검증 ───────────────────────── */

// AI 표기는 다양한 변형(괄호 안 모델명, 부가 설명) 허용을 위해 좁은 윈도우 허용
const KOREAN_AI_PATTERNS = [
  /AI[^\n]{0,40}(?:사용|활용|이용|도움|보조|작성|검수|편집|기반|생성)/i,
  /(?:Claude|GPT|ChatGPT|Gemini|LLM|인공지능)/i,
  /일부\s*AI/i,
  /자동\s*생성/i,
];
const ENGLISH_AI_PATTERNS = [
  /AI[^\n]{0,40}(?:tools?|assistance|assisted|help(?:ed)?|generated|drafted|review(?:ed)?)/i,
  /(?:Claude|GPT|ChatGPT|Gemini|\bLLM\b)/i,
  /artificial\s*intelligence/i,
];

const KOREAN_DISCLAIMER_PATTERNS = [
  /면책/,
  /안내/,
  /참고용/,
  /실시간\s*변동/,
  /참고\s*자료/,
  /투자\s*권유\s*아닙니다?/,
  /법률\s*자문\s*아닙니다?/,
  /일반\s*정보/,
  /본\s*콘텐츠/,
];
const ENGLISH_DISCLAIMER_PATTERNS = [
  /\bDisclaimer\b/i,
  /\bNotice\b/i,
  /for\s*reference\s*only/i,
  /not\s*(?:a\s*)?(?:legal|financial|investment)\s*advice/i,
  /general\s*information/i,
];

function validate(fileRel) {
  const abs = join(REPO_ROOT, fileRel);
  const text = readFileSync(abs, 'utf-8');
  const { frontmatter: fm, body } = parseFrontmatter(text);
  const issues = [];
  const warnings = [];
  let pointsPass = 0;
  const POINTS_TOTAL = 12;

  // 1. frontmatter 블록 존재
  if (!fm) {
    issues.push('1. frontmatter 블록이 없습니다');
  } else {
    pointsPass += 1;
  }

  // 2. title
  if (!fm?.title) issues.push('2. frontmatter.title 누락');
  else pointsPass += 1;

  // 3. description
  if (!fm?.description) {
    issues.push('3. frontmatter.description 누락');
  } else if (fm.description.length > 200) {
    issues.push(`3. frontmatter.description 길이 ${fm.description.length}자 > 200자 한도`);
  } else {
    pointsPass += 1;
  }

  // 4. slug
  if (!fm?.slug) {
    issues.push('4. frontmatter.slug 누락');
  } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fm.slug)) {
    issues.push(`4. frontmatter.slug 가 kebab-case 형식이 아님 ('${fm.slug}')`);
  } else {
    pointsPass += 1;
  }

  // 5. pubDate — YYYY-MM-DD, YYYY-WNN, YYYY-MM-DDTHH:MM[:SS][TZ] 모두 허용
  if (!fm?.pubDate) {
    issues.push('5. frontmatter.pubDate 누락');
  } else if (!/^\d{4}-(W\d{2}|\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:?\d{2}|Z)?)?)$/.test(fm.pubDate)) {
    issues.push(`5. frontmatter.pubDate 형식 오류 ('${fm.pubDate}')`);
  } else {
    pointsPass += 1;
  }

  // 6. category
  if (!fm?.category) issues.push('6. frontmatter.category 누락');
  else pointsPass += 1;

  // 7. lang
  if (!fm?.lang) {
    issues.push('7. frontmatter.lang 누락');
  } else if (fm.lang !== 'ko' && fm.lang !== 'en') {
    issues.push(`7. frontmatter.lang 허용 외 값 ('${fm.lang}')`);
  } else {
    pointsPass += 1;
  }

  // 8. H2 ≥ 7
  const h2Count = (body.match(/^##\s+\S/gm) ?? []).length;
  if (h2Count < 7) {
    issues.push(`8. H2 헤더 ${h2Count}개 < 7개 권장 하한`);
  } else {
    pointsPass += 1;
  }

  // 9. 내부 링크 ≥ 6
  const internalLinkCount = (
    body.match(/\]\((\/pillars\/[a-z0-9-]+|\/quote(\?[^)]*)?|\/insights\/[a-z0-9-]+|\/dashboard)/g) ?? []
  ).length;
  if (internalLinkCount < 6) {
    issues.push(`9. 내부 링크 ${internalLinkCount}개 < 6개 권장 하한`);
  } else {
    pointsPass += 1;
  }

  // 10. AI 생성 표기
  const lang = fm?.lang ?? 'ko';
  const aiPatterns = lang === 'en' ? ENGLISH_AI_PATTERNS : KOREAN_AI_PATTERNS;
  const hasAi = aiPatterns.some((p) => p.test(body));
  if (!hasAi) {
    issues.push(`10. AI 생성 표기 키워드 미발견 (lang=${lang})`);
  } else {
    pointsPass += 1;
  }

  // 11. Disclaimer 키워드
  const disclaimerPatterns =
    lang === 'en' ? ENGLISH_DISCLAIMER_PATTERNS : KOREAN_DISCLAIMER_PATTERNS;
  const hasDisclaimer = disclaimerPatterns.some((p) => p.test(body));
  if (!hasDisclaimer) {
    issues.push(`11. Disclaimer 키워드 미발견 (lang=${lang})`);
  } else {
    pointsPass += 1;
  }

  // 12. 본문 길이
  const plain = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]\([^)]*\)/g, (m) => m.match(/\[([^\]]*)\]/)?.[1] ?? '')
    .replace(/[#>*_`~|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (lang === 'en') {
    const wordCount = plain.split(/\s+/).filter(Boolean).length;
    if (wordCount < 800) {
      issues.push(`12. 본문 ${wordCount} words < 800 words 권장 하한 (영어)`);
    } else {
      pointsPass += 1;
    }
  } else {
    const charCount = plain.length;
    if (charCount < 1500) {
      issues.push(`12. 본문 ${charCount}자 < 1500자 권장 하한 (한국어)`);
    } else {
      pointsPass += 1;
    }
  }

  return {
    file: fileRel,
    fm,
    pointsPass,
    pointsTotal: POINTS_TOTAL,
    issues,
    warnings,
    pass: issues.length === 0,
  };
}

/* ───────────────────────── 실행 ───────────────────────── */

const results = files.map(validate);

if (flagJson) {
  process.stdout.write(JSON.stringify({ totalFiles: files.length, results }, null, 2));
  process.exit(results.some((r) => !r.pass) ? 1 : 0);
}

console.log(`\n📋 Pillar Validator — 12-point check on ${files.length} file(s)\n`);
let passCount = 0;
let failCount = 0;

for (const r of results) {
  const status = r.pass ? '✅ PASS' : '❌ FAIL';
  const score = `${r.pointsPass}/${r.pointsTotal}`;
  console.log(`${status}  ${score}  ${r.file}`);
  for (const issue of r.issues) {
    console.log(`         └─ ${issue}`);
  }
  if (r.pass) passCount += 1;
  else failCount += 1;
}

console.log(`\n📊 Summary: ${passCount} PASS / ${failCount} FAIL (total ${files.length})\n`);

if (failCount > 0 || (flagStrict && results.some((r) => r.warnings.length > 0))) {
  process.exit(1);
}
process.exit(0);
