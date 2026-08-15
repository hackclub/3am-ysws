import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      // the static site, removed in full by the app router port
      "script.js",
      "splash.js",
    ],
  },
  ...coreWebVitals,
  ...typescript,
];

export default config;
