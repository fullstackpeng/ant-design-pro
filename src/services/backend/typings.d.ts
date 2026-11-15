declare namespace BackendAPI {
  type AccountDto = {
    /** 新建账号或添加已有账号；已有账号的密码不会被修改 */
    mode: "new" | "existing";
    username: string;
    /** mode=new 时必填 */
    name?: string;
    /** mode=new 时必填；仅用于初始化新账号 */
    password?: string;
  };

  type AssignPlanDto = {
    /** 套餐 ID，64 位正整数字符串 */
    planId: string;
    /** ISO 8601 格式，必须晚于当前时间 */
    expiresAt: string;
    /** 订阅是否启用 */
    isActive: boolean;
  };

  type assignPlanParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type CreateMemberDto = {
    /** 新建账号或添加已有账号；已有账号的密码不会被修改 */
    mode: "new" | "existing";
    username: string;
    /** mode=new 时必填 */
    name?: string;
    /** mode=new 时必填；仅用于初始化新账号 */
    password?: string;
    role: "admin" | "user";
  };

  type CreatePlanDto = {
    name: string;
    maxMembers: number;
    /** 是否允许新的人工分配，不影响已有订阅 */
    isActive: boolean;
    code: string;
  };

  type CreateTenantDto = {
    name: string;
    /** 创建后不可修改；不能使用保留编码 platform */
    code: string;
    /** 首位租户管理员 */
    admin: AccountDto;
  };

  type CurrentTenantDto = {
    id: string;
    code: string;
    name: string;
    role: "admin" | "user";
  };

  type CurrentTenantResponseDto = {
    success: true;
    data: CurrentTenantDto;
  };

  type CurrentUserDto = {
    userid: string;
    name: string;
    avatar?: string;
    access: "admin" | "user";
    isPlatformAdmin: boolean;
    /** 平台会话为 null */
    tenant: TenantIdentityDto | null;
  };

  type CurrentUserResponseDto = {
    success: true;
    data: CurrentUserDto;
  };

  type EmptyResponseDto = {
    success: true;
    data: null;
  };

  type ErrorResponseDto = {
    success: false;
    errorMessage: string;
    /** 请求参数校验失败详情 */
    errors?: string[];
    errorCode?: number;
  };

  type HelloDto = {
    message: string;
  };

  type HelloResponseDto = {
    success: true;
    data: HelloDto;
  };

  type IdParamDto = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type listMembersParams = {
    current?: number;
    pageSize?: number;
  };

  type listPlansParams = {
    current?: number;
    pageSize?: number;
  };

  type listTenantsParams = {
    current?: number;
    pageSize?: number;
    /** 企业名称，支持包含匹配 */
    name?: string;
  };

  type LoginDto = {
    /** 租户编码；平台管理员填写 platform */
    tenantCode: string;
    username: string;
    password: string;
    /** 勾选后保存 7 天，否则使用浏览器会话 Cookie */
    autoLogin?: boolean;
    type?: "account";
  };

  type MemberDto = {
    userId: string;
    role: "admin" | "user";
    isActive: boolean;
    user: MemberUserDto;
  };

  type MemberListResponseDto = {
    success: true;
    data: MemberDto[];
    total: number;
  };

  type MembershipCountDto = {
    memberships: number;
  };

  type MemberUserDto = {
    username: string;
    name: string;
  };

  type PaginationQueryDto = {
    current?: number;
    pageSize?: number;
  };

  type PlanDto = {
    id: string;
    code: string;
    name: string;
    maxMembers: number;
    isActive: boolean;
  };

  type PlanListResponseDto = {
    success: true;
    data: PlanDto[];
    total: number;
  };

  type PlanResponseDto = {
    success: true;
    data: PlanDto;
  };

  type removeMemberParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type SubscriptionDto = {
    tenantId: string;
    planId: string;
    startsAt: string;
    expiresAt: string;
    isActive: boolean;
  };

  type SubscriptionResponseDto = {
    success: true;
    data: SubscriptionDto;
  };

  type SubscriptionUsageDto = {
    subscription: SubscriptionWithPlanDto | null;
    used: number;
  };

  type SubscriptionUsageResponseDto = {
    success: true;
    data: SubscriptionUsageDto;
  };

  type SubscriptionWithPlanDto = {
    tenantId: string;
    planId: string;
    startsAt: string;
    expiresAt: string;
    isActive: boolean;
    plan: PlanDto;
  };

  type TenantDto = {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  };

  type TenantIdentityDto = {
    id: string;
    code: string;
    name: string;
  };

  type TenantListItemDto = {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
    subscription: SubscriptionWithPlanDto | null;
    _count: MembershipCountDto;
  };

  type TenantListResponseDto = {
    success: true;
    data: TenantListItemDto[];
    total: number;
  };

  type TenantQueryDto = {
    current?: number;
    pageSize?: number;
    /** 企业名称，支持包含匹配 */
    name?: string;
  };

  type TenantResponseDto = {
    success: true;
    data: TenantDto;
  };

  type UpdateMemberDto = {
    role: "admin" | "user";
    isActive: boolean;
  };

  type updateMemberParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type UpdatePlanDto = {
    name: string;
    maxMembers: number;
    /** 是否允许新的人工分配，不影响已有订阅 */
    isActive: boolean;
  };

  type updatePlanParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type UpdateTenantDto = {
    name: string;
    isActive: boolean;
  };

  type updateTenantParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };
}
