import { readdir, readFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

async function checkDirectory(directory) {
  for (const entry of await readdir(resolve(root, directory), {
    withFileTypes: true,
  })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name !== 'generated') await checkDirectory(path);
      continue;
    }
    if (!/\.tsx?$/.test(path) || /\.(test|spec)\./.test(path)) continue;
    const content = await readFile(resolve(root, path), 'utf8');
    const report = (position, message) => {
      const line = content.slice(0, position).split('\n').length;
      errors.push(`${path}:${line} ${message}`);
    };
    const checkImport = (position, specifier) => {
      const target = specifier.startsWith('.')
        ? relative(root, resolve(root, dirname(path), specifier)).replaceAll(
            '\\',
            '/',
          )
        : specifier.startsWith('@/')
          ? `src/${specifier.slice(2)}`
          : specifier;
      if (
        path.startsWith('src/pages/management/') &&
        entry.name !== 'service.ts' &&
        target.startsWith('src/services/backend/')
      )
        report(
          position,
          'Use the page-local service.ts instead of importing a generated client.',
        );
      if (
        path.startsWith('backend/src/auth/') &&
        /^backend\/src\/(navigation|tenants|platform)\//.test(target)
      )
        report(
          position,
          'Authentication and authorization must not depend on business modules.',
        );
      if (
        path.startsWith('backend/src/navigation/') &&
        /^backend\/src\/tenants\/roles[./]/.test(target)
      )
        report(
          position,
          'Tenant role management belongs to the tenants module.',
        );
      if (
        path.endsWith('-response.dto.ts') &&
        target.endsWith('-request.dto.js')
      )
        report(
          position,
          'Response DTOs must not import request validation classes.',
        );
    };
    // Check literal import/export specifiers; runtime module resolution remains the compiler's job.
    const specifiers =
      /(?:^|\n)\s*(?:import|export)\s+(?:[^;]*?\sfrom\s*)?['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]/g;
    for (const match of content.matchAll(specifiers))
      checkImport(match.index, match[1] ?? match[2]);
  }
}

await checkDirectory('src/pages/management');
await checkDirectory('backend/src');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Architecture boundaries passed.');
}
