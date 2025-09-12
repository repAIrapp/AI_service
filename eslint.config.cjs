
const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  // Base JS
  js.configs.recommended,

  // Règles générales (Node)
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "commonjs",
      globals: {
        ...globals.node,   // => définit process, console, __dirname, etc.
      },
    },
    rules: {
      // 
    },
  },

  // Spécifique aux tests : déclare les globals Jest
  {
    files: ["tests/**/*.js", "**/*.test.js", "**/__tests__/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.jest,  // => jest, describe, test, expect, beforeEach...
      },
    },
  },

  // (Optionnel) ignorer des dossiers
  {
    ignores: [
      "node_modules/",
      "coverage/",
      "uploads/",
    ],
  },
];
