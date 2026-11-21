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

  type AssignFeaturesDto = {
    featureCodes: string[];
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

  type assignTenantFeaturesParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type CreateDictionaryDto = {
    name: string;
    remark: string;
    isActive: boolean;
    code: string;
  };

  type CreateDictionaryItemDto = {
    label: string;
    sortOrder: number;
    isActive: boolean;
    color: "" | "blue" | "green" | "orange" | "red" | "purple" | "cyan";
    value: string;
  };

  type createDictionaryItemParams = {
    code: string;
  };

  type CreateMemberDto = {
    /** 新建账号或添加已有账号；已有账号的密码不会被修改 */
    mode: "new" | "existing";
    username: string;
    /** mode=new 时必填 */
    name?: string;
    /** mode=new 时必填；仅用于初始化新账号 */
    password?: string;
    roleIds?: string[];
    role: "admin" | "user";
  };

  type CreateMenuDto = {
    /** 语言包翻译键；留空显示菜单名称 */
    i18nKey?: string;
    /** 父目录编码；null 表示根目录，省略表示保持原层级 */
    parentCode?: string | null;
    name: string;
    /** 前端图标白名单编码；留空不显示图标 */
    icon: string;
    sortOrder: number;
    /** 关闭后隐藏菜单入口；页面和接口仍按模块与角色授权 */
    isActive: boolean;
    kind: "directory" | "page";
    /** 新增目录时必填，页面所属端从注册表确定 */
    scope?: "tenant" | "platform";
    /** 新增页面菜单时必填，只能选择已注册页面 */
    pageCode?: string;
  };

  type CreatePlanDto = {
    name: string;
    maxMembers: number;
    /** 是否允许新的人工分配，不影响已有订阅 */
    isActive: boolean;
    code: string;
  };

  type createPlatformDictionaryItemParams = {
    code: string;
  };

  type CreateRoleDto = {
    name: string;
    permissions: string[];
  };

  type CreateTaskDto = {
    name: string;
    type: "internal";
    handler: string;
    cron: string;
    timezone: string;
    scope: "global" | "selected" | "all";
    tenantIds: string[];
    params: Record<string, any>;
    enabled: boolean;
    timeoutMs: number;
    maxAttempts: number;
    concurrency: number;
  };

  type CreateTenantDto = {
    name: string;
    /** 平台 industry 字典值，空字符串表示未填写；省略则保留现值 */
    industry?: string;
    /** 创建后不可修改；不能使用保留编码 platform */
    code: string;
    /** 首位租户管理员 */
    admin: AccountDto;
  };

  type CreateUserDto = {
    username: string;
    name: string;
    password: string;
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

  type deleteMenuParams = {
    code: string;
  };

  type deleteRoleParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type deleteScheduledTaskParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type DictionaryAuditDto = {
    id: string;
    actorId: string;
    actorName: string;
    entityType: "type" | "item";
    targetValue: string;
    action: "create" | "update";
    before: Record<string, any>;
    after: Record<string, any>;
    createdAt: string;
  };

  type DictionaryAuditListResponseDto = {
    success: true;
    data: DictionaryAuditDto[];
    total: number;
  };

  type DictionaryCodeParamDto = {
    code: string;
  };

  type DictionaryDetailDto = {
    code: string;
    name: string;
    remark: string;
    isActive: boolean;
    items: DictionaryItemDto[];
  };

  type DictionaryDetailResponseDto = {
    success: true;
    data: DictionaryDetailDto;
  };

  type DictionaryDto = {
    code: string;
    name: string;
    remark: string;
    isActive: boolean;
  };

  type DictionaryItemDto = {
    id: string;
    value: string;
    label: string;
    sortOrder: number;
    isActive: boolean;
    color: string;
  };

  type DictionaryItemParamDto = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
    code: string;
  };

  type DictionaryListResponseDto = {
    success: true;
    data: DictionaryDto[];
    total: number;
  };

  type DictionaryQueryDto = {
    current?: number;
    pageSize?: number;
    keyword?: string;
  };

  type DispatchResponseDto = {
    success: true;
    data: string;
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

  type FeatureDto = {
    code: string;
    name: string;
  };

  type FeatureListResponseDto = {
    success: true;
    data: FeatureDto[];
  };

  type getDictionaryParams = {
    code: string;
  };

  type getPlatformDictionaryParams = {
    code: string;
  };

  type getTaskRunParams = {
    id: string;
  };

  type HandlerListResponseDto = {
    success: true;
    data: TaskHandlerDto[];
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

  type listDictionariesParams = {
    current?: number;
    pageSize?: number;
    keyword?: string;
  };

  type listDictionaryHistoryParams = {
    code: string;
    current?: number;
    pageSize?: number;
  };

  type listMembersParams = {
    current?: number;
    pageSize?: number;
  };

  type listPlansParams = {
    current?: number;
    pageSize?: number;
  };

  type listPlatformDictionariesParams = {
    current?: number;
    pageSize?: number;
    keyword?: string;
  };

  type listPlatformDictionaryHistoryParams = {
    code: string;
    current?: number;
    pageSize?: number;
  };

  type listScheduledTasksParams = {
    current?: number;
    pageSize?: number;
    name?: string;
    type?: "internal";
  };

  type listSiteSettingsHistoryParams = {
    current?: number;
    pageSize?: number;
  };

  type listTaskRunsParams = {
    current?: number;
    pageSize?: number;
    name?: string;
    type?: "internal";
    status?:
      | "queued"
      | "running"
      | "retrying"
      | "succeeded"
      | "failed"
      | "timed_out"
      | "skipped";
    taskId?: string;
  };

  type listTenantsParams = {
    current?: number;
    pageSize?: number;
    /** 企业名称，支持包含匹配 */
    name?: string;
  };

  type listUsersParams = {
    current?: number;
    pageSize?: number;
    keyword?: string;
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
    roles: RoleDto[];
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

  type MenuCodeParamDto = {
    code: string;
  };

  type MenuDto = {
    code: string;
    kind: "directory" | "page";
    isSystem: boolean;
    parentCode: string | null;
    path: string | null;
    name: string;
    i18nKey: string | null;
    icon: string;
    sortOrder: number;
    scope: "authenticated" | "platform" | "tenant";
    minRole: "admin" | "user";
    isActive: boolean;
    featureCode: string | null;
  };

  type MenuListResponseDto = {
    success: true;
    data: MenuDto[];
  };

  type NavigationDto = {
    menus: MenuDto[];
    allowedPaths: string[];
    permissions: string[];
  };

  type NavigationResponseDto = {
    success: true;
    data: NavigationDto;
  };

  type PaginationQueryDto = {
    current?: number;
    pageSize?: number;
  };

  type PermissionDto = {
    code: string;
    name: string;
    featureCode: string;
  };

  type PermissionListResponseDto = {
    success: true;
    data: PermissionDto[];
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

  type PlatformDictionaryDetailDto = {
    code: string;
    name: string;
    remark: string;
    isActive: boolean;
    revision: number;
    items: PlatformDictionaryItemDto[];
  };

  type PlatformDictionaryDetailResponseDto = {
    success: true;
    data: PlatformDictionaryDetailDto;
  };

  type PlatformDictionaryDto = {
    code: string;
    name: string;
    remark: string;
    isActive: boolean;
    revision: number;
  };

  type PlatformDictionaryItemDto = {
    id: string;
    value: string;
    label: string;
    sortOrder: number;
    isActive: boolean;
    color: string;
    revision: number;
  };

  type PlatformDictionaryListResponseDto = {
    success: true;
    data: PlatformDictionaryDto[];
    total: number;
  };

  type PlatformUserDto = {
    id: string;
    username: string;
    name: string;
    isActive: boolean;
    isPlatformAdmin: boolean;
    memberships: UserMembershipDto[];
  };

  type PublicSiteSettingsDto = {
    title: string;
    logo: string;
    loginBackground: string;
    footerText: string;
    colorPrimary: string;
    defaultLocale:
      | "zh-CN"
      | "zh-TW"
      | "en-US"
      | "pt-BR"
      | "fa-IR"
      | "id-ID"
      | "ja-JP"
      | "bn-BD";
  };

  type PublicSiteSettingsResponseDto = {
    success: true;
    data: PublicSiteSettingsDto;
  };

  type RegisteredPageDto = {
    code: string;
    name: string;
    path: string;
    scope: "authenticated" | "platform" | "tenant";
    featureCode: string | null;
    minRole: "admin" | "user";
  };

  type RegisteredPageListResponseDto = {
    success: true;
    data: RegisteredPageDto[];
  };

  type removeMemberParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type rerunTaskParams = {
    id: string;
  };

  type ResetPasswordDto = {
    password: string;
  };

  type resetUserPasswordParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type RevisionDto = {
    revision: number;
  };

  type RoleDto = {
    name: string;
    permissions: string[];
    id: string;
  };

  type RoleListResponseDto = {
    success: true;
    data: RoleDto[];
  };

  type RunIdDto = {
    id: string;
  };

  type RunListResponseDto = {
    success: true;
    data: TaskRunDto[];
    total: number;
  };

  type RunQueryDto = {
    current?: number;
    pageSize?: number;
    name?: string;
    type?: "internal";
    status?:
      | "queued"
      | "running"
      | "retrying"
      | "succeeded"
      | "failed"
      | "timed_out"
      | "skipped";
    taskId?: string;
  };

  type RunResponseDto = {
    success: true;
    data: TaskRunDto;
  };

  type ScheduledTaskDto = {
    id: string;
    name: string;
    type: "internal";
    handler: string;
    cron: string;
    timezone: string;
    scope: "global" | "selected" | "all";
    tenantIds: string[];
    params: Record<string, any>;
    enabled: boolean;
    timeoutMs: number;
    maxAttempts: number;
    concurrency: number;
    revision: number;
    syncedRevision: number;
    syncError: string;
    createdAt: string;
    updatedAt: string;
  };

  type setScheduledTaskEnabledParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type SiteSettingsAuditDto = {
    id: string;
    actorId: string;
    actorName: string;
    before: SiteSettingsDto;
    after: SiteSettingsDto;
    createdAt: string;
  };

  type SiteSettingsAuditListResponseDto = {
    success: true;
    data: SiteSettingsAuditDto[];
    total: number;
  };

  type SiteSettingsDto = {
    title: string;
    logo: string;
    loginBackground: string;
    footerText: string;
    colorPrimary: string;
    defaultLocale:
      | "zh-CN"
      | "zh-TW"
      | "en-US"
      | "pt-BR"
      | "fa-IR"
      | "id-ID"
      | "ja-JP"
      | "bn-BD";
    revision: number;
  };

  type SiteSettingsResponseDto = {
    success: true;
    data: SiteSettingsDto;
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

  type TaskAttemptDto = {
    id: string;
    number: number;
    status: string;
    startedAt: string;
    finishedAt: string | null;
    durationMs: number | null;
    error: string;
  };

  type TaskEnabledDto = {
    revision: number;
    enabled: boolean;
  };

  type TaskHandlerDto = {
    code: string;
    name: string;
    scopes: string[];
    feature: string | null;
  };

  type TaskListResponseDto = {
    success: true;
    data: ScheduledTaskDto[];
    total: number;
  };

  type TaskQueryDto = {
    current?: number;
    pageSize?: number;
    name?: string;
    type?: "internal";
  };

  type TaskResponseDto = {
    success: true;
    data: ScheduledTaskDto;
  };

  type TaskRunDto = {
    id: string;
    taskId: string;
    taskName: string;
    type: string;
    source: string;
    tenantId: string | null;
    retryOf: string | null;
    status:
      | "queued"
      | "running"
      | "retrying"
      | "succeeded"
      | "failed"
      | "timed_out"
      | "skipped";
    attemptsMade: number;
    createdAt: string;
    startedAt: string | null;
    finishedAt: string | null;
    durationMs: number | null;
    error: string;
    result: Record<string, any> | null;
    snapshot: Record<string, any>;
    idempotencyKey: string;
    attempts: TaskAttemptDto[];
  };

  type TenantDto = {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
    /** 平台 industry 字典值，空字符串表示未填写 */
    industry: string;
  };

  type tenantFeaturesParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type TenantFeaturesResponseDto = {
    success: true;
    data: string[];
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
    /** 平台 industry 字典值，空字符串表示未填写 */
    industry: string;
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

  type triggerScheduledTaskParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type UpdateDictionaryDto = {
    name: string;
    remark: string;
    isActive: boolean;
  };

  type UpdateDictionaryItemDto = {
    label: string;
    sortOrder: number;
    isActive: boolean;
    color: "" | "blue" | "green" | "orange" | "red" | "purple" | "cyan";
  };

  type updateDictionaryItemParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
    code: string;
  };

  type updateDictionaryParams = {
    code: string;
  };

  type UpdateMemberDto = {
    roleIds?: string[];
    role: "admin" | "user";
    isActive: boolean;
  };

  type updateMemberParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type UpdateMenuDto = {
    /** 语言包翻译键；留空显示菜单名称 */
    i18nKey?: string;
    /** 父目录编码；null 表示根目录，省略表示保持原层级 */
    parentCode?: string | null;
    name: string;
    /** 前端图标白名单编码；留空不显示图标 */
    icon: string;
    sortOrder: number;
    /** 关闭后隐藏菜单入口；页面和接口仍按模块与角色授权 */
    isActive: boolean;
  };

  type updateMenuParams = {
    code: string;
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

  type UpdatePlatformDictionaryDto = {
    name: string;
    remark: string;
    isActive: boolean;
    revision: number;
  };

  type UpdatePlatformDictionaryItemDto = {
    label: string;
    sortOrder: number;
    isActive: boolean;
    color: "" | "blue" | "green" | "orange" | "red" | "purple" | "cyan";
    revision: number;
  };

  type updatePlatformDictionaryItemParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
    code: string;
  };

  type updatePlatformDictionaryParams = {
    code: string;
  };

  type UpdateRoleDto = {
    name: string;
    permissions: string[];
  };

  type updateRoleParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type updateScheduledTaskParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type UpdateSiteSettingsDto = {
    title: string;
    logo: string;
    loginBackground: string;
    footerText: string;
    colorPrimary: string;
    defaultLocale:
      | "zh-CN"
      | "zh-TW"
      | "en-US"
      | "pt-BR"
      | "fa-IR"
      | "id-ID"
      | "ja-JP"
      | "bn-BD";
    /** 读取时的版本，避免覆盖其他管理员的修改 */
    revision: number;
  };

  type UpdateTaskDto = {
    name: string;
    type: "internal";
    handler: string;
    cron: string;
    timezone: string;
    scope: "global" | "selected" | "all";
    tenantIds: string[];
    params: Record<string, any>;
    enabled: boolean;
    timeoutMs: number;
    maxAttempts: number;
    concurrency: number;
    revision: number;
  };

  type UpdateTenantDto = {
    name: string;
    /** 平台 industry 字典值，空字符串表示未填写；省略则保留现值 */
    industry?: string;
    isActive: boolean;
  };

  type updateTenantParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type UpdateUserDto = {
    name: string;
    isActive: boolean;
  };

  type updateUserParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type UserListResponseDto = {
    success: true;
    data: PlatformUserDto[];
    total: number;
  };

  type UserMembershipDto = {
    tenantId: string;
    tenantName: string;
    role: string;
    isActive: boolean;
  };

  type UserQueryDto = {
    current?: number;
    pageSize?: number;
    keyword?: string;
  };
}
