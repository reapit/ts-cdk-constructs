module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
    amd: true,
    jest: true,
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/eslint-recommended', 'prettier'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'ESNext',
    sourceType: 'module',
    project: './packages/*/*/tsconfig.json',
  },
  plugins: ['@typescript-eslint', 'prettier'],
  ignorePatterns: ['node_modules/', '**/node_modules/', '**/dist/','**/jsii-out/', 'tsconfig.json', '.eslintrc.js', '*.snapshot/'],
  rules: {
    quotes: ['error', 'single', { avoidEscape: true, allowTemplateLiterals: false }],
    semi: ['error', 'never'],
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    'no-unused-vars': 'off',
    'no-debugger': 'off',
    'no-prototype-builtins': 0,
    'prettier/prettier': [
      'warn',
      {
        endOfLine: 'auto',
      },
    ],
    'max-len': ['error', { code: 120, ignoreUrls: true, ignoreTemplateLiterals: true, ignoreStrings: true }],
    'no-confusing-arrow': ['error', { allowParens: false }],
    'no-mixed-operators': [
      'error',
      {
        groups: [
          ['&', '|', '^', '~', '<<', '>>', '>>>'],
          ['==', '!=', '===', '!==', '>', '>=', '<', '<='],
          ['&&', '||'],
          ['in', 'instanceof'],
        ],
      },
    ],
    'no-tabs': ['error', { allowIndentationTabs: true }],
    'no-unexpected-multiline': 'error',
    // Disabling as conflicts with Prettier
    indent: 0,
  },
  settings: {},
}
