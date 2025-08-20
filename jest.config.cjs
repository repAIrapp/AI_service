/** @type {import('jest').Config} */
const path = require('path');

module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  clearMocks: true,
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.{js,jsx}",
    "!src/**/index.js"
  ],
  moduleNameMapper: {
    '^@root/(.*)$': '<rootDir>/$1', 
  },
  moduleDirectories: ['node_modules', '.'], 
};
