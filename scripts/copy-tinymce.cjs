const { cp, mkdir, rm } = require('node:fs/promises');
const { join } = require('node:path');

const source = join(__dirname, '..', 'node_modules', 'tinymce');
const target = join(__dirname, '..', 'public', 'tinymce');

async function main() {
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  await cp(join(source, 'tinymce.min.js'), join(target, 'tinymce.min.js'));
  for (const folder of ['icons', 'models', 'plugins', 'skins', 'themes']) {
    await cp(join(source, folder), join(target, folder), { recursive: true });
  }
  console.log('TinyMCE 7.8.0 assets copied to public/tinymce');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
