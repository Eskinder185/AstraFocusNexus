/*
  @license
	Rollup.js v4.51.0
	Fri, 19 Sep 2025 08:58:25 GMT - commit 1748736f5baae39b9560399606bba137747df048

	https://github.com/rollup/rollup

	Released under the MIT License.
*/
export { version as VERSION, defineConfig, rollup, watch } from './shared/node-entry.js';
import './shared/parseAst.js';
import '../native.js';
import 'node:path';
import 'path';
import 'node:process';
import 'node:perf_hooks';
import 'node:fs/promises';
