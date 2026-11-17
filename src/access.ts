/**
 * @see https://umijs.org/docs/max/access#access
 * */
export default function access(
  initialState:
    | {
        currentUser?: API.CurrentUser & { isPlatformAdmin?: boolean };
        navigation?: BackendAPI.NavigationDto;
      }
    | undefined,
) {
  const { currentUser } = initialState ?? {};
  return {
    canAdmin: currentUser && currentUser.access === 'admin',
    canPlatform: currentUser?.isPlatformAdmin === true,
    canManageMembers:
      currentUser?.isPlatformAdmin !== true &&
      initialState?.navigation?.permissions.includes('members:read') === true,
  };
}
