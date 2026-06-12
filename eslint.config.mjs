import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'coverage/**']),
  {
    rules: {
      // setMounted(true) in useEffect is the standard Next.js hydration guard —
      // React 19 batches these updates so there are no cascading renders.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]);

export default eslintConfig;
