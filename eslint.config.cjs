// eslint.config.cjs (ESLint v9+)
const js = require("@eslint/js");

module.exports = [
  { ignores: ["node_modules/", "coverage/", "uploads/"] },
  {
    files: ["**/*.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "commonjs" },
    plugins: {},
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
];
