import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'types/index': 'src/types/index.ts',
    'utils/index': 'src/utils/index.ts',
    'schemas/index': 'src/schemas/index.ts',
    'constants/index': 'src/constants/index.ts',
    'reports/index': 'src/reports/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: true,
  clean: true,
  outDir: 'dist',
  external: ['zod'],
});
