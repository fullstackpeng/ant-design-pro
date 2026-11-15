/**
 * @see https://umijs.org/docs/max/access#access
 * */
export default function access(
  initialState:
    | { currentUser?: API.CurrentUser & { isPlatformAdmin?: boolean } }
    | undefined,
) {
  const { currentUser } = initialState ?? {};
  return {
    canAdmin: currentUser && currentUser.access === 'admin',
    canPlatform: currentUser?.isPlatformAdmin === true,
    canManageMembers:
      currentUser?.isPlatformAdmin !== true && currentUser?.access === 'admin',
  };
}
