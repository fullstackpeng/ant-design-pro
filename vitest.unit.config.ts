import { defineConfig } from 'vitest/config';

// Pure logic tests run without Playwright or a browser installation.
export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'src/access.test.ts',
      'src/services/siteSettings.test.ts',
      'src/services/navigation.test.tsx',
      'src/pages/management/navigation/tree.test.ts',
      'src/utils/sanitizeNotificationHtml.test.ts',
      'src/utils/department-tree.test.ts',
    ],
  },
});
