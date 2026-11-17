import { describe, expect, it } from 'vitest';
import access from './access';

describe('access', () => {
  it('allows member management from effective permissions instead of the legacy role', () => {
    expect(
      access({
        currentUser: { access: 'user', isPlatformAdmin: false },
        navigation: {
          menus: [],
          allowedPaths: ['/tenant/members'],
          permissions: ['members:read'],
        },
      }).canManageMembers,
    ).toBe(true);
    expect(
      access({
        currentUser: { access: 'admin' },
        navigation: { menus: [], allowedPaths: [], permissions: [] },
      }).canManageMembers,
    ).toBe(false);
    expect(
      access({
        currentUser: { isPlatformAdmin: true },
        navigation: {
          menus: [],
          allowedPaths: [],
          permissions: ['members:read'],
        },
      }).canManageMembers,
    ).toBe(false);
  });
  it('should return canAdmin true when user has admin access', () => {
    const initialState = {
      currentUser: {
        userid: '1',
        name: 'Admin User',
        avatar: 'https://example.com/avatar.png',
        access: 'admin',
      },
    };

    const result = access(initialState);

    expect(result.canAdmin).toBe(true);
  });

  it('should return canAdmin false when user has non-admin access', () => {
    const initialState = {
      currentUser: {
        userid: '2',
        name: 'Regular User',
        avatar: 'https://example.com/avatar.png',
        access: 'user',
      },
    };

    const result = access(initialState);

    expect(result.canAdmin).toBe(false);
  });

  it('should return canAdmin false when user access is undefined', () => {
    const initialState = {
      currentUser: {
        userid: '3',
        name: 'Guest User',
        avatar: 'https://example.com/avatar.png',
      },
    };

    const result = access(initialState);

    expect(result.canAdmin).toBe(false);
  });

  it('should return canAdmin false when currentUser is undefined', () => {
    const initialState = {
      currentUser: undefined,
    };

    const result = access(initialState);

    expect(result.canAdmin).toBeFalsy();
  });

  it('should return canAdmin false when initialState is undefined', () => {
    const result = access(undefined);

    expect(result.canAdmin).toBeFalsy();
  });
});
