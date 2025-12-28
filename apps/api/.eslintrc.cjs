module.exports = {
  root: true,
  env: { node: true, es2022: true },
  ignorePatterns: ["dist/", "node_modules/"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    // Nest uses decorators; enable syntax
    ecmaFeatures: { legacyDecorators: true }
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ]
};
