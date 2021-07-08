import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import pkg from './package.json';

export default [
	// Browser-friendly UMD build
	{
		input: 'src/main.js',
		output: {
			name: 'airtable-client',
			file: pkg.browser,
			format: 'umd',
		},
		plugins: [resolve(), commonjs(), terser()],
	},

	// CommonJS (for Node) and ES module (for bundlers) build
	{
		input: 'src/main.js',
		external: ['ms'],
		output: [
			{ file: pkg.main, format: 'cjs' },
			{ file: pkg.module, format: 'es' },
		],
		plugins: [terser()],
	},
];
