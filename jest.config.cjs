/** @type {import('jest').Config} */


module.exports = {
  rootDir: path.resolve(__dirname),
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
