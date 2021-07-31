import commonjs from "@rollup/plugin-commonjs";
import resolve from '@rollup/plugin-node-resolve';
import typescript from "@rollup/plugin-typescript";
import json from '@rollup/plugin-json';
import polyfills from 'rollup-plugin-polyfill-node';

import pkg from './package.json'

export default [
  {
    input: 'lib/index.ts',
    output: {
      name: 'mdrpy',
      file: pkg.browser,
      format: 'umd'
    },
    plugins: [
      polyfills(),
      resolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json'
      }),
      json()
    ],
  },
  {
    input: 'lib/index.ts',
    output: [
      { file: pkg.main, format: 'cjs'},
      { file: pkg.module, format: 'es'}
    ],
    plugins: [
      polyfills(),
      typescript({
        tsconfig: './tsconfig.json'
      }),
      json()
    ],
    external: [
      'cyrillic-to-translit-js',
      'markdown-it'
    ],
  }
]
