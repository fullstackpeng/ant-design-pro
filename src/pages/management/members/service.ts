import * as members from '@/services/backend/members';
import * as roles from '@/services/backend/roles';

export type Member = BackendAPI.MemberDto;
export const listMembers = (params: BackendAPI.listMembersParams) =>
  members.listMembers(params, { skipErrorHandler: true });
export const addMember = (body: BackendAPI.CreateMemberDto) =>
  members.addMember(body, { skipErrorHandler: true });
export const updateMember = (id: string, body: BackendAPI.UpdateMemberDto) =>
  members.updateMember({ id }, body, { skipErrorHandler: true });
export const removeMember = (id: string) =>
  members.removeMember({ id }, { skipErrorHandler: true });
export const subscriptionInfo = () =>
  members.subscriptionInfo({ skipErrorHandler: true });

export const listRoles = () => roles.listRoles({ skipErrorHandler: true });
