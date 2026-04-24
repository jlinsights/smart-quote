const { fontFamily } = require('tailwindcss/defaultTheme');
const colors = require('tailwindcss/colors');

/**
 * BridgeLogis by Goodman GLS — Tailwind config
 * 디자인 토큰 SSOT: docs/02-design/DESIGN.md (§1.1.0-alpha, 2026-04-24)
 *
 * 토큰 레이어:
 *   1. Brand    — BridgeLogis 브랜드 가이드 정본 (navy/deep-blue/brand-blue/cyan/gold)
 *   2. Semantic — UI 의도 (success/warning/destructive/info)
 *   3. Legacy   — jways-*/accent-* (기존 코드 호환, 신규 사용 지양 — Phase 2 에서 brand-* 로 마이그레이션)
 *   4. Neutral  — gray (grayscale)
 */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', ...fontFamily.sans],
      },
      colors: {
        // ─── Neutral ───
        gray: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },

        // ─── Brand (BridgeLogis 정본) ───
        navy: { DEFAULT: '#0A1628' },          // 배경 60%
        'deep-blue': { DEFAULT: '#152347' },   // 보조 20%
        'brand-blue': {                         // CTA 15% — #1D6FD1 기준 10단계
          DEFAULT: '#1D6FD1',
          50: '#eef5fd',
          100: '#d5e7fa',
          200: '#aacff4',
          300: '#7fb7ee',
          400: '#549fe8',
          500: '#1D6FD1',
          600: '#1759a7',
          700: '#11437d',
          800: '#0b2d54',
          900: '#06182a',
          950: '#030c15',
        },
        cyan: {                                 // 시그니처 — #00B4D8 기준
          DEFAULT: '#00B4D8',
          50: '#e6f9fd',
          100: '#ccf3fb',
          200: '#99e6f7',
          300: '#66daf3',
          400: '#33c7ed',
          500: '#00B4D8',
          600: '#0090ad',
          700: '#006c82',
          800: '#004857',
          900: '#00242b',
        },
        gold: {                                 // 강조 5% — #E8A838 기준
          DEFAULT: '#E8A838',
          50: '#fdf6e8',
          100: '#fbecd0',
          200: '#f7d9a1',
          300: '#f3c673',
          400: '#efb344',
          500: '#E8A838',
          600: '#ba862d',
          700: '#8b6522',
          800: '#5d4316',
          900: '#2e220b',
        },

        // ─── Semantic (UI 의도) ───
        success: colors.emerald,      // DEFAULT=emerald-500
        warning: colors.amber,        // DEFAULT=amber-500
        destructive: colors.red,      // DEFAULT=red-500
        info: {                        // brand-blue 와 정렬
          DEFAULT: '#1D6FD1',
          ...colors.blue,
          500: '#1D6FD1',
        },

        // ─── Legacy (Phase 1 non-breaking 유지, Phase 2에서 brand-blue 로 마이그레이션) ───
        jways: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        accent: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
      }
    },
  },
  plugins: [],
}
