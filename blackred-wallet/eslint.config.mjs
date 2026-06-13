import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        alert: "readonly",
        confirm: "readonly",
        prompt: "readonly",
        fetch: "readonly",
        CustomEvent: "readonly",
        FileReader: "readonly",
        URL: "readonly",
        Date: "readonly",
        Number: "readonly",
        Math: "readonly",
        JSON: "readonly",
        navigator: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "warn",
    },
  },
  {
    ignores: ["dist/**", "node_modules/**", "build/**"],
  },
];
