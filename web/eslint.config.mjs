import nextVitals from "eslint-config-next/core-web-vitals"

const ignoredPaths = [
  ".next/**",
  "next-env.d.ts",
  "node_modules/**",
  "out/**",
]

const config = [
  ...nextVitals,
  {
    ignores: ignoredPaths,
  },
]

export default config
