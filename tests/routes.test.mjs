import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { getConfigRoutes } from '@umijs/core/dist/route/routesConfig.js';
import {
  directoryPaths,
  registeredPages,
} from '../backend/src/auth/page-registry.ts';
import routes from '../config/routes.ts';

const rendererRequire = createRequire(
  import.meta.resolve('@umijs/renderer-react'),
);
const { matchRoutes } = rendererRequire('react-router-dom');

// Umi expands wrappers into parent routes; validate the resulting paths, not just config types.
const generated = Object.values(getConfigRoutes({ routes }));
function routeTree(parentId) {
  return generated
    .filter((route) => route.parentId === parentId)
    .map((route) => {
      const children = routeTree(route.id);
      return { ...route, ...(children.length ? { children } : {}) };
    });
}
const tree = routeTree(undefined);

test('tenant pages declare authorization and default access explicitly', () => {
  const permissions = registeredPages
    .map((page) => page.permissionCode)
    .filter(Boolean);
  assert.equal(new Set(permissions).size, permissions.length);
  for (const page of registeredPages) {
    if (page.scope === 'tenant') {
      assert(page.featureCode, `${page.path} must declare its feature`);
      assert(
        page.permissionCode || page.minRole === 'admin',
        `${page.path} must declare a permission or require an administrator`,
      );
    }
    if (page.defaultMemberAccess) {
      assert.equal(page.scope, 'tenant');
      assert(page.permissionCode);
      assert.equal(page.minRole, 'user');
    }
  }
});

test('the server page registry exactly covers protected front-end pages', () => {
  const paths = [];
  function collect(items, parentPath = '') {
    for (const route of items) {
      const path = (
        route.path.startsWith('/') ? route.path : `${parentPath}/${route.path}`
      ).replace(/\/$/, '');
      if (route.routes) collect(route.routes, path);
      else if (
        route.component &&
        !path.startsWith('/user/') &&
        !path.startsWith('/exception/') &&
        !path.includes('*')
      )
        paths.push(path);
    }
  }
  collect(routes);
  assert.deepEqual(
    new Set(registeredPages.map((page) => page.path)),
    new Set(paths),
  );
  assert.equal(
    new Set(registeredPages.map((page) => page.code)).size,
    registeredPages.length,
  );
  for (const path of [
    ...registeredPages.map((page) => page.path),
    ...directoryPaths,
  ])
    assert(matchRoutes(tree, path));
});

test('the generated route tree matches home, directories and nested pages without crashing', () => {
  for (const pathname of [
    '/',
    '/welcome',
    '/admin',
    '/admin/sub-page',
    '/platform',
    '/platform/navigation',
    '/dashboard',
    '/dashboard/analysis',
    '/form/basic-form',
    '/list',
    '/list/search',
    '/list/search/articles',
    '/account',
    '/account/settings',
    '/tenant/members',
    '/user/login',
    '/exception/403',
  ]) {
    assert(matchRoutes(tree, pathname), `No route for ${pathname}`);
  }
});

test('protected pages and directory redirects retain authorization wrappers', () => {
  for (const pathname of [
    '/welcome',
    '/admin',
    '/admin/sub-page',
    '/platform',
    '/platform/tenants',
    '/dashboard',
    '/dashboard/analysis',
    '/list/search',
    '/list/search/articles',
    '/tenant/members',
    '/account/settings',
  ]) {
    const matches = matchRoutes(tree, pathname);
    assert(
      matches?.some(
        (match) => match.route.file === '@/wrappers/AuthorizedPage',
      ),
      `Missing authorization for ${pathname}`,
    );
  }
  const login = matchRoutes(tree, '/user/login');
  assert(
    login &&
      !login.some((match) => match.route.file === '@/wrappers/AuthorizedPage'),
  );
});
