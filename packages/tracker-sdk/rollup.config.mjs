import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

const terserConfig = {
  ecma: 2020,
  compress: {
    drop_console: true,
    drop_debugger: true,
    passes: 2,
    pure_getters: true,
    unsafe_arrows: true,
  },
  mangle: {
    toplevel: true,
  },
  format: {
    comments: false,
  },
};

export default [
  // Bundle Standalone IIFE para CDN
  {
    input: 'src/auto-init.ts',
    output: [
      {
        file: 'dist/v1/track.js',
        format: 'iife',
        name: 'SpecialistGTM',
        sourcemap: true,
        plugins: [terser(terserConfig)],
      },
      {
        file: 'dist/track.js',
        format: 'iife',
        name: 'SpecialistGTM',
        sourcemap: true,
        plugins: [terser(terserConfig)],
      },
      {
        file: 'dist/track.min.js',
        format: 'iife',
        name: 'SpecialistGTM',
        sourcemap: false,
        plugins: [terser(terserConfig)],
      },
    ],
    plugins: [
      resolve({ browser: true }),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
    ],
  },
  // ESM Library Bundle para Monorepo / Bundlers
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'es',
      sourcemap: true,
    },
    plugins: [
      resolve({ browser: true }),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: './dist',
        rootDir: './src',
      }),
    ],
  },
];