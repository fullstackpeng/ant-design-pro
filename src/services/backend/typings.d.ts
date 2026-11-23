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

  type cleanupMqttMessagesParams = {
    /** 仅清理该租户，省略表示全部 */
    tenantId?: string;
  };

  type CreateDepartmentDto = {
    code: string;
    name: string;
    sortOrder: number;
    isActive: boolean;
    parentId?: string | null;
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
    departmentId?: string | null;
    positionIds?: string[];
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

  type CreateNotificationDto = {
    type: "notice" | "announcement";
    title: string;
    /** TinyMCE 生成的 HTML，服务端会消毒 */
    contentHtml: string;
    isActive: boolean;
    publishAt?: string;
    expireAt?: string;
    /** 平台通知定向到租户 ID；公告忽略该字段 */
    targetTenantIds?: string[];
    /** 租户通知定向到成员用户 ID；公告忽略该字段 */
    targetUserIds?: string[];
  };

  type CreatePlanDto = {
    name: string;
    maxMembers: number;
    /** 租户存储空间上限（MB） */
    maxStorageMb: number;
    /** 单个文件大小上限（MB） */
    maxFileSizeMb: number;
    /** 是否允许新的人工分配，不影响已有订阅 */
    isActive: boolean;
    code: string;
  };

  type createPlatformDictionaryItemParams = {
    code: string;
  };

  type CreatePositionDto = {
    code: string;
    name: string;
    sortOrder: number;
    isActive: boolean;
  };

  type CreateRoleDto = {
    name: string;
    permissions: string[];
  };

  type CreateStorageProviderDto = {
    code: string;
    name: string;
    protocol: string;
    /** 协议定义的非敏感配置 */
    config: Record<string, any>;
    /** 协议定义的密钥字段，写入后加密保存 */
    secrets: Record<string, any>;
    isActive?: boolean;
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

  type CreateTenantMqttBrokerDto = {
    name: string;
    host: string;
    port: number;
    useTls: boolean;
    protocolVersion: "3.1.1" | "5";
    username?: string;
    password?: string;
    clientIdPrefix?: string;
    subscribeFilter?: string;
    keepaliveSeconds?: number;
    cleanStart?: boolean;
    sessionExpirySeconds?: number;
    defaultQos?: 0 | 1 | 2;
    isActive?: boolean;
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

  type deleteDepartmentParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type deleteFileParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type deleteMenuParams = {
    code: string;
  };

  type deletePlatformFileParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type deletePlatformMqttBrokerParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type deletePlatformNotificationParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type deletePositionParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type deleteRoleParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type deleteScheduledTaskParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type deleteTenantMqttBrokerParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type deleteTenantNotificationParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type DepartmentDto = {
    id: string;
    code: string;
    name: string;
    sortOrder: number;
    isActive: boolean;
    parentId: string | null;
  };

  type DepartmentListResponseDto = {
    success: true;
    data: DepartmentDto[];
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

  type downloadFileParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type downloadPlatformFileParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
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
    description: string;
    category: "base" | "samples";
    sortOrder: number;
    isDemo: boolean;
    defaultGranted: boolean;
  };

  type FeatureListResponseDto = {
    success: true;
    data: FeatureDto[];
  };

  type FileDownloadDto = {
    url: string;
    expiresInSeconds: number;
  };

  type FileDownloadResponseDto = {
    success: true;
    data: FileDownloadDto;
  };

  type FileDto = {
    id: string;
    originalName: string;
    mimeType: string;
    /** 字节数，以字符串传输 */
    size: string;
    providerName: string;
    /** 平台文件为 null */
    tenantCode?: string | null;
    tenantName?: string | null;
    uploadedByName: string;
    createdAt: string;
  };

  type FileListResponseDto = {
    success: true;
    data: FileDto[];
    total: number;
  };

  type FileQueryDto = {
    current?: number;
    pageSize?: number;
    /** 文件名，支持包含匹配 */
    keyword?: string;
  };

  type FileUsageDto = {
    usedBytes: string;
    quotaBytes: string;
    maxFileSizeBytes: string;
    planName?: string | null;
  };

  type FileUsageResponseDto = {
    success: true;
    data: FileUsageDto;
  };

  type getDictionaryParams = {
    code: string;
  };

  type getNotificationAssetParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type getPlatformDictionaryParams = {
    code: string;
  };

  type getPlatformNotificationParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type getSiteAssetParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type getTaskRunParams = {
    id: string;
  };

  type getTenantNotificationParams = {
    /** 64 位正整数 ID，以字符串传输 */
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

  type InboxQueryDto = {
    current?: number;
    pageSize?: number;
    type?: "notice" | "announcement";
    status?: "all" | "unread" | "read";
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

  type listFilesParams = {
    current?: number;
    pageSize?: number;
    /** 文件名，支持包含匹配 */
    keyword?: string;
  };

  type listInboxNotificationsParams = {
    current?: number;
    pageSize?: number;
    type?: "notice" | "announcement";
    status?: "all" | "unread" | "read";
  };

  type listLoginTenantsParams = {
    /** 租户名称或编码，支持包含匹配 */
    keyword?: string;
    limit?: number;
  };

  type listMembersParams = {
    current?: number;
    pageSize?: number;
    /** 部门 ID（包含下级），unassigned 表示未分配 */
    departmentId?: string;
    /** 岗位 ID，unassigned 表示未分配 */
    positionId?: string;
  };

  type listMqttMessagesParams = {
    current?: number;
    pageSize?: number;
    /** 租户 ID */
    tenantId?: string;
    /** Topic 包含匹配 */
    topic?: string;
    direction?: "inbound" | "outbound";
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

  type listPlatformFilesParams = {
    current?: number;
    pageSize?: number;
    /** 文件名，支持包含匹配 */
    keyword?: string;
    /** 租户编码或名称，支持包含匹配 */
    tenant?: string;
  };

  type listPlatformNotificationsParams = {
    current?: number;
    pageSize?: number;
    type?: "notice" | "announcement";
    keyword?: string;
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

  type listTenantNotificationsParams = {
    current?: number;
    pageSize?: number;
    type?: "notice" | "announcement";
    keyword?: string;
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

  type LoginTenantDto = {
    code: string;
    name: string;
  };

  type LoginTenantListResponseDto = {
    success: true;
    data: LoginTenantDto[];
  };

  type LoginTenantQueryDto = {
    /** 租户名称或编码，支持包含匹配 */
    keyword?: string;
    limit?: number;
  };

  type MemberDto = {
    department: DepartmentDto | null;
    positions: PositionDto[];
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

  type MemberOrganizationOptionsDto = {
    departments: DepartmentDto[];
    positions: PositionDto[];
  };

  type MemberOrganizationOptionsResponseDto = {
    success: true;
    data: MemberOrganizationOptionsDto;
  };

  type MemberQueryDto = {
    current?: number;
    pageSize?: number;
    /** 部门 ID（包含下级），unassigned 表示未分配 */
    departmentId?: string;
    /** 岗位 ID，unassigned 表示未分配 */
    positionId?: string;
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

  type MqttCleanupResponseDto = {
    success: true;
    data: MqttCleanupResultDto;
  };

  type MqttCleanupResultDto = {
    deleted: number;
  };

  type MqttCredentialMetadataDto = {
    tenantId: string;
    username: string;
    roleName: string;
    status: string;
    lastError: string;
    provisionedAt?: string;
    platform: MqttPlatformInfoDto;
    topicPrefix: string;
  };

  type MqttCredentialMetadataResponseDto = {
    success: true;
    data: MqttCredentialMetadataDto | null;
  };

  type MqttMessageDto = {
    id: string;
    tenantId: string;
    tenantCode: string;
    tenantName: string;
    brokerType: string;
    brokerId: string;
    topic: string;
    payload: string;
    payloadEncoding: string;
    qos: number;
    retain: boolean;
    direction: string;
    createdAt: string;
  };

  type MqttMessageListResponseDto = {
    success: true;
    data: MqttMessageDto[];
    total: number;
  };

  type MqttMessageQueryDto = {
    current?: number;
    pageSize?: number;
    /** 租户 ID */
    tenantId?: string;
    /** Topic 包含匹配 */
    topic?: string;
    direction?: "inbound" | "outbound";
  };

  type MqttPlatformBrokerDto = {
    id: number;
    name: string;
    host: string;
    port: number;
    useTls: boolean;
    defaultProtocol: "3.1.1" | "5";
    adminUsername: string;
    hasAdminPassword: boolean;
    bridgeUsername: string;
    hasBridgePassword: boolean;
    responseTopic: string;
    commandTimeoutMs: number;
    isEnabled: boolean;
    revision: number;
  };

  type MqttPlatformBrokerResponseDto = {
    success: true;
    data: MqttPlatformBrokerDto | null;
  };

  type MqttPlatformInfoDto = {
    host: string;
    port: number;
    useTls: boolean;
    protocols: string[];
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

  type NotificationAssetDto = {
    id: string;
    /** 可写入通知正文的稳定地址，需要登录会话访问 */
    url: string;
  };

  type NotificationAssetResponseDto = {
    success: true;
    data: NotificationAssetDto;
  };

  type NotificationDetailResponseDto = {
    success: true;
    data: NotificationDto;
  };

  type NotificationDto = {
    id: string;
    source: "platform" | "tenant";
    type: "notice" | "announcement";
    title: string;
    /** 已消毒的 HTML */
    contentHtml: string;
    isActive: boolean;
    publishAt?: string | null;
    expireAt?: string | null;
    readAt?: string | null;
    targetTenantIds: string[];
    targetUserIds: string[];
    creatorName: string;
    createdAt: string;
    updatedAt: string;
  };

  type NotificationListResponseDto = {
    success: true;
    data: NotificationDto[];
    total: number;
    /** 符合筛选条件的未读总数 */
    unreadTotal: number;
  };

  type NotificationQueryDto = {
    current?: number;
    pageSize?: number;
    type?: "notice" | "announcement";
    keyword?: string;
  };

  type PaginationQueryDto = {
    current?: number;
    pageSize?: number;
  };

  type PermissionDto = {
    code: string;
    name: string;
    description: string;
    featureCode: string;
    featureName: string;
    featureDescription: string;
    category: "base" | "samples";
    sortOrder: number;
    isDemo: boolean;
    kind: "page" | "action";
    group: "read" | "create" | "update" | "delete" | "manage";
    risk: "normal" | "destructive";
    defaultMemberAccess: boolean;
    requires: string[];
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
    /** 存储空间上限（MB） */
    maxStorageMb: number;
    /** 单文件大小上限（MB） */
    maxFileSizeMb: number;
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

  type PlatformFileQueryDto = {
    current?: number;
    pageSize?: number;
    /** 文件名，支持包含匹配 */
    keyword?: string;
    /** 租户编码或名称，支持包含匹配 */
    tenant?: string;
  };

  type PlatformTenantMqttListResponseDto = {
    success: true;
    data: PlatformTenantMqttRowDto[];
  };

  type PlatformTenantMqttRowDto = {
    tenantId: string;
    tenantCode: string;
    tenantName: string;
    status: string;
    username: string;
    lastError: string;
    provisionedAt?: string;
  };

  type PlatformTenantParamDto = {
    /** 租户 ID，64 位正整数字符串 */
    tenantId: string;
  };

  type PlatformUserDto = {
    id: string;
    username: string;
    name: string;
    isActive: boolean;
    isPlatformAdmin: boolean;
    memberships: UserMembershipDto[];
  };

  type PositionDto = {
    id: string;
    code: string;
    name: string;
    sortOrder: number;
    isActive: boolean;
  };

  type PositionListResponseDto = {
    success: true;
    data: PositionDto[];
  };

  type provisionMqttTenantCredentialParams = {
    /** 租户 ID，64 位正整数字符串 */
    tenantId: string;
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

  type readNotificationParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
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

  type RevealedMqttCredentialDto = {
    username: string;
    password: string;
    host: string;
    port: number;
    useTls: boolean;
    protocols: string[];
    topicPrefix: string;
  };

  type RevealedMqttCredentialResponseDto = {
    success: true;
    data: RevealedMqttCredentialDto;
  };

  type revealMqttTenantCredentialParams = {
    /** 租户 ID，64 位正整数字符串 */
    tenantId: string;
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

  type rotateMqttTenantCredentialParams = {
    /** 租户 ID，64 位正整数字符串 */
    tenantId: string;
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

  type setDefaultPlatformMqttBrokerParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type setDefaultStorageProviderParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type setDefaultTenantMqttBrokerParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type setScheduledTaskEnabledParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type SiteAssetDto = {
    id: string;
    /** 可写入系统配置的稳定公开地址 */
    url: string;
  };

  type SiteAssetResponseDto = {
    success: true;
    data: SiteAssetDto;
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

  type StorageFieldDto = {
    key: string;
    label: string;
    type: "text" | "password" | "boolean" | "number" | "select";
    required?: boolean;
    placeholder?: string;
    default?: string | number | boolean;
    options?: { label?: string; value?: string }[];
  };

  type StorageProtocolDto = {
    protocol: string;
    label: string;
    configFields: StorageFieldDto[];
    secretFields: StorageFieldDto[];
  };

  type StorageProtocolListResponseDto = {
    success: true;
    data: StorageProtocolDto[];
  };

  type StorageProviderDto = {
    id: string;
    code: string;
    name: string;
    protocol: string;
    config: Record<string, any>;
    /** 已配置的密钥字段名，不包含密钥值 */
    secretKeys: string[];
    isDefault: boolean;
    isActive: boolean;
    revision: number;
  };

  type StorageProviderListResponseDto = {
    success: true;
    data: StorageProviderDto[];
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

  type TenantMqttBrokerDto = {
    id: string;
    tenantId: string;
    tenantCode?: string;
    tenantName?: string;
    name: string;
    host: string;
    port: number;
    useTls: boolean;
    protocolVersion: "3.1.1" | "5";
    username: string;
    hasPassword: boolean;
    clientIdPrefix: string;
    subscribeFilter: string;
    keepaliveSeconds: number;
    cleanStart: boolean;
    sessionExpirySeconds: number;
    defaultQos: number;
    isDefault: boolean;
    isActive: boolean;
    revision: number;
  };

  type TenantMqttBrokerListResponseDto = {
    success: true;
    data: TenantMqttBrokerDto[];
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

  type testPlatformMqttBrokerParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type testStorageProviderParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type testTenantMqttBrokerParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type triggerScheduledTaskParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type UpdateDepartmentDto = {
    code: string;
    name: string;
    sortOrder: number;
    isActive: boolean;
    parentId?: string | null;
  };

  type updateDepartmentParams = {
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
    departmentId?: string | null;
    positionIds?: string[];
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

  type UpdateMqttPlatformBrokerDto = {
    name: string;
    host: string;
    port: number;
    useTls: boolean;
    defaultProtocol: "3.1.1" | "5";
    adminUsername: string;
    /** 留空表示保持现有管理密码 */
    adminPassword?: string;
    bridgeUsername: string;
    /** 留空表示保持现有 Bridge 密码 */
    bridgePassword?: string;
    responseTopic: string;
    commandTimeoutMs: number;
    isEnabled: boolean;
    /** 首次创建时传 0 */
    revision: number;
  };

  type UpdatePlanDto = {
    name: string;
    maxMembers: number;
    /** 租户存储空间上限（MB） */
    maxStorageMb: number;
    /** 单个文件大小上限（MB） */
    maxFileSizeMb: number;
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

  type updatePlatformMqttBrokerParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type updatePlatformNotificationParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type UpdatePositionDto = {
    code: string;
    name: string;
    sortOrder: number;
    isActive: boolean;
  };

  type updatePositionParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
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

  type UpdateStorageProviderDto = {
    name: string;
    config: Record<string, any>;
    /** 省略或留空表示保持现有密钥 */
    secrets?: Record<string, any>;
    isActive: boolean;
    revision: number;
  };

  type updateStorageProviderParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
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

  type UpdateTenantMqttBrokerDto = {
    name: string;
    host: string;
    port: number;
    useTls: boolean;
    protocolVersion: "3.1.1" | "5";
    username?: string;
    password?: string;
    clientIdPrefix?: string;
    subscribeFilter?: string;
    keepaliveSeconds?: number;
    cleanStart?: boolean;
    sessionExpirySeconds?: number;
    defaultQos?: 0 | 1 | 2;
    isActive?: boolean;
    /** 读取到的版本号 */
    revision: number;
  };

  type updateTenantMqttBrokerParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
  };

  type updateTenantNotificationParams = {
    /** 64 位正整数 ID，以字符串传输 */
    id: string;
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

  type VerifyMqttCredentialDto = {
    /** 当前登录用户密码，用于二次校验 */
    password: string;
  };
}
