module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: [
    'dist',
    '.eslintrc.cjs',
    // Next.js apps/PoC use @next/* eslint plugins not installed in this Vite root config
    'apps/insights/.next',
    'apps/insights/next-env.d.ts',
    'output/phase2/01-nextjs-poc',
    'output/phase2/05-og-image-poc',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
}
