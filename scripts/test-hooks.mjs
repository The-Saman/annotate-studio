import { existsSync } from 'node:fs';
import { register } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function resolve(specifier, context, next) {
  let target = specifier;
  if (target.startsWith('@/')) target = pathToFileURL(path.join(root, 'src', target.slice(2))).href;
  const relative = target.startsWith('.') || target.startsWith('file:');
  if (relative && context.parentURL && !/\.(c|m)?(j|t)sx?$|\.json$|\.css$/.test(target)) {
    const base = target.startsWith('file:') ? fileURLToPath(target) : path.resolve(path.dirname(fileURLToPath(context.parentURL)), target);
    for (const suffix of ['.ts', '.tsx', '/index.ts']) {
      if (existsSync(base + suffix)) return next(pathToFileURL(base + suffix).href, context);
    }
  }
  return next(target, context);
}

if (!process.env.ANNOTATE_TEST_HOOKS) {
  process.env.ANNOTATE_TEST_HOOKS = '1';
  register(import.meta.url);
}
