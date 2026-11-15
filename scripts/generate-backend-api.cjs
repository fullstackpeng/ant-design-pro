const { join } = require('node:path');
const { createRequire } = require('node:module');
const pluginRequire = createRequire(require.resolve('@umijs/max-plugin-openapi'));
const { generateService } = pluginRequire('@umijs/openapi');

const root = join(__dirname, '..');

generateService({
  schemaPath: join(root, 'config/backend.openapi.json'),
  serversPath: join(root, 'src/services'),
  projectName: 'backend',
  namespace: 'BackendAPI',
  requestLibPath: "import { request, type RequestOptions } from '@umijs/max'",
  requestOptionsType: 'RequestOptions',
  hook: {
    // Preserve OpenAPI nullability; the generator's default does not include it.
    customType(schema, namespace, defaultType) {
      if (schema?.enum?.length === 1 && schema.enum[0] === null) return 'null';
      const type = defaultType(schema, namespace);
      return schema?.nullable ? `${type} | null` : type;
    },
  },
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
