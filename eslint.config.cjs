const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node, // => autorise process, console, __dirname, etc.
      },
    },
    rules: {
      // autorise console dans un service Node
      'no-console': 'off',
      // ignore les params non utilisés qui commencent par _
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
    ignores: [
      'node_modules/',
      'coverage/',
      '.github/',
      'uploads/',
    ],
  },
];
